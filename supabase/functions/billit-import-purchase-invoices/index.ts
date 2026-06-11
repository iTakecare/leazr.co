// billit-import-purchase-invoices — synchronise les factures d'achat (fournisseurs)
// depuis Billit (arrivées via Peppol) vers la table supplier_invoices.
// Idempotent : upsert par (company_id, billit_order_id). À chaque sync, les statuts
// de paiement (Paid/ToPay/Overdue/PaidDate) sont RAFRAÎCHIS — ils évoluent dans
// Billit au fil des paiements bancaires. Les lignes (OrderLines) ne sont récupérées
// que pour les factures nouvelles (1 appel détail / nouvelle facture).
// Appelée par l'UI (bouton Synchroniser) et par le cron quotidien billit-purchase-sync.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import {
  BillitOrder,
  normalizeBillitBaseUrl,
  getBillitAccount,
  fetchAllBillitOrders,
  getBillitOrderDetail,
  isCostInvoice,
  isCostCreditNote,
  billitOrderDateInRange,
  billitPdfUrl,
} from "../_shared/billit.ts";

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

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });

const dateOrNull = (d: unknown): string | null => {
  if (!d) return null;
  const t = new Date(String(d)).getTime();
  return isNaN(t) ? null : String(d).slice(0, 10);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Méthode non supportée' }, 405);
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: {
        endpoint: "billit-import-purchase-invoices",
        maxRequests: 8,
        windowSeconds: 60,
        identifierPrefix: "billit-import-purchase-invoices",
      },
    });
    if (!access.ok) return access.response;

    let payload: { companyId: string; fromDate?: string; toDate?: string };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { companyId } = payload;
    const fromDate = payload.fromDate || '2026-01-01';
    const toDate = payload.toDate || null;
    if (!companyId) return jsonResponse({ success: false, error: "companyId is required" }, 400);

    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== companyId
    ) {
      return jsonResponse({ success: false, error: "Cross-company access forbidden" }, 403);
    }

    const supabase = access.context.supabaseAdmin;

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

    const account = await getBillitAccount(apiBaseUrl, credentials.apiKey);
    const { orders, usedPartyId } = await fetchAllBillitOrders(
      apiBaseUrl,
      credentials.apiKey,
      credentials.companyId,
      account,
    );

    const costDocs: BillitOrder[] = orders
      .filter((o) => isCostInvoice(o) || isCostCreditNote(o))
      .filter((o) => billitOrderDateInRange(o.OrderDate, fromDate, toDate));
    console.log(`📋 ${costDocs.length} document(s) d'achat à synchroniser (Cost, depuis ${fromDate})`);

    // Existant : pour distinguer create/update et savoir qui a déjà ses lignes
    const { data: existing } = await supabase
      .from('supplier_invoices')
      .select('id, billit_order_id, lines, category')
      .eq('company_id', companyId);
    const existingByBillit = new Map(
      (existing || []).map((r: any) => [String(r.billit_order_id), r]),
    );

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Pool de détail pour les nouvelles factures (lignes), concurrence 6
    const newOnes = costDocs.filter((o) => {
      const ex = existingByBillit.get(String(o.OrderID));
      return !ex || !Array.isArray(ex.lines) || ex.lines.length === 0;
    });
    const details = new Map<number, any>();
    {
      let idx = 0;
      const worker = async () => {
        while (idx < newOnes.length) {
          const o = newOnes[idx++];
          details.set(o.OrderID, await getBillitOrderDetail(apiBaseUrl, credentials.apiKey, usedPartyId, o.OrderID));
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
    }

    const mapLines = (detail: any) =>
      (detail?.OrderLines || [])
        .map((l: any) => ({
          description: (l?.Description || '').toString(),
          unit_price_excl: l?.UnitPriceExcl ?? 0,
          quantity: l?.Quantity ?? 1,
          total_excl: l?.TotalExcl ?? ((l?.UnitPriceExcl ?? 0) * (l?.Quantity ?? 1)),
        }))
        .filter((l: any) => l.description.trim() || l.total_excl);

    for (const o of costDocs) {
      try {
        const ex = existingByBillit.get(String(o.OrderID));
        const detail = details.get(o.OrderID);
        const anyO = o as any;

        const base: Record<string, unknown> = {
          invoice_number: o.OrderNumber || String(o.OrderID),
          doc_type: isCostCreditNote(o) ? 'credit_note' : 'invoice',
          supplier_name: o.CounterParty?.DisplayName || null,
          supplier_vat: o.CounterParty?.VATNumber || null,
          invoice_date: dateOrNull(o.OrderDate),
          due_date: dateOrNull(anyO.ExpiryDate),
          paid_date: dateOrNull(anyO.PaidDate),
          amount_excl: o.TotalExcl ?? 0,
          vat_amount: o.VATAmount ?? anyO.TotalVAT ?? 0,
          amount_incl: o.TotalIncl ?? 0,
          to_pay: anyO.ToPay ?? (o.Paid ? 0 : (o.TotalIncl ?? 0)),
          paid: !!o.Paid,
          order_status: anyO.OrderStatus || null,
          payment_method: anyO.PaymentMethod || null,
          overdue: !!anyO.Overdue,
          days_overdue: anyO.DaysOverdue ?? null,
          pdf_url: billitPdfUrl(apiBaseUrl, o),
          updated_at: new Date().toISOString(),
        };

        if (ex) {
          // Update : rafraîchir paiement/montants ; ne PAS toucher category ;
          // compléter les lignes si manquantes.
          if (detail) base.lines = mapLines(detail);
          const { error } = await supabase
            .from('supplier_invoices')
            .update(base)
            .eq('id', ex.id);
          if (error) { errors.push(`${o.OrderNumber}: ${error.message}`); continue; }
          updated++;
        } else {
          const { error } = await supabase
            .from('supplier_invoices')
            .insert({
              company_id: companyId,
              billit_order_id: String(o.OrderID),
              ...base,
              lines: detail ? mapLines(detail) : [],
              billit_data: o,
            });
          if (error) { errors.push(`${o.OrderNumber}: ${error.message}`); continue; }
          created++;
        }
      } catch (e) {
        errors.push(`${o.OrderNumber}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Sync achats terminée: ${created} créée(s), ${updated} mise(s) à jour, ${errors.length} erreur(s)`);

    return jsonResponse({
      success: true,
      message: `Sync terminée: ${created} nouvelle(s), ${updated} mise(s) à jour`,
      created,
      updated,
      total_billit: costDocs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Erreur sync achats Billit:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Erreur lors de la synchronisation des factures d'achat",
    }, 500);
  }
});
