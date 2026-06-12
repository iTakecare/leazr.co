#!/usr/bin/env node
/**
 * TEST de matching Billit ↔ Leazr (LECTURE SEULE — n'écrit rien).
 *
 * Algorithme validé avec l'utilisateur (11/06/2026), par priorité :
 *   1. NUMÉRO   : Billit OrderNumber == Leazr invoice_number
 *   2. RÉFÉRENCE: Billit.Reference ("DOSSIER 180-xxxxx" / "CONTRAT LOC-...") ->
 *                 offers.dossier_number|leaser_request_number|offer_number ou
 *                 contracts.contract_number -> facture(s) du contrat/offre
 *   3. MONTANT  : fallback montant (±2%) + nom client + date proche (45j)
 * Billit prime : si lié, le montant Leazr serait écrasé par celui de Billit.
 * Sortie : action LIÉE / CRÉÉE / MANUELLE + écarts de montant.
 *
 * Usage : BILLIT_API_KEY="..." node scripts/billit-match-test.mjs
 */
import { createClient } from "@supabase/supabase-js";

const BILLIT_KEY = process.env.BILLIT_API_KEY || "0b33231b-74f0-460c-bcf6-43ebb7505ce8";
const PARTY = process.env.BILLIT_PARTY_ID || "12307433";
const FROM = process.env.FROM_DATE || "2026-01-01";
const BASE = "https://api.billit.be";

const SB_URL = "https://cifbetjefyfocafanlhv.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZmJldGplZnlmb2NhZmFubGh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTg3ODM4MiwiZXhwIjoyMDU3NDU0MzgyfQ.RE59Xpa9DbCu1qvEqUFZW4yWwkH7XyY8_X8izY_1MOU";
const CO = "c1ce66bb-3ad2-474d-b477-583baa7ff1c0";

const H = { ApiKey: BILLIT_KEY, Accept: "application/json", PartyID: PARTY };
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });

const fmtEur = (n) => (n || 0).toLocaleString("fr-BE", { style: "currency", currency: "EUR" });
const norm = (s) => (s ?? "").toString().toUpperCase().replace(/\s+/g, "").trim();
const normName = (s) => (s ?? "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
const daysBetween = (a, b) => Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);

function parseRef(ref) {
  if (!ref) return null;
  let s = ref.toString().trim();
  s = s.replace(/^(DOSSIER|CONTRAT(\s+DE\s+LOCATION)?|FACTURE|COMMANDE|REF\.?|R[ÉE]F\.?|N[°O]\.?)\s*[:#]?\s*/i, "");
  s = s.replace(/\s*-\s*SOLDE.*$/i, ""); // "180-32082 - SOLDE" -> "180-32082"
  return s.trim();
}

async function fetchAllOrders() {
  const all = []; let skip = 0; const top = 100;
  for (let i = 0; i < 50; i++) {
    const r = await fetch(`${BASE}/v1/orders?$top=${top}&$skip=${skip}`, { headers: H });
    const b = await r.json(); const items = b.Items || []; all.push(...items);
    if (items.length < top) break; skip += top;
  }
  return all;
}
async function fetchDetails(ids, concurrency = 8) {
  const out = new Map(); let idx = 0;
  async function worker() {
    while (idx < ids.length) {
      const myId = ids[idx++];
      try { const r = await fetch(`${BASE}/v1/orders/${myId}`, { headers: H }); out.set(myId, await r.json()); }
      catch (e) { out.set(myId, { __error: String(e) }); }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

(async () => {
  console.log(`🔎 Test matching Billit ↔ Leazr (LECTURE SEULE) — depuis ${FROM}\n`);

  const orders = await fetchAllOrders();
  const sales = orders.filter((o) => o.OrderDirection === "Income" && o.OrderType === "Invoice" && String(o.OrderDate || "").slice(0, 10) >= FROM);
  console.log(`Billit : ${sales.length} facture(s) de vente depuis ${FROM}. Récupération des détails…`);
  const details = await fetchDetails(sales.map((o) => o.OrderID));

  const [{ data: contracts }, { data: offers }, { data: invoices }] = await Promise.all([
    sb.from("contracts").select("id, contract_number, offer_id, leaser_name, client_name, is_self_leasing").eq("company_id", CO),
    sb.from("offers").select("id, offer_number, dossier_number, leaser_request_number, client_name").eq("company_id", CO),
    sb.from("invoices").select("id, invoice_number, contract_id, offer_id, amount, external_invoice_id, leaser_name, invoice_date").eq("company_id", CO),
  ]);
  console.log(`Leazr : ${contracts?.length || 0} contrats, ${offers?.length || 0} offres, ${invoices?.length || 0} factures\n`);

  const contractByNum = new Map();
  for (const c of contracts || []) if (c.contract_number) contractByNum.set(norm(c.contract_number), c);
  const offerByRef = new Map();
  for (const o of offers || []) for (const v of [o.offer_number, o.dossier_number, o.leaser_request_number]) if (v) offerByRef.set(norm(v), o);
  const offerContracts = new Map();
  for (const c of contracts || []) if (c.offer_id) { if (!offerContracts.has(c.offer_id)) offerContracts.set(c.offer_id, []); offerContracts.get(c.offer_id).push(c); }
  const invByNumber = new Map();
  for (const inv of invoices || []) if (inv.invoice_number) invByNumber.set(norm(inv.invoice_number), inv);
  const invsByContract = new Map();
  for (const inv of invoices || []) if (inv.contract_id) { if (!invsByContract.has(inv.contract_id)) invsByContract.set(inv.contract_id, []); invsByContract.get(inv.contract_id).push(inv); }
  const invsByOffer = new Map();
  for (const inv of invoices || []) if (inv.offer_id) { if (!invsByOffer.has(inv.offer_id)) invsByOffer.set(inv.offer_id, []); invsByOffer.get(inv.offer_id).push(inv); }
  const alreadyLinkedBillit = new Set((invoices || []).filter((i) => i.external_invoice_id).map((i) => String(i.external_invoice_id)));

  const usedLeazr = new Set(); // factures Leazr déjà réservées par un match
  const results = [];

  const billitInfo = (o) => ({
    num: o.OrderNumber, id: o.OrderID, customer: o.CounterParty?.DisplayName || "",
    date: (o.OrderDate || "").slice(0, 10), excl: o.TotalExcl || 0,
    reference: (details.get(o.OrderID) || {}).Reference || null,
  });

  // candidat-facture le plus proche en montant, non réservé
  const pickFree = (invs, excl) => {
    const free = (invs || []).filter((i) => !usedLeazr.has(i.id));
    if (!free.length) return null;
    return [...free].sort((a, b) => Math.abs((a.amount || 0) - excl) - Math.abs((b.amount || 0) - excl))[0];
  };

  // PASSE 1 — par numéro de facture
  for (const o of sales) {
    const bi = billitInfo(o);
    const inv = invByNumber.get(norm(bi.num));
    if (inv && !usedLeazr.has(inv.id)) {
      usedLeazr.add(inv.id);
      results.push({ ...bi, action: "LINK", via: "numéro", leazr: inv, contract_number: null });
    } else {
      results.push({ ...bi, action: null, via: null, leazr: null, contract_number: null });
    }
  }

  // PASSE 2 — par Reference -> offre/contrat
  for (const r of results) {
    if (r.action) continue;
    const parsed = parseRef(r.reference);
    const nref = norm(parsed);
    if (!nref) continue;
    let contract = contractByNum.get(nref) || null;
    let offer = offerByRef.get(nref) || null;
    let cnumber = contract?.contract_number || null;
    // factures candidates = celles du contrat + (via offre) des contrats de l'offre + offer_id direct
    let candidates = [];
    if (contract) candidates = candidates.concat(invsByContract.get(contract.id) || []);
    if (offer) {
      candidates = candidates.concat(invsByOffer.get(offer.id) || []);
      for (const c of offerContracts.get(offer.id) || []) { candidates = candidates.concat(invsByContract.get(c.id) || []); if (!cnumber) cnumber = c.contract_number; }
    }
    if (!contract && !offer) continue; // référence inconnue -> passe 3
    const inv = pickFree(candidates, r.excl);
    if (inv) {
      usedLeazr.add(inv.id);
      r.action = "LINK"; r.via = "référence"; r.leazr = inv; r.contract_number = cnumber;
    } else {
      // référence connue mais aucune facture Leazr libre -> à CRÉER (Billit = source)
      r.action = "CREATE"; r.via = "référence"; r.contract_number = cnumber;
    }
  }

  // PASSE 3 — fallback montant + client + date (pour les sans-référence ou non résolus)
  for (const r of results) {
    if (r.action) continue;
    const cand = (invoices || []).filter((i) => {
      if (usedLeazr.has(i.id)) return false;
      if (!i.amount) return false;
      const amtOk = Math.abs(i.amount - r.excl) / (r.excl || 1) <= 0.02;
      if (!amtOk) return false;
      const nameOk = i.leaser_name && r.customer ? (normName(i.leaser_name).includes(normName(r.customer)) || normName(r.customer).includes(normName(i.leaser_name))) : false;
      const dateOk = i.invoice_date && r.date ? daysBetween(i.invoice_date, r.date) <= 45 : true;
      return nameOk && dateOk;
    }).sort((a, b) => Math.abs((a.amount || 0) - r.excl) - Math.abs((b.amount || 0) - r.excl));
    if (cand[0]) { usedLeazr.add(cand[0].id); r.action = "LINK"; r.via = "montant+client"; r.leazr = cand[0]; }
    else { r.action = "MANUAL"; r.via = null; }
  }

  // RAPPORT
  const pad = (s, n) => (s ?? "").toString().padEnd(n).slice(0, n);
  console.log("═".repeat(132));
  console.log(pad("Billit n°", 15), pad("Action", 8), pad("via", 14), pad("Fact.Leazr", 14), pad("Billit HTVA", 13), pad("Leazr HTVA", 13), pad("Δ", 9), "Client");
  console.log("═".repeat(132));
  for (const r of results.sort((a, b) => a.num.localeCompare(b.num))) {
    const la = r.leazr?.amount;
    const diff = la != null ? r.excl - la : null;
    const diffStr = diff == null ? "—" : Math.abs(diff) < 0.005 ? "0" : (diff > 0 ? "+" : "") + diff.toFixed(2);
    const icon = r.action === "LINK" ? (diff != null && Math.abs(diff) > Math.max(2, (la || 0) * 0.02) ? "⚠️ LINK" : "✅LINK") : r.action === "CREATE" ? "➕CREATE" : "❓MANUAL";
    console.log(pad(r.num, 15), pad(icon, 8), pad(r.via || "—", 14), pad(r.leazr?.invoice_number || "—", 14), pad(fmtEur(r.excl), 13), pad(la == null ? "—" : fmtEur(la), 13), pad(diffStr, 9), (r.customer || "").slice(0, 26));
  }

  const by = (a) => results.filter((r) => r.action === a);
  const links = by("LINK");
  const adj = links.filter((r) => { const la = r.leazr?.amount; return la != null && Math.abs(r.excl - la) >= 0.005; });
  console.log("\n" + "─".repeat(60) + "\nSYNTHÈSE\n" + "─".repeat(60));
  console.log(`Factures Billit (depuis ${FROM})   : ${results.length}`);
  console.log(`  ✅ LIÉES à une facture Leazr   : ${links.length}  (par numéro: ${links.filter(r=>r.via==="numéro").length}, référence: ${links.filter(r=>r.via==="référence").length}, montant+client: ${links.filter(r=>r.via==="montant+client").length})`);
  console.log(`  ➕ À CRÉER (Billit = source)     : ${by("CREATE").length}`);
  console.log(`  ❓ MANUELLES (aucun match)       : ${by("MANUAL").length}`);
  console.log(`  💶 Montants à ajuster (Billit prime, Δ≠0) : ${adj.length}`);
  if (by("CREATE").length) { console.log(`\n  À créer :`); for (const r of by("CREATE")) console.log(`    - ${r.num} | ref="${r.reference}" | contrat ${r.contract_number || "?"} | ${fmtEur(r.excl)} | ${r.customer}`); }
  if (by("MANUAL").length) { console.log(`\n  Manuelles :`); for (const r of by("MANUAL")) console.log(`    - ${r.num} | ref="${r.reference || "(vide)"}" | ${r.customer} | ${fmtEur(r.excl)}`); }
  if (adj.length) { console.log(`\n  Ajustements de montant (Leazr -> Billit) :`); for (const r of adj) { const la = r.leazr?.amount; console.log(`    - ${r.num} ↔ ${r.leazr.invoice_number} : Leazr ${fmtEur(la)} -> Billit ${fmtEur(r.excl)}  (Δ ${(r.excl - la).toFixed(2)})`); } }
  console.log(`\n✅ Test terminé — AUCUNE donnée écrite.`);
})().catch((e) => { console.error("❌", e?.message || e); process.exit(1); });
