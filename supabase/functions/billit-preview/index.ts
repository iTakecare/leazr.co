// billit-preview — PRÉVISUALISATION LECTURE SEULE des factures de vente et notes
// de crédit Billit. Cette fonction N'ÉCRIT RIEN (ni Supabase, ni Billit). Elle sert
// d'étape de validation AVANT l'import réel (billit-import-invoices / -credit-notes).
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import {
  BillitCredentials,
  BillitOrder,
  normalizeBillitBaseUrl,
  getBillitAccount,
  fetchAllBillitOrders,
  getBillitOrderDetail,
  isSaleInvoice,
  isSaleCreditNote,
  billitOrderDateInRange,
  billitPdfUrl,
} from "../_shared/billit.ts";
import { loadLeazrMatchData, matchBillitInvoices } from "../_shared/billitMatch.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PreviewRequest {
  companyId: string;
  fromDate?: string; // YYYY-MM-DD, défaut 2026-01-01
  toDate?: string;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Méthode non supportée" }, 405);
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: {
        endpoint: "billit-preview",
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: "billit-preview",
      },
    });
    if (!access.ok) return access.response;

    let payload: PreviewRequest;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { companyId } = payload;
    const fromDate = payload.fromDate || "2026-01-01";
    const toDate = payload.toDate || null;

    if (!companyId) {
      return jsonResponse({ success: false, error: "companyId is required" }, 400);
    }
    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== companyId
    ) {
      return jsonResponse({ success: false, error: "Cross-company access forbidden" }, 403);
    }

    const supabase = access.context.supabaseAdmin;

    // Identifiants Billit
    const { data: integration, error: integrationError } = await supabase
      .from("company_integrations")
      .select("api_credentials, is_enabled")
      .eq("company_id", companyId)
      .eq("integration_type", "billit")
      .single();

    if (integrationError || !integration) {
      throw new Error("Intégration Billit non configurée");
    }
    const credentials = integration.api_credentials as BillitCredentials;
    if (!credentials?.apiKey || !credentials?.baseUrl) {
      throw new Error("Identifiants Billit incomplets (clé API ou URL manquante)");
    }

    const apiBaseUrl = normalizeBillitBaseUrl(credentials.baseUrl);

    // Auth + récupération de TOUTES les commandes pour la bonne société (PartyID)
    const account = await getBillitAccount(apiBaseUrl, credentials.apiKey);
    const { orders, usedPartyId } = await fetchAllBillitOrders(
      apiBaseUrl,
      credentials.apiKey,
      credentials.companyId,
      account,
    );

    // Filtrage métier (Billit ignore les filtres serveur)
    const saleInvoices = orders.filter(isSaleInvoice).filter((o) =>
      billitOrderDateInRange(o.OrderDate, fromDate, toDate)
    );
    const saleCreditNotes = orders.filter(isSaleCreditNote).filter((o) =>
      billitOrderDateInRange(o.OrderDate, fromDate, toDate)
    );

    // Diff vs déjà importé
    const { data: existingInvoices } = await supabase
      .from("invoices")
      .select("external_invoice_id")
      .eq("company_id", companyId)
      .not("external_invoice_id", "is", null);
    const importedInvoiceIds = new Set(
      (existingInvoices || []).map((i: any) => String(i.external_invoice_id)),
    );

    const { data: existingCreditNotes } = await supabase
      .from("credit_notes")
      .select("credit_note_number, billing_data")
      .eq("company_id", companyId);
    const importedCreditNoteIds = new Set(
      (existingCreditNotes || [])
        .filter((cn: any) => cn.billing_data?.billit_order_id)
        .map((cn: any) => String(cn.billing_data.billit_order_id)),
    );
    const normNum = (s: any) => (s ?? "").toString().toUpperCase().replace(/\s+/g, "").trim();
    const existingCreditNoteNumbers = new Set(
      (existingCreditNotes || []).filter((cn: any) => cn.credit_note_number).map((cn: any) => normNum(cn.credit_note_number)),
    );

    const mapOrder = (o: BillitOrder, importedSet: Set<string>) => ({
      order_id: o.OrderID,
      order_number: o.OrderNumber,
      order_date: o.OrderDate ? String(o.OrderDate).slice(0, 10) : null,
      customer: o.CounterParty?.DisplayName || null,
      vat_number: o.CounterParty?.VATNumber || null,
      total_excl: o.TotalExcl ?? 0,
      vat_amount: o.VATAmount ?? 0,
      total_incl: o.TotalIncl ?? 0,
      status: o.Paid ? "paid" : o.IsSent ? "sent" : "draft",
      about_invoice_number: o.AboutInvoiceNumber || null,
      has_pdf: !!o.OrderPDF?.FileID,
      pdf_url: billitPdfUrl(apiBaseUrl, o),
      already_imported: importedSet.has(String(o.OrderID)),
    });

    // Matching proposé (même logique que l'import) : numéro -> référence -> montant
    const leazrData = await loadLeazrMatchData(supabase, companyId);
    const getReference = async (orderId: number) => {
      const d = await getBillitOrderDetail(apiBaseUrl, credentials.apiKey, usedPartyId, orderId);
      return d?.Reference || null;
    };
    const matches = await matchBillitInvoices(saleInvoices, leazrData, getReference);
    const matchByOrder = new Map(matches.map((m) => [m.order_id, m]));

    const invoiceRows = saleInvoices
      .map((o) => {
        const row = mapOrder(o, importedInvoiceIds);
        const m = matchByOrder.get(o.OrderID);
        return {
          ...row,
          match_action: m?.action || "manual",
          match_via: m?.via || null,
          leazr_invoice_number: m?.leazr_invoice_number || null,
          leazr_amount: m?.leazr_amount ?? null,
          contract_number: m?.contract_number || null,
          amount_delta: m?.delta ?? null,
        };
      })
      .sort((a, b) => (a.order_date || "").localeCompare(b.order_date || ""));
    const creditNoteRows = saleCreditNotes
      .map((o) => {
        const row = mapOrder(o, importedCreditNoteIds);
        // déjà géré si lié par billit_order_id OU si une NC de même numéro existe (sera liée)
        row.already_imported = row.already_imported || existingCreditNoteNumbers.has(normNum(o.OrderNumber));
        return row;
      })
      .sort((a, b) => (a.order_date || "").localeCompare(b.order_date || ""));

    const sum = (rows: any[], key: string) => rows.reduce((s, r) => s + (r[key] || 0), 0);
    const newInvoices = invoiceRows.filter((r) => !r.already_imported);
    const newCreditNotes = creditNoteRows.filter((r) => !r.already_imported);
    const adjustments = invoiceRows.filter((r) => r.amount_delta != null && Math.abs(r.amount_delta) >= 0.005);

    return jsonResponse({
      success: true,
      readonly: true,
      from_date: fromDate,
      to_date: toDate,
      used_party_id: usedPartyId,
      account_email: account?.Email || null,
      total_orders_fetched: orders.length,
      summary: {
        invoices_total: invoiceRows.length,
        invoices_new: newInvoices.length,
        invoices_already: invoiceRows.length - newInvoices.length,
        invoices_total_excl: sum(invoiceRows, "total_excl"),
        invoices_total_incl: sum(invoiceRows, "total_incl"),
        credit_notes_total: creditNoteRows.length,
        credit_notes_new: newCreditNotes.length,
        credit_notes_already: creditNoteRows.length - newCreditNotes.length,
        credit_notes_total_excl: sum(creditNoteRows, "total_excl"),
        credit_notes_total_incl: sum(creditNoteRows, "total_incl"),
        match_link: invoiceRows.filter((r) => r.match_action === "link").length,
        match_create: invoiceRows.filter((r) => r.match_action === "create").length,
        match_manual: invoiceRows.filter((r) => r.match_action === "manual").length,
        amount_adjustments: adjustments.length,
      },
      invoices: invoiceRows,
      credit_notes: creditNoteRows,
    });
  } catch (error) {
    console.error("❌ billit-preview:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: "Erreur lors de la prévisualisation Billit",
      },
      500,
    );
  }
});
