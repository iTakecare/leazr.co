import { supabase } from "@/integrations/supabase/client";

// Catégories d'achat (compta BE) — doit rester aligné avec supplier-invoices-ai
export const PURCHASE_CATEGORIES = [
  "Achat de marchandises",
  "Frais de marketing et publicité",
  "Honoraires comptables et juridiques",
  "Secrétariat social & RH",
  "Sous-traitance",
  "Télécom & Internet",
  "Frais bancaires & financiers",
  "Carburant & déplacements",
  "Assurances",
  "Logiciels & services IT",
  "Logistique & transport",
  "Loyer & charges",
  "Fournitures & petit matériel",
  "Leasing & financement",
  "Autres",
] as const;

export interface SupplierInvoiceLine {
  description: string;
  unit_price_excl: number;
  quantity: number;
  total_excl: number;
}

export interface SupplierInvoice {
  id: string;
  company_id: string;
  billit_order_id: string;
  invoice_number: string | null;
  doc_type: "invoice" | "credit_note";
  supplier_name: string | null;
  supplier_vat: string | null;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  amount_excl: number;
  vat_amount: number;
  amount_incl: number;
  to_pay: number;
  paid: boolean;
  order_status: string | null;
  payment_method: string | null;
  overdue: boolean;
  days_overdue: number | null;
  category: string | null;
  category_source: string | null;
  lines: SupplierInvoiceLine[];
  pdf_url: string | null;
}

export interface SupplierInvoiceMatch {
  id: string;
  supplier_invoice_id: string;
  contract_equipment_id: string;
  line_index: number;
  line_description: string | null;
  amount: number | null;
  score: number | null;
  reason: string | null;
  status: "suggested" | "confirmed" | "rejected";
  contract_equipment?: {
    id: string;
    title: string;
    purchase_price: number;
    actual_purchase_price: number | null;
    contract_id: string;
    contracts?: { contract_number: string | null; client_name: string | null };
  };
}

// Liste des factures d'achat
export const getSupplierInvoices = async (companyId: string, fromDate?: string): Promise<SupplierInvoice[]> => {
  let q = supabase
    .from("supplier_invoices" as any)
    .select("*")
    .eq("company_id", companyId)
    .order("invoice_date", { ascending: false });
  if (fromDate) q = q.gte("invoice_date", fromDate);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as unknown as SupplierInvoice[];
};

// Synchroniser depuis Billit (écrit/rafraîchit supplier_invoices)
export const syncSupplierInvoices = async (companyId: string, fromDate?: string) => {
  const { data, error } = await supabase.functions.invoke("billit-import-purchase-invoices", {
    body: { companyId, fromDate },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec de la synchronisation");
  return data as { created: number; updated: number; total_billit: number };
};

// IA : catégorisation des factures non catégorisées
export const categorizeSupplierInvoices = async (companyId: string) => {
  const { data, error } = await supabase.functions.invoke("supplier-invoices-ai", {
    body: { companyId, action: "categorize" },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec de la catégorisation");
  return data as { categorized: number; remaining: number };
};

// IA : suggestions de matching achats <-> équipements de contrats
export const suggestSupplierInvoiceMatches = async (companyId: string, invoiceId?: string) => {
  const { data, error } = await supabase.functions.invoke("supplier-invoices-ai", {
    body: { companyId, action: "match", invoiceId },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec du matching");
  return data as { suggestions: number; lines_examined: number };
};

// IA : analyse des coûts + suggestions d'optimisation (markdown)
export const analyzeSupplierCosts = async (companyId: string, fromDate?: string) => {
  const { data, error } = await supabase.functions.invoke("supplier-invoices-ai", {
    body: { companyId, action: "analyze", fromDate },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || "Échec de l'analyse");
  return data as { analysis: string };
};

// Changer manuellement la catégorie d'une facture
export const updateSupplierInvoiceCategory = async (id: string, category: string) => {
  const { error } = await supabase
    .from("supplier_invoices" as any)
    .update({ category, category_source: "manual", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
};

// Suggestions de matching d'une facture (avec équipement + contrat joints)
export const getInvoiceMatches = async (companyId: string, supplierInvoiceId?: string): Promise<SupplierInvoiceMatch[]> => {
  let q = supabase
    .from("supplier_invoice_matches" as any)
    .select("*, contract_equipment(id, title, purchase_price, actual_purchase_price, contract_id, contracts(contract_number, client_name))")
    .eq("company_id", companyId);
  if (supplierInvoiceId) q = q.eq("supplier_invoice_id", supplierInvoiceId);
  const { data, error } = await q.order("score", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as SupplierInvoiceMatch[];
};

// Confirmer un match : renseigne le prix/la date d'achat réels sur l'équipement
export const confirmMatch = async (match: SupplierInvoiceMatch, invoiceDate: string | null) => {
  const { error: mErr } = await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", match.id);
  if (mErr) throw mErr;

  const update: Record<string, unknown> = { actual_purchase_price: match.amount };
  if (invoiceDate) update.actual_purchase_date = invoiceDate;
  const { error: eErr } = await supabase
    .from("contract_equipment")
    .update(update)
    .eq("id", match.contract_equipment_id);
  if (eErr) throw eErr;
};

export const rejectMatch = async (matchId: string) => {
  const { error } = await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw error;
};
