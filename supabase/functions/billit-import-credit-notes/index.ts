import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import {
  normalizeBillitBaseUrl,
  getBillitAccount,
  fetchAllBillitOrders,
  isSaleCreditNote,
  billitOrderDateInRange,
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

interface BillitCreditNote {
  OrderID: number;
  OrderNumber: string;
  OrderDate: string;
  TotalExcl: number;
  TotalIncl: number;
  VATAmount: number;
  Paid: boolean;
  IsSent: boolean;
  OrderDirection: string;
  OrderType: string;
  AboutInvoiceNumber?: string;
  CounterParty?: {
    DisplayName: string;
    VATNumber?: string;
    Email?: string;
  };
  OrderPDF?: {
    FileID: string;
  };
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
        endpoint: "billit-import-credit-notes",
        maxRequests: 8,
        windowSeconds: 60,
        identifierPrefix: "billit-import-credit-notes",
      },
    });

    if (!access.ok) return access.response;

    let payload: { companyId: string; fromDate?: string; toDate?: string };
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
    console.log("📥 Début import notes de crédit Billit - companyId:", companyId);

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
    // les query params -> on filtre côté client sur Income/CreditNote puis par date.
    const accountData = await getBillitAccount(apiBaseUrl, credentials.apiKey);
    const { orders, usedPartyId } = await fetchAllBillitOrders(
      apiBaseUrl,
      credentials.apiKey,
      credentials.companyId,
      accountData,
    );
    console.log(`📡 ${orders.length} commande(s) récupérée(s) (PartyID=${usedPartyId ?? 'défaut'})`);

    const billitCreditNotes: BillitCreditNote[] = orders
      .filter(isSaleCreditNote)
      .filter((o) => billitOrderDateInRange(o.OrderDate, fromDate, toDate)) as BillitCreditNote[];
    console.log(`📋 ${billitCreditNotes.length} note(s) de crédit de vente à traiter (Income/CreditNote${fromDate ? `, depuis ${fromDate}` : ''})`);

    // Récupérer les NC existantes (lien Billit + numéro pour le matching)
    const { data: existingCreditNotes } = await supabase
      .from('credit_notes')
      .select('id, credit_note_number, amount, invoice_id, billing_data')
      .eq('company_id', companyId);

    const existingBillitIds = new Set(
      (existingCreditNotes || [])
        .filter((cn: any) => cn.billing_data?.billit_order_id)
        .map((cn: any) => cn.billing_data.billit_order_id.toString())
    );

    // Index par numéro normalisé (Billit OrderNumber == credit_note_number Leazr)
    const normNum = (s: any) => (s ?? '').toString().toUpperCase().replace(/\s+/g, '').trim();
    const cnByNumber = new Map<string, any>();
    for (const cn of existingCreditNotes || []) {
      if (cn.credit_note_number) cnByNumber.set(normNum(cn.credit_note_number), cn);
    }
    let linkedCount = 0;

    // Récupérer les factures existantes pour le matching par numéro ou montant
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, amount, external_invoice_id, leaser_name')
      .eq('company_id', companyId);

    const invoicesList = existingInvoices || [];

    let importedCount = 0;
    let skippedCount = 0;
    let matchedWithInvoice = 0;
    const errors: string[] = [];

    for (const cn of billitCreditNotes) {
      try {
        const billitId = cn.OrderID.toString();

        // Skip si déjà importée
        if (existingBillitIds.has(billitId)) {
          skippedCount++;
          continue;
        }

        // PRIORITÉ : lier à une NC Leazr existante de même numéro (évite les doublons).
        // Billit prime -> on synchronise le montant.
        const existingByNumber = cnByNumber.get(normNum(cn.OrderNumber));
        if (existingByNumber) {
          const { error: linkError } = await supabase
            .from('credit_notes')
            .update({
              amount: cn.TotalExcl,
              billing_data: {
                ...(existingByNumber.billing_data || {}),
                billit_order_id: cn.OrderID,
                billit_data: cn,
                import_source: 'billit_credit_note_link',
                billit_customer_name: cn.CounterParty?.DisplayName || null,
                about_invoice_number: cn.AboutInvoiceNumber || null,
                total_incl_vat: cn.TotalIncl,
                vat_amount: cn.VATAmount,
                reconciled_at: new Date().toISOString(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingByNumber.id);
          if (linkError) {
            errors.push(`Lien NC ${cn.OrderNumber}: ${linkError.message}`);
          } else {
            linkedCount++;
            console.log(`🔗 NC Billit ${cn.OrderNumber} liée à la NC Leazr existante (même numéro)`);
          }
          continue;
        }

        // Chercher la facture liée
        let matchedInvoiceId: string | null = null;

        // 1. Match par AboutInvoiceNumber (référence Billit vers la facture originale)
        if (cn.AboutInvoiceNumber) {
          const matchByNumber = invoicesList.find(inv => 
            inv.invoice_number === cn.AboutInvoiceNumber || 
            inv.external_invoice_id === cn.AboutInvoiceNumber
          );
          if (matchByNumber) {
            matchedInvoiceId = matchByNumber.id;
            console.log(`🔗 NC ${cn.OrderNumber} → Facture ${matchByNumber.invoice_number} (par numéro AboutInvoiceNumber)`);
          }
        }

        // 2. Si pas trouvé, match par montant (±2%) et nom client
        if (!matchedInvoiceId) {
          const cnAmount = cn.TotalExcl;
          const cnCustomer = (cn.CounterParty?.DisplayName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

          const matchByAmount = invoicesList.find(inv => {
            if (!inv.amount || cnAmount === 0) return false;
            const amountDiff = Math.abs(inv.amount - cnAmount) / cnAmount;
            if (amountDiff > 0.02) return false;
            if (cnCustomer && inv.leaser_name) {
              const invCustomer = inv.leaser_name.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cnCustomer.includes(invCustomer) || invCustomer.includes(cnCustomer);
            }
            return true;
          });

          if (matchByAmount) {
            matchedInvoiceId = matchByAmount.id;
            console.log(`🔗 NC ${cn.OrderNumber} → Facture ${matchByAmount.invoice_number} (par montant/client)`);
          }
        }

        // Générer un numéro de NC
        let creditNoteNumber = cn.OrderNumber;
        if (!creditNoteNumber) {
          const { data: generatedNumber } = await supabase
            .rpc('generate_credit_note_number', { p_company_id: companyId });
          creditNoteNumber = generatedNumber || `CN-BILLIT-${billitId}`;
        }

        // Créer la note de crédit
        const cnData: any = {
          company_id: companyId,
          invoice_id: matchedInvoiceId,
          credit_note_number: creditNoteNumber,
          amount: cn.TotalExcl,
          reason: `Note de crédit importée depuis Billit${cn.AboutInvoiceNumber ? ` (réf. facture: ${cn.AboutInvoiceNumber})` : ''}`,
          status: 'applied',
          issued_at: cn.OrderDate ? new Date(cn.OrderDate).toISOString() : new Date().toISOString(),
          billing_data: {
            billit_order_id: cn.OrderID,
            billit_data: cn,
            import_source: 'billit_credit_note_import',
            billit_customer_name: cn.CounterParty?.DisplayName || null,
            about_invoice_number: cn.AboutInvoiceNumber || null,
            total_incl_vat: cn.TotalIncl,
            vat_amount: cn.VATAmount,
            imported_at: new Date().toISOString(),
          }
        };

        const { error: insertError } = await supabase
          .from('credit_notes')
          .insert(cnData);

        if (insertError) {
          console.error(`❌ Erreur insertion NC ${cn.OrderNumber}:`, insertError);
          errors.push(`NC ${cn.OrderNumber}: ${insertError.message}`);
          continue;
        }

        // Si matchée avec une facture, mettre à jour le statut de la facture
        if (matchedInvoiceId) {
          const matchedInvoice = invoicesList.find(inv => inv.id === matchedInvoiceId);
          if (matchedInvoice) {
            const newStatus = cn.TotalExcl >= (matchedInvoice.amount || 0) ? 'credited' : 'partial_credit';
            await supabase
              .from('invoices')
              .update({
                credited_amount: cn.TotalExcl,
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', matchedInvoiceId);
          }
          matchedWithInvoice++;
        }

        importedCount++;
        console.log(`✅ NC ${cn.OrderNumber} importée${matchedInvoiceId ? ' (liée à une facture)' : ' (orpheline)'}`);

      } catch (cnError) {
        console.error(`❌ Erreur traitement NC:`, cnError);
        errors.push(`Erreur: ${cnError instanceof Error ? cnError.message : 'Unknown error'}`);
      }
    }

    console.log(`✅ Import NC terminé: ${importedCount} créée(s), ${linkedCount} liée(s) à NC existante, ${matchedWithInvoice} liée(s) à facture, ${skippedCount} déjà existante(s)`);

    return new Response(JSON.stringify({
      success: true,
      message: `Import terminé: ${linkedCount} NC liée(s), ${importedCount} créée(s)`,
      imported: importedCount,
      linked: linkedCount,
      matched: matchedWithInvoice,
      skipped: skippedCount,
      total_billit: billitCreditNotes.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error("❌ Erreur import NC Billit:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Erreur lors de l'import des notes de crédit"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
