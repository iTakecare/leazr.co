import { supabase } from "@/integrations/supabase/client";

// Rentabilité réelle par contrat :
//   CA facturé (factures liées − notes de crédit)
//   − coût matériel (actual_purchase_price si confirmé, sinon purchase_price estimé)
//   − commission éventuelle (offre)
// La marge théorique (offers.margin) sert de point de comparaison.

export interface ContractProfitability {
  contract_id: string;
  contract_number: string | null;
  client_name: string | null;
  leaser_name: string | null;
  status: string;
  is_self_leasing: boolean;
  created_at: string;
  monthly_payment: number;
  contract_duration: number | null;
  // revenus
  revenue_invoiced: number;     // HTVA facturé (− NC)
  revenue_projected: number;    // self-leasing: mensualité × durée
  dossier_fee: number;          // frais de dossier encaissés via Mollie (hors factures)
  invoice_count: number;
  // coûts
  cost_total: number;
  cost_confirmed: number;       // part avec prix d'achat réel
  cost_estimated: boolean;      // au moins un équipement sans prix réel
  equipment_count: number;
  equipment_confirmed: number;
  commission: number;
  // marges
  margin_real: number;
  margin_pct: number | null;
  margin_theoretical: number | null;
  // détail pour le drill-down
  equipment: Array<{
    title: string;
    quantity: number;
    purchase_price: number;
    actual_purchase_price: number | null;
  }>;
  invoices: Array<{ invoice_number: string | null; amount: number; status: string; invoice_date: string | null }>;
  credit_notes_total: number;
}

export interface ProfitabilitySummary {
  contracts: ContractProfitability[];
  totals: {
    revenue: number;
    cost: number;
    margin: number;
    margin_pct: number | null;
    negative_count: number;
    estimated_count: number;
    contract_count: number;
  };
}

const ACTIVE_STATUSES = new Set(["active", "completed", "equipment_ordered", "contract_sent"]);

export const getContractProfitability = async (
  companyId: string,
  fromDate?: string,
  costCenterId?: string | null,
): Promise<ProfitabilitySummary> => {
  const contractsBase = supabase
    .from("contracts")
    .select("id, contract_number, client_name, leaser_name, status, is_self_leasing, created_at, monthly_payment, contract_duration, offer_id, dossier_fee_amount, dossier_fee_status")
    .eq("company_id", companyId);
  const [contractsQ, equipmentQ, invoicesQ, creditNotesQ, offersQ] = await Promise.all([
    costCenterId ? contractsBase.eq("cost_center_id", costCenterId) : contractsBase,
    supabase
      .from("contract_equipment")
      .select("contract_id, title, quantity, purchase_price, actual_purchase_price, is_gifted"),
    supabase
      .from("invoices")
      .select("contract_id, invoice_number, amount, status, invoice_date, credited_amount")
      .eq("company_id", companyId)
      .not("contract_id", "is", null),
    // FK explicite : credit_notes↔invoices a 2 relations (invoice_id et credit_note_id)
    supabase
      .from("credit_notes")
      .select("amount, invoice_id, invoices!credit_notes_invoice_id_fkey!inner(contract_id, company_id)")
      .eq("invoices.company_id", companyId),
    supabase
      .from("offers")
      .select("id, margin, commission, file_fee")
      .eq("company_id", companyId),
  ]);

  const contracts = (contractsQ.data || []).filter(
    (c: any) => !fromDate || (c.created_at || "") >= fromDate,
  );
  const offerById = new Map((offersQ.data || []).map((o: any) => [o.id, o]));

  const eqByContract = new Map<string, any[]>();
  for (const e of equipmentQ.data || []) {
    if (!eqByContract.has(e.contract_id)) eqByContract.set(e.contract_id, []);
    eqByContract.get(e.contract_id)!.push(e);
  }
  const invByContract = new Map<string, any[]>();
  for (const i of invoicesQ.data || []) {
    if (!invByContract.has(i.contract_id)) invByContract.set(i.contract_id, []);
    invByContract.get(i.contract_id)!.push(i);
  }
  const cnByContract = new Map<string, number>();
  for (const cn of creditNotesQ.data || []) {
    const cid = (cn as any).invoices?.contract_id;
    if (cid) cnByContract.set(cid, (cnByContract.get(cid) || 0) + (cn.amount || 0));
  }

  const rows: ContractProfitability[] = contracts.map((c: any) => {
    const offer = c.offer_id ? offerById.get(c.offer_id) : null;
    const equipment = eqByContract.get(c.id) || [];
    const invoices = (invByContract.get(c.id) || []).filter((i: any) => i.status !== "cancelled");

    const grossInvoiced = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const creditNotesTotal = cnByContract.get(c.id) || 0;
    const revenueInvoiced = grossInvoiced - creditNotesTotal;

    const duration = c.contract_duration || 0;
    const revenueProjected = c.is_self_leasing ? (c.monthly_payment || 0) * duration : 0;

    const dossierFee = c.dossier_fee_status === "paid" ? (c.dossier_fee_amount || 0) : 0;

    let costTotal = 0;
    let costConfirmed = 0;
    let confirmedCount = 0;
    for (const e of equipment) {
      const qty = e.quantity || 1;
      const unit = e.actual_purchase_price ?? e.purchase_price ?? 0;
      costTotal += unit * qty;
      if (e.actual_purchase_price != null) {
        costConfirmed += e.actual_purchase_price * qty;
        confirmedCount++;
      }
    }
    const commission = offer?.commission || 0;

    // Self-leasing : la marge "réelle" à terme se mesure sur le projeté ;
    // on affiche les deux, la marge calculée ici reste basée sur le FACTURÉ.
    const revenueForMargin = revenueInvoiced + dossierFee;
    const marginReal = revenueForMargin - costTotal - commission;
    const marginPct = revenueForMargin > 0 ? (marginReal / revenueForMargin) * 100 : null;

    return {
      contract_id: c.id,
      contract_number: c.contract_number,
      client_name: c.client_name,
      leaser_name: c.leaser_name,
      status: c.status,
      is_self_leasing: !!c.is_self_leasing,
      created_at: c.created_at,
      monthly_payment: c.monthly_payment || 0,
      contract_duration: c.contract_duration,
      revenue_invoiced: revenueInvoiced,
      revenue_projected: revenueProjected,
      dossier_fee: dossierFee,
      invoice_count: invoices.length,
      cost_total: costTotal,
      cost_confirmed: costConfirmed,
      cost_estimated: equipment.length > 0 && confirmedCount < equipment.length,
      equipment_count: equipment.length,
      equipment_confirmed: confirmedCount,
      commission,
      margin_real: marginReal,
      margin_pct: marginPct,
      margin_theoretical: offer?.margin ?? null,
      equipment: equipment.map((e: any) => ({
        title: e.title,
        quantity: e.quantity || 1,
        purchase_price: e.purchase_price || 0,
        actual_purchase_price: e.actual_purchase_price,
      })),
      invoices: invoices.map((i: any) => ({
        invoice_number: i.invoice_number,
        amount: i.amount || 0,
        status: i.status,
        invoice_date: i.invoice_date,
      })),
      credit_notes_total: creditNotesTotal,
    };
  });

  // Totaux sur les contrats "réels" (exclut cancelled — la NC a annulé le CA)
  const relevant = rows.filter((r) => ACTIVE_STATUSES.has(r.status) || r.status === "defaulted");
  const revenue = relevant.reduce((s, r) => s + r.revenue_invoiced + r.dossier_fee, 0);
  const cost = relevant.reduce((s, r) => s + r.cost_total + r.commission, 0);
  const margin = revenue - cost;

  return {
    contracts: rows,
    totals: {
      revenue,
      cost,
      margin,
      margin_pct: revenue > 0 ? (margin / revenue) * 100 : null,
      negative_count: relevant.filter((r) => r.revenue_invoiced > 0 && r.margin_real < 0).length,
      estimated_count: relevant.filter((r) => r.cost_estimated).length,
      contract_count: relevant.length,
    },
  };
};
