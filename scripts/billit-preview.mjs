#!/usr/bin/env node
/**
 * Billit PREVIEW (lecture seule) — factures de vente + notes de crédit
 *
 * Ce script N'ÉCRIT RIEN : ni en base Supabase, ni dans Billit.
 * Il se contente d'appeler l'API Billit (GET) et d'afficher / exporter ce qu'il trouve,
 * pour valider les données AVANT de (ré)activer l'intégration réelle.
 *
 * Usage :
 *   BILLIT_API_KEY="xxx" node scripts/billit-preview.mjs
 *
 * Options via variables d'environnement :
 *   BILLIT_API_KEY   (requis)  clé API Billit
 *   BILLIT_BASE_URL  (optionnel, défaut https://api.billit.be)  -- ou https://api.sandbox.billit.be
 *   BILLIT_PARTY_ID  (optionnel)  PartyID / ContextPartyID si plusieurs sociétés
 *   FROM_DATE        (optionnel, défaut 2026-01-01)  filtre OrderDate >= cette date
 *   TO_DATE          (optionnel)  filtre OrderDate <= cette date
 *   OUT_JSON         (optionnel)  chemin d'un fichier JSON à écrire (dump brut)
 */

const API_KEY = process.env.BILLIT_API_KEY;
const FROM_DATE = process.env.FROM_DATE || "2026-01-01";
const TO_DATE = process.env.TO_DATE || null;
const OUT_JSON = process.env.OUT_JSON || null;
const PARTY_ID = process.env.BILLIT_PARTY_ID || null;

let BASE_URL = process.env.BILLIT_BASE_URL || "https://api.billit.be";
// Corrections d'URL identiques à l'edge function existante
BASE_URL = BASE_URL.replace("my.billit.be", "api.billit.be");
BASE_URL = BASE_URL.replace("my.sandbox.billit.be", "api.sandbox.billit.be");
BASE_URL = BASE_URL.replace(/\/$/, "");

if (!API_KEY) {
  console.error("❌ BILLIT_API_KEY manquante. Ex: BILLIT_API_KEY=\"...\" node scripts/billit-preview.mjs");
  process.exit(1);
}

const fmtEur = (n) =>
  (typeof n === "number" ? n : 0).toLocaleString("fr-BE", {
    style: "currency",
    currency: "EUR",
  });

const baseHeaders = (partyId) => {
  const h = {
    ApiKey: API_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (partyId) h["PartyID"] = partyId;
  return h;
};

async function getJson(url, partyId) {
  const res = await fetch(url, { method: "GET", headers: baseHeaders(partyId) });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

// Récupère TOUTES les commandes (toutes pages).
// NB: Billit IGNORE les query params OrderDirection/OrderType -> on filtre côté client.
async function fetchAllOrders(partyId) {
  const all = [];
  const top = 100; // Billit limite $top à 120
  let skip = 0;
  // Garde-fou anti-boucle infinie
  for (let page = 0; page < 500; page++) {
    const url = `${BASE_URL}/v1/orders?$top=${top}&$skip=${skip}`;
    const { ok, status, body } = await getJson(url, partyId);
    if (!ok) {
      const err = typeof body === "string" ? body : JSON.stringify(body);
      throw new Error(`API Billit ${status} sur /orders: ${String(err).slice(0, 300)}`);
    }
    const items = Array.isArray(body) ? body : body?.Items || [];
    all.push(...items);
    const total = body?.TotalRecordCount ?? body?.Count ?? null;
    if (items.length < top) break;
    skip += top;
    if (total != null && skip >= total) break;
  }
  return all;
}

function inRange(orderDate) {
  if (!orderDate) return false;
  const d = String(orderDate).slice(0, 10); // YYYY-MM-DD
  if (FROM_DATE && d < FROM_DATE) return false;
  if (TO_DATE && d > TO_DATE) return false;
  return true;
}

function normalize(o, kind) {
  return {
    kind, // "invoice" | "credit_note"
    OrderID: o.OrderID,
    OrderNumber: o.OrderNumber,
    OrderDate: o.OrderDate ? String(o.OrderDate).slice(0, 10) : null,
    Customer: o.CounterParty?.DisplayName || null,
    VAT: o.CounterParty?.VATNumber || null,
    TotalExcl: o.TotalExcl,
    VATAmount: o.VATAmount,
    TotalIncl: o.TotalIncl,
    Paid: !!o.Paid,
    Sent: !!o.IsSent,
    AboutInvoiceNumber: o.AboutInvoiceNumber || null,
    HasPDF: !!o.OrderPDF?.FileID,
  };
}

function printTable(rows, title) {
  console.log(`\n${"═".repeat(78)}`);
  console.log(`  ${title}  (${rows.length})`);
  console.log("═".repeat(78));
  if (rows.length === 0) {
    console.log("  (aucune)");
    return;
  }
  const sorted = [...rows].sort((a, b) => (a.OrderDate || "").localeCompare(b.OrderDate || ""));
  for (const r of sorted) {
    const num = (r.OrderNumber || `#${r.OrderID}`).padEnd(14);
    const date = (r.OrderDate || "????-??-??").padEnd(11);
    const cust = (r.Customer || "—").slice(0, 28).padEnd(28);
    const excl = fmtEur(r.TotalExcl).padStart(13);
    const stat = r.Paid ? "payée" : r.Sent ? "envoyée" : "brouillon";
    const ref = r.AboutInvoiceNumber ? `  →réf ${r.AboutInvoiceNumber}` : "";
    console.log(`  ${num} ${date} ${cust} ${excl}  ${stat}${ref}`);
  }
}

function totals(rows) {
  const excl = rows.reduce((s, r) => s + (r.TotalExcl || 0), 0);
  const incl = rows.reduce((s, r) => s + (r.TotalIncl || 0), 0);
  return { excl, incl };
}

(async () => {
  console.log(`🔎 Preview Billit (LECTURE SEULE) — base: ${BASE_URL}`);
  console.log(`   Période: OrderDate >= ${FROM_DATE}${TO_DATE ? ` et <= ${TO_DATE}` : ""}`);

  // 1) Auth + découverte des sociétés
  const auth = await getJson(`${BASE_URL}/v1/account/accountInformation`, null);
  if (!auth.ok) {
    console.error(`❌ Authentification échouée (${auth.status}). Clé/URL invalide ?`);
    console.error(typeof auth.body === "string" ? auth.body.slice(0, 400) : JSON.stringify(auth.body)?.slice(0, 400));
    process.exit(1);
  }
  const account = auth.body || {};
  const companies = account.Companies || [];
  console.log(`✅ Auth OK — compte: ${account.Email || account.Name || "N/A"}`);
  if (companies.length) {
    console.log(`   Sociétés Billit accessibles:`);
    for (const c of companies) {
      console.log(`     • ${c.Name || c.DisplayName || "—"}  (PartyID=${c.PartyID || c.ID})`);
    }
  }

  // 2) Choisir le PartyID : fourni, sinon premier qui marche, sinon null
  const candidates = [];
  if (PARTY_ID) candidates.push(PARTY_ID);
  for (const c of companies) {
    const id = c.PartyID || c.ID;
    if (id && !candidates.includes(String(id))) candidates.push(String(id));
  }
  candidates.push(null); // dernier recours : sans ContextPartyID

  let usedParty = undefined;
  let orders = null;
  let lastErr = null;
  for (const party of candidates) {
    try {
      orders = await fetchAllOrders(party);
      usedParty = party;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (orders === null) {
    console.error(`❌ Impossible de récupérer les commandes: ${lastErr?.message || lastErr}`);
    process.exit(1);
  }

  // Filtrage côté client (Billit ignore les query params OrderDirection/OrderType)
  const isSaleInvoice = (o) => o.OrderDirection === "Income" && o.OrderType === "Invoice";
  const isSaleCreditNote = (o) => o.OrderDirection === "Income" && o.OrderType === "CreditNote";

  const invoices = orders.filter(isSaleInvoice);
  const creditNotes = orders.filter(isSaleCreditNote);

  console.log(`   PartyID utilisé: ${usedParty ?? "(aucun)"}`);
  console.log(`   Commandes Billit (toutes dates/types): ${orders.length}`);
  console.log(`   → dont factures de vente (Income/Invoice): ${invoices.length}, notes de crédit vente (Income/CreditNote): ${creditNotes.length}`);

  // 3) Normaliser + filtrer par date
  const invRows = invoices.filter((o) => inRange(o.OrderDate)).map((o) => normalize(o, "invoice"));
  const cnRows = creditNotes.filter((o) => inRange(o.OrderDate)).map((o) => normalize(o, "credit_note"));

  printTable(invRows, "FACTURES DE VENTE (Income / Invoice)");
  printTable(cnRows, "NOTES DE CRÉDIT (Income / CreditNote)");

  const ti = totals(invRows);
  const tc = totals(cnRows);
  console.log(`\n${"─".repeat(78)}`);
  console.log("  RÉCAPITULATIF (depuis " + FROM_DATE + ")");
  console.log("─".repeat(78));
  console.log(`  Factures   : ${String(invRows.length).padStart(4)}   HTVA ${fmtEur(ti.excl).padStart(14)}   TVAC ${fmtEur(ti.incl)}`);
  console.log(`  Notes créd.: ${String(cnRows.length).padStart(4)}   HTVA ${fmtEur(tc.excl).padStart(14)}   TVAC ${fmtEur(tc.incl)}`);
  console.log(`  Net (fact - NC)        HTVA ${fmtEur(ti.excl - tc.excl).padStart(14)}   TVAC ${fmtEur(ti.incl - tc.incl)}`);

  if (OUT_JSON) {
    const fs = await import("node:fs");
    const dump = {
      generated_at: new Date().toISOString(),
      base_url: BASE_URL,
      context_party_id: usedParty,
      from_date: FROM_DATE,
      to_date: TO_DATE,
      summary: {
        invoices: invRows.length,
        credit_notes: cnRows.length,
        invoices_total_excl: ti.excl,
        invoices_total_incl: ti.incl,
        credit_notes_total_excl: tc.excl,
        credit_notes_total_incl: tc.incl,
      },
      invoices: invRows,
      credit_notes: cnRows,
      raw: { invoices, credit_notes: creditNotes },
    };
    fs.writeFileSync(OUT_JSON, JSON.stringify(dump, null, 2));
    console.log(`\n💾 Dump JSON écrit: ${OUT_JSON}`);
  }

  console.log(`\n✅ Preview terminé — AUCUNE donnée écrite (Supabase & Billit intacts).`);
})().catch((e) => {
  console.error("❌ Erreur:", e?.message || e);
  process.exit(1);
});
