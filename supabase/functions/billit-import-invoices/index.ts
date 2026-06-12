import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import {
  BillitOrder,
  normalizeBillitBaseUrl,
  getBillitAccount,
  fetchAllBillitOrders,
  getBillitOrderDetail,
  isSaleInvoice,
  billitOrderDateInRange,
  billitPdfUrl,
} from "../_shared/billit.ts";
import { loadLeazrMatchData, matchBillitInvoices, loadLeazrEnrichment, buildBillitBillingData, parseBillitReference } from "../_shared/billitMatch.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BillitCredentials {
  apiKey: string;
  baseUrl: string;
  companyId: string;
}

interface ImportRequest {
  companyId: string;
  fromDate?: string; // YYYY-MM-DD — ne traiter que les factures à partir de cette date
  toDate?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: {
        endpoint: "billit-import-invoices",
        maxRequests: 8,
        windowSeconds: 60,
        identifierPrefix: "billit-import-invoices",
      },
    });

    if (!access.ok) {
      return access.response;
    }

    let payload: ImportRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON body" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const { companyId } = payload;
    const fromDate = payload.fromDate || null;
    const toDate = payload.toDate || null;
    console.log("📥 Début import factures Billit - companyId:", companyId, "fromDate:", fromDate);

    if (!companyId) {
      return new Response(JSON.stringify({ success: false, error: "companyId is required" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== companyId
    ) {
      return new Response(JSON.stringify({ success: false, error: "Cross-company access forbidden" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      });
    }

    const supabase = access.context.supabaseAdmin;

    // Récupérer les identifiants Billit
    const { data: integration, error: integrationError } = await supabase
      .from('company_integrations')
      .select('api_credentials, is_enabled')
      .eq('company_id', companyId)
      .eq('integration_type', 'billit')
      .single();

    if (integrationError || !integration?.is_enabled) {
      throw new Error("Intégration Billit non trouvée ou désactivée");
    }

    const credentials = integration.api_credentials as BillitCredentials;
    const apiBaseUrl = normalizeBillitBaseUrl(credentials.baseUrl);

    // Auth + récupération de TOUTES les commandes (en-tête PartyID). Billit IGNORE
    // les query params -> on filtre côté client sur Income/Invoice, puis par date.
    const accountData = await getBillitAccount(apiBaseUrl, credentials.apiKey);
    console.log("✅ Authentification réussie, compte:", accountData?.Email || 'N/A');

    const { orders, usedPartyId } = await fetchAllBillitOrders(
      apiBaseUrl,
      credentials.apiKey,
      credentials.companyId,
      accountData,
    );
    console.log(`📡 ${orders.length} commande(s) récupérée(s) (PartyID=${usedPartyId ?? 'défaut'})`);

    const billitInvoices: BillitOrder[] = orders
      .filter(isSaleInvoice)
      .filter((o) => billitOrderDateInRange(o.OrderDate, fromDate, toDate));
    console.log(`📋 ${billitInvoices.length} facture(s) de vente à traiter (Income/Invoice${fromDate ? `, depuis ${fromDate}` : ''})`);

    // Matching (même module que l'aperçu) : numéro -> référence -> montant+client+date
    const leazrData = await loadLeazrMatchData(supabase, companyId);
    const getReference = async (orderId: number) => {
      const d = await getBillitOrderDetail(apiBaseUrl, credentials.apiKey, usedPartyId, orderId);
      return d?.Reference || null;
    };
    const matches = await matchBillitInvoices(billitInvoices, leazrData, getReference);
    const billitByOrder = new Map(billitInvoices.map((b) => [b.OrderID, b]));
    // billing_data existant par facture Leazr -> à préserver lors de la reconstruction
    // (notamment le marqueur type='self_leasing_monthly' utilisé par le dashboard)
    const existingBillingById = new Map(leazrData.invoices.map((i: any) => [i.id, i.billing_data]));

    let linkedCount = 0;
    let createdCount = 0;
    let manualCount = 0;
    let adjustedCount = 0;
    let alreadyCount = 0;
    const errors: string[] = [];

    // Enrichissement Leazr (contrats/clients/bailleurs/offres) pour rebâtir billing_data
    // (nom client = personne/gérant, cf. _shared/billitMatch.ts buildBillitBillingData)
    const enrich = await loadLeazrEnrichment(supabase, companyId);

    const statusOf = (b: BillitOrder) => (b.Paid ? 'paid' : b.IsSent ? 'sent' : 'draft');
    const isoOrNull = (d: any) => { if (!d) return null; const t = new Date(d).getTime(); return isNaN(t) ? null : new Date(t).toISOString(); };
    const paidAtOf = (b: any) => (b.Paid ? (isoOrNull(b.PaidDate) || isoOrNull(b.OrderDate)) : null);
    const sentAtOf = (b: any) => (b.IsSent ? isoOrNull(b.OrderDate) : null);
    const norm = (s: any) => (s ?? '').toString().toUpperCase().replace(/\s+/g, '').trim();
    const resolveCtx = (m: any, detail: any) => {
      let contract = m.contract_id ? enrich.contractsById.get(m.contract_id) : null;
      let offer = (m.offer_id && enrich.offersById.get(m.offer_id)) ||
        (contract?.offer_id && enrich.offersById.get(contract.offer_id)) || null;
      // Repli : facture sans contrat/offre (ex. facture de solde) -> résoudre le
      // contexte via la Reference Billit (n° dossier/contrat).
      if (!contract && !offer && detail?.Reference) {
        const nref = norm(parseBillitReference(detail.Reference));
        const refContract = leazrData.contractByNum.get(nref);
        const refOffer = leazrData.offerByRef.get(nref);
        if (refContract) contract = enrich.contractsById.get(refContract.id) || refContract;
        if (refOffer) offer = enrich.offersById.get(refOffer.id) || refOffer;
        if (!offer && contract?.offer_id) offer = enrich.offersById.get(contract.offer_id) || null;
      }
      // client via le contrat, sinon via l'offre (ventes directes sans contrat)
      const client = (contract?.client_id && enrich.clientsById.get(contract.client_id)) ||
        (offer?.client_id && enrich.clientsById.get(offer.client_id)) || null;
      const leaser = contract?.leaser_id ? enrich.leasersById.get(contract.leaser_id) : null;
      return { contract, client, leaser, offer };
    };

    for (const m of matches) {
      const b = billitByOrder.get(m.order_id);
      if (!b) continue;
      const status = statusOf(b);
      const pdfUrl = billitPdfUrl(apiBaseUrl, b);

      try {
        if (m.action === 'link' || m.action === 'create') {
          // Détail Billit (lignes) + reconstruction du billing_data complet
          const detail = await getBillitOrderDetail(apiBaseUrl, credentials.apiKey, usedPartyId, b.OrderID);
          const ctx = resolveCtx(m, detail);
          // Préserver le billing_data existant (marqueurs type/self_leasing_monthly, etc.)
          const existingBd = m.leazr_invoice_id ? existingBillingById.get(m.leazr_invoice_id) : undefined;
          const billing_data = buildBillitBillingData(b, detail, ctx, existingBd);

          if (m.action === 'link' && m.leazr_invoice_id) {
            const { error } = await supabase
              .from('invoices')
              .update({
                external_invoice_id: String(b.OrderID),
                integration_type: 'billit',
                amount: b.TotalExcl, // Billit prime
                status,
                pdf_url: pdfUrl,
                sent_at: sentAtOf(b),
                paid_at: paidAtOf(b),
                billing_data,
                updated_at: new Date().toISOString(),
              })
              .eq('id', m.leazr_invoice_id);
            if (error) { errors.push(`Lien ${b.OrderNumber}: ${error.message}`); continue; }
            linkedCount++;
            if (m.already_linked) alreadyCount++;
            if (m.delta != null && Math.abs(m.delta) >= 0.005) adjustedCount++;
          } else {
            const { error } = await supabase
              .from('invoices')
              .insert({
                company_id: companyId,
                external_invoice_id: String(b.OrderID),
                invoice_number: b.OrderNumber,
                amount: b.TotalExcl,
                status,
                integration_type: 'billit',
                invoice_date: isoOrNull(b.OrderDate) || new Date().toISOString(),
                leaser_name: ctx.leaser?.company_name || ctx.leaser?.name || b.CounterParty?.DisplayName || 'Client Billit',
                contract_id: m.contract_id || null,
                offer_id: m.offer_id || ctx.contract?.offer_id || null,
                pdf_url: pdfUrl,
                sent_at: sentAtOf(b),
                paid_at: paidAtOf(b),
                billing_data,
              });
            if (error) { errors.push(`Création ${b.OrderNumber}: ${error.message}`); continue; }
            createdCount++;
          }
        } else {
          // Aucun match fiable -> laissé pour matching manuel (rien écrit).
          manualCount++;
        }
      } catch (e) {
        errors.push(`${b.OrderNumber}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Import terminé: ${linkedCount} liée(s), ${createdCount} créée(s), ${manualCount} manuelle(s), ${adjustedCount} ajustement(s), ${alreadyCount} déjà liée(s), ${errors.length} erreur(s)`);

    return new Response(JSON.stringify({
      success: true,
      message: `Import terminé: ${linkedCount} liée(s), ${createdCount} créée(s), ${manualCount} à matcher`,
      // champs rétro-compatibles avec l'UI existante
      imported: createdCount,
      reconciled: linkedCount,
      post_reconciled: 0,
      skipped: alreadyCount,
      // détail
      linked: linkedCount,
      created: createdCount,
      manual: manualCount,
      adjusted: adjustedCount,
      already_linked: alreadyCount,
      total_billit: billitInvoices.length,
      unmatched_count: manualCount,
      matches,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("❌ Erreur import Billit:", error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Erreur lors de l'import des factures"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
