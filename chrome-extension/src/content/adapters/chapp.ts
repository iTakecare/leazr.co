/**
 * Adapter Chapp via Google Sheet publié.
 *
 * chapp.be étant bloqué pour les fetch automatisés (Cloudflare), on utilise
 * le Sheet publique fourni par iTakecare qui contient le stock + prix.
 *
 * Structure CSV (colonnes 0-indexées) :
 *   0  Type (iMac, MacBook Air, iPhone, …)
 *   1  Modelyear
 *   2  Screen size
 *   3  Processor
 *   4  RAM
 *   5  Capacity
 *   6  Qty A   ┐
 *   7  Qty B   │ stocks par grade
 *   8  Qty B-  │
 *   9  Qty OPENBOX
 *   10 Qty CPO ┘
 *   11 (vide)
 *   12 (vide)
 *   13 Prix A       ┐
 *   14 Prix B       │ prix HT par grade
 *   15 Prix B-      │
 *   16 Prix OPENBOX │
 *   17 Prix CPO     ┘
 *   18 (vide)
 *   19 Notes
 *   20 Grades
 *
 * Le sheet indique explicitement "Prices are VAT excluded" → les prix sont
 * déjà en HT, pas de /1.21.
 *
 * Pour chaque ligne on génère une offre par (grade) qui a stock > 0 ET prix > 0.
 * Grade A = condition "grade_a", B = "grade_b", B- = "grade_c", OPENBOX/CPO
 * = "grade_a" (retour/neuf certifié).
 */
import type { SiteAdapter, CapturedOffer, AdapterResult, ProductCondition } from "../../lib/types";
import { publicHealthCheck } from "../../lib/health-check";

const CHAPP_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1n3xjxiwVJsjD22mm5tX4E0lGuL_KR0_q9rNulPeb3b8/export?format=csv";
const CHAPP_SHEET_VIEW =
  "https://docs.google.com/spreadsheets/d/1n3xjxiwVJsjD22mm5tX4E0lGuL_KR0_q9rNulPeb3b8/edit";

export const chappAdapter: SiteAdapter = {
  name: "chapp",
  key: "chapp",
  displayName: "Chapp (Google Sheet)",
  loginUrl: CHAPP_SHEET_VIEW,
  checkConnection: () => publicHealthCheck(CHAPP_SHEET_CSV, { expectString: "Type,Modelyear" }),

  matches: (url) => /chapp\.(be|store)$/.test(url.hostname),

  isProductPage: () => false,
  extract: () => ({ ok: false, reason: "Chapp = source sheet-only, pas de page produit" }),

  buildSearchUrls: () => [CHAPP_SHEET_CSV],

  extractSearchResults: (doc, _url, limit = 5): CapturedOffer[] => {
    // IMPORTANT : pour Chapp, le "HTML" reçu est en fait du CSV brut — on l'a
    // passé par DOMParser qui l'a encapsulé. On récupère le texte brut.
    const rawCsv = doc.body?.textContent ?? doc.documentElement?.textContent ?? "";
    if (!rawCsv || rawCsv.length < 50) {
      console.warn("[Leazr][chapp] CSV vide");
      return [];
    }
    return parseChappCsv(rawCsv).slice(0, limit * 4); // le filtrage pertinence retient `limit` à la fin
  },
};

const GRADE_COLS = [
  { idx: 6, priceIdx: 13, code: "A", condition: "grade_a" as ProductCondition, label: "Grade A" },
  { idx: 7, priceIdx: 14, code: "B", condition: "grade_b" as ProductCondition, label: "Grade B" },
  { idx: 8, priceIdx: 15, code: "B-", condition: "grade_c" as ProductCondition, label: "Grade B-" },
  { idx: 9, priceIdx: 16, code: "OPENBOX", condition: "grade_a" as ProductCondition, label: "Open Box" },
  { idx: 10, priceIdx: 17, code: "CPO", condition: "grade_a" as ProductCondition, label: "CPO" },
];

/** Parse CSV Chapp et retourne une offre par (produit, grade) dispo */
function parseChappCsv(csv: string): CapturedOffer[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  // Ignorer l'entête
  const dataRows = rows.slice(1);

  const offers: CapturedOffer[] = [];
  for (const row of dataRows) {
    if (row.length < 18) continue;
    const type = (row[0] ?? "").trim();
    if (!type) continue;

    const modelyear = (row[1] ?? "").trim();
    const screenSize = (row[2] ?? "").trim();
    const processor = (row[3] ?? "").trim();
    const ram = (row[4] ?? "").trim();
    const capacity = (row[5] ?? "").trim();
    const notes = (row[19] ?? "").trim();

    // Pour chaque grade, vérifier qty + prix
    for (const g of GRADE_COLS) {
      const qtyStr = (row[g.idx] ?? "").trim();
      const priceStr = (row[g.priceIdx] ?? "").trim();
      if (!qtyStr) continue;
      const qty = parseInt(qtyStr.replace(/\D/g, ""), 10);
      if (!qty || qty <= 0) continue;
      if (!priceStr) continue;
      const priceCents = parsePriceCentsLoose(priceStr);
      if (!priceCents) continue;

      // Construire le titre : compacité + lisibilité
      const titleParts = [type, modelyear, screenSize, processor, ram, capacity].filter(
        (p) => p && p !== "nvt"
      );
      const title = `${titleParts.join(" ")} · ${g.label}`;

      offers.push({
        title,
        price_cents: priceCents, // déjà HT (sheet: "Prices are VAT excluded")
        currency: "EUR",
        condition: g.condition,
        warranty_months: 12, // Chapp garantit 1 an par défaut
        url: "https://docs.google.com/spreadsheets/d/1n3xjxiwVJsjD22mm5tX4E0lGuL_KR0_q9rNulPeb3b8/edit",
        stock_status: qty > 3 ? "in_stock" : "limited",
        captured_host: "chapp-gsheet",
        raw_specs: {
          source: "chapp_gsheet",
          grade: g.code,
          qty_available: qty,
          notes: notes || undefined,
          type,
          modelyear,
          screenSize,
          processor,
          ram,
          capacity,
          vat_excluded: true,
        },
      });
    }
  }

  console.log(`[Leazr][chapp] ${offers.length} offres depuis le Google Sheet`);
  return offers;
}

/** Parser CSV simple qui gère les guillemets et virgules échappées */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.length > 0 && row.some((x) => x.trim())) rows.push(row);
        row = [];
      } else {
        cur += c;
      }
    }
  }
  if (cur || row.length > 0) {
    row.push(cur);
    if (row.some((x) => x.trim())) rows.push(row);
  }
  return rows;
}

/** Parse "€ 449", "€ 1.449", "449 €", "1.449,99" en cents */
function parsePriceCentsLoose(text: string): number | null {
  const cleaned = text.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) normalized = cleaned.replace(/\./g, "").replace(",", ".");
    else normalized = cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    const after = cleaned.substring(lastComma + 1);
    if (after.length <= 2) normalized = cleaned.replace(",", ".");
    else normalized = cleaned.replace(/,/g, "");
  } else if (lastDot > -1) {
    const after = cleaned.substring(lastDot + 1);
    // "1.449" = 1449 (séparateur de milliers), "449.99" = 449.99 (décimal)
    if (after.length === 3) normalized = cleaned.replace(/\./g, "");
  }
  const n = parseFloat(normalized);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n * 100);
}
