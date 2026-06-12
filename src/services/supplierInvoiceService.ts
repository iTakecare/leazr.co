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
  allocation: "contract" | "stock" | "internal" | null;
  allocation_note: string | null;
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
    contracts?: {
      contract_number: string | null;
      client_name: string | null;
      offer_id: string | null;
      offers?: { offer_number: string | null; dossier_number: string | null } | null;
    };
  };
}

// Liste des factures d'achat
export const getSupplierInvoices = async (companyId: string, fromDate?: string, costCenterId?: string | null): Promise<SupplierInvoice[]> => {
  let q = supabase
    .from("supplier_invoices" as any)
    .select("*")
    .eq("company_id", companyId)
    .order("invoice_date", { ascending: false });
  if (fromDate) q = q.gte("invoice_date", fromDate);
  if (costCenterId) q = q.eq("cost_center_id", costCenterId);
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

// IA : catégorisation des factures non catégorisées.
// L'edge function traite max 120 factures par appel (timeout) — on boucle.
export const categorizeSupplierInvoices = async (companyId: string) => {
  let categorized = 0;
  let remaining = 0;
  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabase.functions.invoke("supplier-invoices-ai", {
      body: { companyId, action: "categorize" },
    });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || "Échec de la catégorisation");
    categorized += data.categorized || 0;
    remaining = data.remaining || 0;
    if (!remaining || !data.categorized) break;
  }
  return { categorized, remaining };
};

// IA : suggestions de matching achats <-> équipements de contrats.
// L'edge function traite max 100 lignes par appel (timeout) — on boucle.
export const suggestSupplierInvoiceMatches = async (companyId: string, invoiceId?: string) => {
  let suggestions = 0;
  let lines_examined = 0;
  for (let i = 0; i < 8; i++) {
    const { data, error } = await supabase.functions.invoke("supplier-invoices-ai", {
      body: { companyId, action: "match", invoiceId },
    });
    if (error) throw new Error(error.message);
    if (!data?.success) throw new Error(data?.error || "Échec du matching");
    suggestions += data.suggestions || 0;
    lines_examined += data.lines_examined || 0;
    if (!data.lines_remaining || !data.lines_examined) break;
  }
  return { suggestions, lines_examined };
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

// Affecter une facture d'achat : contrat / stock / usage interne
export const setSupplierInvoiceAllocation = async (
  id: string,
  allocation: "contract" | "stock" | "internal" | null,
) => {
  const { error } = await supabase
    .from("supplier_invoices" as any)
    .update({ allocation, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
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
    .select("*, contract_equipment(id, title, purchase_price, actual_purchase_price, contract_id, contracts(contract_number, client_name, offer_id, offers!contracts_offer_id_fkey(offer_number, dossier_number)))")
    .eq("company_id", companyId);
  if (supplierInvoiceId) q = q.eq("supplier_invoice_id", supplierInvoiceId);
  const { data, error } = await q.order("score", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as SupplierInvoiceMatch[];
};

// Confirmer un match : renseigne le prix/la date d'achat réels sur l'équipement
// et rejette les autres candidats de la même ligne de facture.
export const confirmMatch = async (match: SupplierInvoiceMatch, invoiceDate: string | null) => {
  const { error: mErr } = await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", match.id);
  if (mErr) throw mErr;

  // Rejeter les autres suggestions de la même ligne
  await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("supplier_invoice_id", match.supplier_invoice_id)
    .eq("line_index", match.line_index)
    .neq("id", match.id)
    .eq("status", "suggested");

  const update: Record<string, unknown> = { actual_purchase_price: match.amount };
  if (invoiceDate) update.actual_purchase_date = invoiceDate;
  const { error: eErr } = await supabase
    .from("contract_equipment")
    .update(update)
    .eq("id", match.contract_equipment_id);
  if (eErr) throw eErr;
};

// Recherche d'équipements de contrats pour attribution manuelle d'une ligne d'achat
export interface EquipmentSearchResult {
  id: string;
  title: string;
  purchase_price: number;
  actual_purchase_price: number | null;
  serial_number: string | null;
  contract_id: string;
  contract_number: string | null;
  client_name: string | null;
  offer_number: string | null;
}

export const searchContractEquipment = async (companyId: string, query: string): Promise<EquipmentSearchResult[]> => {
  const term = query.trim();
  if (term.length < 2) return [];
  // On cherche par titre d'équipement OU par client/contrat via une requête large
  const { data, error } = await supabase
    .from("contract_equipment")
    .select("id, title, purchase_price, actual_purchase_price, serial_number, contract_id, contracts!inner(contract_number, client_name, company_id, offers!contracts_offer_id_fkey(offer_number))")
    .eq("contracts.company_id", companyId)
    .or(`title.ilike.%${term}%,contracts.client_name.ilike.%${term}%,contracts.contract_number.ilike.%${term}%`)
    .limit(40);
  if (error) throw error;
  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    purchase_price: e.purchase_price,
    actual_purchase_price: e.actual_purchase_price,
    serial_number: e.serial_number,
    contract_id: e.contract_id,
    contract_number: e.contracts?.contract_number || null,
    client_name: e.contracts?.client_name || null,
    offer_number: e.contracts?.offers?.offer_number || null,
  }));
};

// Attribution manuelle : lie une ligne de facture d'achat à un équipement choisi,
// rejette les autres suggestions de la même ligne, et écrit le prix réel.
export const attachLineToEquipment = async (
  companyId: string,
  invoice: { id: string },
  line: { line_index: number; line_description: string; amount: number },
  equipmentId: string,
  invoiceDate: string | null,
) => {
  // Rejeter les autres suggestions de cette ligne
  await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("supplier_invoice_id", invoice.id)
    .eq("line_index", line.line_index)
    .neq("contract_equipment_id", equipmentId);

  // Upsert le match confirmé sur l'équipement choisi
  const { error } = await supabase.from("supplier_invoice_matches" as any).upsert(
    {
      company_id: companyId,
      supplier_invoice_id: invoice.id,
      contract_equipment_id: equipmentId,
      line_index: line.line_index,
      line_description: line.line_description,
      amount: line.amount,
      score: 100,
      reason: "Attribution manuelle",
      status: "confirmed",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "supplier_invoice_id,line_index,contract_equipment_id" },
  );
  if (error) throw error;

  // Écrire le prix/date d'achat réels sur l'équipement
  const update: Record<string, unknown> = { actual_purchase_price: line.amount };
  if (invoiceDate) update.actual_purchase_date = invoiceDate;
  await supabase.from("contract_equipment").update(update).eq("id", equipmentId);
};

export const rejectMatch = async (matchId: string) => {
  const { error } = await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw error;
};
