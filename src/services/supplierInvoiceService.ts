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
export const suggestSupplierInvoiceMatches = async (companyId: string, invoiceId?: string, reset = false) => {
  let suggestions = 0;
  let lines_examined = 0;
  for (let i = 0; i < 8; i++) {
    const { data, error } = await supabase.functions.invoke("supplier-invoices-ai", {
      // reset uniquement au 1er appel (purge les suggestions non confirmées avant de re-matcher)
      body: { companyId, action: "match", invoiceId, reset: reset && i === 0 },
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
export const confirmMatch = async (match: SupplierInvoiceMatch, invoiceDate: string | null, unitPrice?: number) => {
  // Prix réel UNITAIRE à enregistrer : la valeur saisie/validée si fournie, sinon
  // le montant du match (rétro-compat). Voir smartUnitPrice côté UI : le montant
  // Billit est souvent le TOTAL ligne (qté>1) -> ne jamais l'écrire tel quel par unité.
  const price = unitPrice != null ? unitPrice : (match.amount ?? 0);

  const { error: mErr } = await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "confirmed", amount: price, updated_at: new Date().toISOString() })
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

  const update: Record<string, unknown> = { actual_purchase_price: price };
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
  const like = `%${term}%`;
  const SEL = "id, title, purchase_price, actual_purchase_price, serial_number, contract_id, contracts!inner(contract_number, client_name, company_id, offers!contracts_offer_id_fkey(offer_number))";

  // PostgREST n'autorise pas .or() sur une relation jointe -> deux requêtes puis fusion.
  // 1) par titre d'équipement
  const byTitle = supabase.from("contract_equipment").select(SEL).eq("contracts.company_id", companyId).ilike("title", like).limit(25);
  // 2) par client ou n° de contrat -> on récupère les contrats puis leurs équipements
  const contractsQ = await supabase.from("contracts").select("id").eq("company_id", companyId).or(`client_name.ilike.${like},contract_number.ilike.${like}`).limit(25);
  const contractIds = (contractsQ.data || []).map((c: any) => c.id);
  const byContract = contractIds.length
    ? supabase.from("contract_equipment").select(SEL).in("contract_id", contractIds).limit(40)
    : Promise.resolve({ data: [], error: null });

  const [t, c] = await Promise.all([byTitle, byContract as any]);
  if (t.error) throw t.error;
  const merged = new Map<string, any>();
  for (const e of [...(t.data || []), ...((c as any).data || [])]) merged.set(e.id, e);

  return [...merged.values()].slice(0, 40).map((e: any) => ({
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

// Confirmation en masse : valide d'un coup les lignes dont l'unité est CERTAINE
// (un seul candidat suggéré + score élevé / n° de série). Laisse les lignes
// ambiguës (plusieurs unités identiques) à trancher manuellement.
export const bulkConfirmCertainMatches = async (
  companyId: string,
): Promise<{ confirmed: number; ambiguous: number }> => {
  const { data: matches, error } = await supabase
    .from("supplier_invoice_matches" as any)
    .select("*")
    .eq("company_id", companyId)
    .eq("status", "suggested");
  if (error) throw error;
  const rows = (matches || []) as any[];
  if (!rows.length) return { confirmed: 0, ambiguous: 0 };

  // dates des factures (pour renseigner la date d'achat réelle à la confirmation)
  const invIds = [...new Set(rows.map((m) => m.supplier_invoice_id))];
  const { data: invs } = await supabase
    .from("supplier_invoices" as any)
    .select("id, invoice_date")
    .in("id", invIds);
  const dateById = new Map((invs || []).map((i: any) => [i.id, i.invoice_date]));

  // grouper par ligne (facture + index)
  const groups = new Map<string, any[]>();
  for (const m of rows) {
    const k = `${m.supplier_invoice_id}|${m.line_index}`;
    const g = groups.get(k) || [];
    g.push(m);
    groups.set(k, g);
  }

  let confirmed = 0;
  let ambiguous = 0;
  for (const g of groups.values()) {
    // certain = un seul candidat ET score >= 75 (n° de série -> score 100)
    if (g.length === 1 && (g[0].score ?? 0) >= 75) {
      await confirmMatch(g[0] as SupplierInvoiceMatch, dateById.get(g[0].supplier_invoice_id) || null);
      confirmed++;
    } else {
      ambiguous++;
    }
  }
  return { confirmed, ambiguous };
};

export const rejectMatch = async (matchId: string) => {
  const { error } = await supabase
    .from("supplier_invoice_matches" as any)
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", matchId);
  if (error) throw error;
};
