// Matching Billit ↔ Leazr — logique PARTAGÉE entre billit-preview (lecture seule)
// et billit-import-invoices (écriture), pour que l'aperçu reflète exactement
// ce que l'import fera.
//
// Priorité de matching (validée 11/06/2026) :
//   1. NUMÉRO    : Billit OrderNumber == Leazr invoices.invoice_number
//   2. RÉFÉRENCE : Billit.Reference ("DOSSIER 180-xxxxx" / "CONTRAT LOC-...") ->
//                  offers.dossier_number|leaser_request_number|offer_number ou
//                  contracts.contract_number -> facture(s) du contrat/offre
//   3. MONTANT   : fallback montant (±2%) + nom client + date proche (45j)
// Billit prime : sur un lien, le montant Leazr est écrasé par celui de Billit.

import type { BillitOrder } from "./billit.ts";

export interface LeazrMatchData {
  invByNumber: Map<string, any>;
  invoices: any[];
  contractByNum: Map<string, any>;
  offerByRef: Map<string, any>;
  offerContracts: Map<string, any[]>;
  invsByContract: Map<string, any[]>;
  invsByOffer: Map<string, any[]>;
}

export interface BillitMatchResult {
  order_id: number;
  order_number: string;
  order_date: string | null;
  customer: string | null;
  billit_excl: number;
  reference: string | null;
  action: "link" | "create" | "manual";
  via: "numéro" | "référence" | "montant+client" | null;
  leazr_invoice_id: string | null;
  leazr_invoice_number: string | null;
  leazr_amount: number | null;
  contract_id: string | null;
  offer_id: string | null;
  contract_number: string | null;
  delta: number | null; // billit_excl - leazr_amount (Billit prime)
  already_linked: boolean; // déjà rattachée à CETTE facture Billit
}

const norm = (s: unknown) => (s ?? "").toString().toUpperCase().replace(/\s+/g, "").trim();
const normName = (s: unknown) => (s ?? "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
const daysBetween = (a: string, b: string) =>
  Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

export function parseBillitReference(ref: string | null | undefined): string | null {
  if (!ref) return null;
  let s = ref.toString().trim();
  s = s.replace(/^(DOSSIER|CONTRAT(\s+DE\s+LOCATION)?|FACTURE|COMMANDE|REF\.?|R[ÉE]F\.?|N[°O]\.?)\s*[:#]?\s*/i, "");
  s = s.replace(/\s*-\s*SOLDE.*$/i, ""); // "180-32082 - SOLDE" -> "180-32082"
  return s.trim();
}

export async function loadLeazrMatchData(supabase: any, companyId: string): Promise<LeazrMatchData> {
  const [{ data: contracts }, { data: offers }, { data: invoices }] = await Promise.all([
    supabase.from("contracts").select("id, contract_number, offer_id").eq("company_id", companyId),
    supabase.from("offers").select("id, offer_number, dossier_number, leaser_request_number").eq("company_id", companyId),
    supabase.from("invoices").select("id, invoice_number, contract_id, offer_id, amount, external_invoice_id, leaser_name, invoice_date").eq("company_id", companyId),
  ]);

  const invByNumber = new Map<string, any>();
  for (const inv of invoices || []) if (inv.invoice_number) invByNumber.set(norm(inv.invoice_number), inv);
  const contractByNum = new Map<string, any>();
  for (const c of contracts || []) if (c.contract_number) contractByNum.set(norm(c.contract_number), c);
  const offerByRef = new Map<string, any>();
  for (const o of offers || []) for (const v of [o.offer_number, o.dossier_number, o.leaser_request_number]) if (v) offerByRef.set(norm(v), o);
  const offerContracts = new Map<string, any[]>();
  for (const c of contracts || []) if (c.offer_id) { if (!offerContracts.has(c.offer_id)) offerContracts.set(c.offer_id, []); offerContracts.get(c.offer_id)!.push(c); }
  const invsByContract = new Map<string, any[]>();
  for (const inv of invoices || []) if (inv.contract_id) { if (!invsByContract.has(inv.contract_id)) invsByContract.set(inv.contract_id, []); invsByContract.get(inv.contract_id)!.push(inv); }
  const invsByOffer = new Map<string, any[]>();
  for (const inv of invoices || []) if (inv.offer_id) { if (!invsByOffer.has(inv.offer_id)) invsByOffer.set(inv.offer_id, []); invsByOffer.get(inv.offer_id)!.push(inv); }

  return { invByNumber, invoices: invoices || [], contractByNum, offerByRef, offerContracts, invsByContract, invsByOffer };
}

// getReference(orderId) : appelé PARESSEUSEMENT (uniquement pour les factures non
// matchées par numéro) afin d'éviter de récupérer le détail des 72 factures.
export async function matchBillitInvoices(
  billitInvoices: BillitOrder[],
  data: LeazrMatchData,
  getReference: (orderId: number) => Promise<string | null>,
): Promise<BillitMatchResult[]> {
  const used = new Set<string>();
  const results: BillitMatchResult[] = [];

  const base = (o: BillitOrder): BillitMatchResult => ({
    order_id: o.OrderID,
    order_number: o.OrderNumber,
    order_date: o.OrderDate ? String(o.OrderDate).slice(0, 10) : null,
    customer: o.CounterParty?.DisplayName || null,
    billit_excl: o.TotalExcl || 0,
    reference: null,
    action: "manual",
    via: null,
    leazr_invoice_id: null,
    leazr_invoice_number: null,
    leazr_amount: null,
    contract_id: null,
    offer_id: null,
    contract_number: null,
    delta: null,
    already_linked: false,
  });

  const link = (r: BillitMatchResult, inv: any, via: BillitMatchResult["via"], contractNumber?: string | null) => {
    used.add(inv.id);
    r.action = "link";
    r.via = via;
    r.leazr_invoice_id = inv.id;
    r.leazr_invoice_number = inv.invoice_number;
    r.leazr_amount = inv.amount ?? null;
    r.contract_id = inv.contract_id || null;
    r.offer_id = inv.offer_id || null;
    if (contractNumber) r.contract_number = contractNumber;
    r.delta = inv.amount != null ? r.billit_excl - inv.amount : null;
    r.already_linked = String(inv.external_invoice_id || "") === String(r.order_id);
  };

  const pickFree = (invs: any[] | undefined, excl: number) => {
    const free = (invs || []).filter((i) => !used.has(i.id));
    if (!free.length) return null;
    return [...free].sort((a, b) => Math.abs((a.amount || 0) - excl) - Math.abs((b.amount || 0) - excl))[0];
  };

  // PASSE 1 — numéro
  for (const o of billitInvoices) {
    const r = base(o);
    const inv = data.invByNumber.get(norm(o.OrderNumber));
    if (inv && !used.has(inv.id)) link(r, inv, "numéro");
    results.push(r);
  }

  // PASSE 2 — référence (lazy detail)
  for (const r of results) {
    if (r.action === "link") continue;
    const reference = await getReference(r.order_id);
    r.reference = reference;
    const nref = norm(parseBillitReference(reference));
    if (!nref) continue;
    const contract = data.contractByNum.get(nref) || null;
    const offer = data.offerByRef.get(nref) || null;
    if (!contract && !offer) continue;

    let candidates: any[] = [];
    let cnumber: string | null = contract?.contract_number || null;
    if (contract) candidates = candidates.concat(data.invsByContract.get(contract.id) || []);
    if (offer) {
      candidates = candidates.concat(data.invsByOffer.get(offer.id) || []);
      for (const c of data.offerContracts.get(offer.id) || []) {
        candidates = candidates.concat(data.invsByContract.get(c.id) || []);
        if (!cnumber) cnumber = c.contract_number;
      }
    }
    const inv = pickFree(candidates, r.billit_excl);
    // n'auto-lier que si le montant est cohérent (±2% ou ±50€), sinon créer
    if (inv && Math.abs((inv.amount || 0) - r.billit_excl) <= Math.max(50, r.billit_excl * 0.02)) {
      link(r, inv, "référence", cnumber);
    } else {
      r.action = "create";
      r.via = "référence";
      r.contract_id = contract?.id || (offer ? (data.offerContracts.get(offer.id)?.[0]?.id || null) : null);
      r.offer_id = offer?.id || contract?.offer_id || null;
      r.contract_number = cnumber;
    }
  }

  // PASSE 3 — montant + client + date
  for (const r of results) {
    if (r.action === "link" || r.action === "create") continue;
    const cand = (data.invoices || [])
      .filter((i) => {
        if (used.has(i.id)) return false;
        if (!i.amount) return false;
        if (Math.abs(i.amount - r.billit_excl) / (r.billit_excl || 1) > 0.02) return false;
        const nameOk = i.leaser_name && r.customer
          ? (normName(i.leaser_name).includes(normName(r.customer)) || normName(r.customer).includes(normName(i.leaser_name)))
          : false;
        const dateOk = i.invoice_date && r.order_date ? daysBetween(i.invoice_date, r.order_date) <= 45 : true;
        return nameOk && dateOk;
      })
      .sort((a, b) => Math.abs((a.amount || 0) - r.billit_excl) - Math.abs((b.amount || 0) - r.billit_excl));
    if (cand[0]) link(r, cand[0], "montant+client");
    else r.action = "manual";
  }

  return results;
}
