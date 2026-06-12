// supplier-invoices-ai — IA pour la gestion des achats (table supplier_invoices).
// 3 actions :
//   - categorize : classe les factures d'achat non catégorisées (catégories compta BE)
//   - match     : suggère des liens lignes d'achat <-> contract_equipment (prix + modèle)
//   - analyze   : analyse les dépenses et produit des suggestions d'optimisation
// Sorties structurées via output_config.format (json_schema) — pas de parsing fragile.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-opus-4-8";

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
];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// Appel Anthropic avec retry/backoff sur 429/529/5xx (le cron tourne sans humain)
async function anthropicFetch(body: Record<string, unknown>): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log(`[supplier-invoices-ai] usage: ${JSON.stringify(data.usage)}`);
      return data;
    }
    const t = await resp.text();
    lastErr = `Anthropic ${resp.status}: ${t.slice(0, 300)}`;
    if (![429, 500, 529].includes(resp.status)) throw new Error(lastErr);
    console.warn(`[supplier-invoices-ai] retry ${attempt + 1}/3 après ${lastErr}`);
  }
  throw new Error(lastErr);
}

async function callClaudeJson(
  system: string,
  user: string,
  schema: Record<string, unknown>,
  maxTokens = 8000,
): Promise<any> {
  const data = await anthropicFetch({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema } },
  });
  const text = (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
  return JSON.parse(text);
}

async function callClaudeText(system: string, user: string, maxTokens = 6000): Promise<string> {
  const data = await anthropicFetch({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
}

// ---------- action: categorize ----------
async function actionCategorize(supabase: any, companyId: string) {
  // Bornage : max 2 lots de 60 par invocation (timeout edge function = 150s).
  // L'appelant reboucle tant que remaining > 0.
  const { data: uncategorized } = await supabase
    .from("supplier_invoices")
    .select("id, supplier_name, amount_excl, lines")
    .eq("company_id", companyId)
    .is("category", null)
    .limit(120);

  const items = uncategorized || [];
  if (!items.length) return { categorized: 0, remaining: 0 };

  const schema = {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            category: { type: "string", enum: PURCHASE_CATEGORIES },
          },
          required: ["id", "category"],
          additionalProperties: false,
        },
      },
    },
    required: ["results"],
    additionalProperties: false,
  };

  const system =
    "Tu es le comptable belge d'iTakecare (leasing/vente de matériel informatique reconditionné). " +
    "Classe chaque facture d'achat fournisseur dans UNE catégorie comptable. " +
    "Règles: matériel informatique/électronique destiné aux clients (MacBook, iPhone, PC, écrans, accessoires — Amazon, Coolblue, Media Markt, revendeurs) = 'Achat de marchandises'. " +
    "Meta/Google Ads = 'Frais de marketing et publicité'. ING/Belfius frais = 'Frais bancaires & financiers'. " +
    "Diesel/essence/parking/péage = 'Carburant & déplacements'. SaaS/abonnements logiciels/API/hébergement = 'Logiciels & services IT'. " +
    "bpost/transporteurs/emballage = 'Logistique & transport'.";

  let categorized = 0;
  const batchSize = 60;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const userMsg = JSON.stringify(
      batch.map((inv: any) => ({
        id: inv.id,
        fournisseur: inv.supplier_name,
        montant_htva: inv.amount_excl,
        lignes: (inv.lines || []).slice(0, 4).map((l: any) => l.description).filter(Boolean),
      })),
    );
    const out = await callClaudeJson(system, `Catégorise ces factures d'achat:\n${userMsg}`, schema, 8000);
    for (const r of out.results || []) {
      if (!PURCHASE_CATEGORIES.includes(r.category)) continue;
      const { error } = await supabase
        .from("supplier_invoices")
        .update({ category: r.category, category_source: "ai", updated_at: new Date().toISOString() })
        .eq("id", r.id)
        .eq("company_id", companyId);
      if (!error) categorized++;
    }
  }

  const { count: remaining } = await supabase
    .from("supplier_invoices")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("category", null);

  return { categorized, remaining: remaining || 0 };
}

// ---------- action: match ----------
const normTokens = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9àâäéèêëïîôöùûüç ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

// Extrait les n° de série exploitables d'un équipement (champ string ou tableau JSON)
function serialTokens(eq: any): string[] {
  const out: string[] = [];
  for (const v of [eq.serial_number, eq.individual_serial_number]) {
    if (!v) continue;
    let arr: any[] = [];
    if (Array.isArray(v)) arr = v;
    else if (typeof v === "string") {
      try { const p = JSON.parse(v); arr = Array.isArray(p) ? p : [v]; } catch { arr = [v]; }
    }
    for (const s of arr) {
      const t = String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (t.length >= 6 && !/^0+$/.test(t)) out.push(t);
    }
  }
  return out;
}

function daysBetweenISO(a?: string, b?: string): number {
  if (!a || !b) return 9999;
  return Math.abs((new Date(a).getTime() - new Date(b).getTime()) / 86400000);
}

interface Discriminators { snMatch: boolean; dateDeltaDays: number; reconciled: boolean }

function heuristicScore(lineDesc: string, linePrice: number, invoiceDate: string | null, eq: any): { score: number; disc: Discriminators } {
  const lt = new Set(normTokens(lineDesc));
  const et = normTokens(eq.title || "");
  if (!et.length || !lt.size) return { score: 0, disc: { snMatch: false, dateDeltaDays: 9999, reconciled: false } };
  const overlap = et.filter((t) => lt.has(t)).length / et.length;
  const price = eq.purchase_price || 0;
  let priceScore = 0;
  if (price > 0 && linePrice > 0) {
    const diff = Math.abs(price - linePrice) / Math.max(price, linePrice);
    priceScore = diff <= 0.02 ? 1 : diff <= 0.1 ? 0.7 : diff <= 0.25 ? 0.4 : 0;
  }
  // n° de série présent dans la ligne de facture = verrou
  const lineUpper = (lineDesc || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const snMatch = serialTokens(eq).some((sn) => lineUpper.includes(sn));
  // proximité de date (date facture vs date d'achat/réception réelle)
  const dateDeltaDays = Math.min(
    daysBetweenISO(invoiceDate || undefined, eq.actual_purchase_date),
    daysBetweenISO(invoiceDate || undefined, eq.reception_date),
    daysBetweenISO(invoiceDate || undefined, eq.order_date),
  );
  const reconciled = eq.actual_purchase_price != null;
  let base = overlap * 0.55 + priceScore * 0.35;
  if (dateDeltaDays <= 30) base += 0.15; else if (dateDeltaDays <= 90) base += 0.05;
  if (reconciled) base -= 0.2;   // déjà réconcilié -> dé-prioriser
  if (snMatch) base = 1;          // verrou n° de série
  return { score: Math.max(0, Math.round(base * 100)), disc: { snMatch, dateDeltaDays, reconciled } };
}

async function actionMatch(supabase: any, companyId: string, invoiceId?: string) {
  // Factures d'achat de marchandises avec lignes
  let q = supabase
    .from("supplier_invoices")
    .select("id, invoice_number, supplier_name, invoice_date, lines")
    .eq("company_id", companyId)
    .eq("doc_type", "invoice")
    .eq("category", "Achat de marchandises");
  if (invoiceId) q = q.eq("id", invoiceId);
  const { data: invoices } = await q;

  // Équipements de contrats (candidats) + signaux de désambiguïsation
  const { data: equipment } = await supabase
    .from("contract_equipment")
    .select("id, title, purchase_price, quantity, serial_number, individual_serial_number, actual_purchase_price, actual_purchase_date, reception_date, order_date, contract_id, contracts!inner(contract_number, client_name, company_id)")
    .eq("contracts.company_id", companyId);

  // Matches existants (éviter les doublons)
  const { data: existingMatches } = await supabase
    .from("supplier_invoice_matches")
    .select("supplier_invoice_id, line_index, contract_equipment_id")
    .eq("company_id", companyId);
  const existingKeys = new Set(
    (existingMatches || []).map((m: any) => `${m.supplier_invoice_id}|${m.line_index}|${m.contract_equipment_id}`),
  );

  // Lignes déjà traitées (au moins une suggestion existante) -> on ne les re-examine pas
  const linesWithMatch = new Set(
    (existingMatches || []).map((m: any) => `${m.supplier_invoice_id}|${m.line_index}`),
  );

  // Candidats heuristiques par ligne
  type Cand = { invoice: any; lineIndex: number; line: any; candidates: any[] };
  const work: Cand[] = [];
  for (const inv of invoices || []) {
    (inv.lines || []).forEach((line: any, lineIndex: number) => {
      const price = line.unit_price_excl || 0;
      if (!line.description || price < 20) return; // ignorer les petites lignes (frais, etc.)
      if (linesWithMatch.has(`${inv.id}|${lineIndex}`)) return; // déjà suggérée
      const cands = (equipment || [])
        .map((eq: any) => { const h = heuristicScore(line.description, price, inv.invoice_date, eq); return { eq, score: h.score, disc: h.disc }; })
        .filter((c: any) => c.score >= 35)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);
      if (cands.length) work.push({ invoice: inv, lineIndex, line, candidates: cands });
    });
  }

  if (!work.length) return { suggestions: 0, lines_examined: 0, lines_remaining: 0 };

  // Bornage par invocation (timeout edge function 150s) — l'appelant reboucle.
  const CAP = 100;
  const totalWork = work.length;
  const bounded = work.slice(0, CAP);

  // Validation IA par lots
  const schema = {
    type: "object",
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            equipment_id: { type: "string" },
            confident: { type: "boolean" },
            score: { type: "integer" },
            reason: { type: "string" },
          },
          required: ["key", "equipment_id", "confident", "score", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["matches"],
    additionalProperties: false,
  };

  const system =
    "Tu rapproches des lignes de factures d'achat fournisseur avec les équipements des contrats de leasing d'iTakecare. " +
    "ATTENTION : iTakecare achète souvent le MÊME modèle (ex. 20 'HP ProBook 460 G11' au même prix) pour des clients différents. " +
    "Le modèle + le prix ne suffisent donc JAMAIS à identifier l'unité précise.\n" +
    "Règles :\n" +
    "- confident=true UNIQUEMENT si tu identifies l'UNITÉ précise via : sn_match=true (n° de série de la facture), OU date_delta_jours faible (achat cohérent avec la date facture) ET reconcilie=false.\n" +
    "- Si plusieurs candidats ont le même modèle et un prix proche SANS élément distinctif (pas de sn_match, dates incohérentes), renvoie-les TOUS (jusqu'à 3) avec confident=false et reason='Plusieurs unités identiques — choisir le bon contrat'.\n" +
    "- Préfère les équipements reconcilie=false (pas encore de prix réel) et date_delta_jours faible.\n" +
    "- N'invente jamais : si aucun candidat ne convient, ne renvoie rien pour cette ligne.\n" +
    "Tu peux renvoyer plusieurs objets pour une même 'key' (un par candidat). score 0-100, reason en français.";

  let suggestions = 0;
  const batchSize = 20;
  for (let i = 0; i < bounded.length; i += batchSize) {
    const batch = bounded.slice(i, i + batchSize);
    const userMsg = JSON.stringify(
      batch.map((w, bi) => ({
        key: `${i + bi}`,
        facture: w.invoice.invoice_number,
        fournisseur: w.invoice.supplier_name,
        date_facture: w.invoice.invoice_date,
        ligne: w.line.description,
        prix_unitaire_htva: w.line.unit_price_excl,
        candidats: w.candidates.map((c: any) => ({
          equipment_id: c.eq.id,
          titre: c.eq.title,
          prix_achat_prevu: c.eq.purchase_price,
          reconcilie: !!c.eq.actual_purchase_price,
          sn_match: c.disc.snMatch,
          date_delta_jours: c.disc.dateDeltaDays >= 9999 ? null : Math.round(c.disc.dateDeltaDays),
          contrat: c.eq.contracts?.contract_number,
          client: c.eq.contracts?.client_name,
        })),
      })),
    );
    const out = await callClaudeJson(system, `Rapproche (désambiguïse par n° série / date) :\n${userMsg}`, schema, 12000);
    // Limiter à 3 candidats par ligne
    const perLine: Record<string, number> = {};
    for (const m of out.matches || []) {
      const w = bounded[parseInt(m.key, 10)] ?? null;
      if (!w) continue;
      const cand = w.candidates.find((c: any) => c.eq.id === m.equipment_id);
      if (!cand) continue;
      const lineKey = `${w.invoice.id}|${w.lineIndex}`;
      if ((perLine[lineKey] || 0) >= 3) continue;
      const key = `${w.invoice.id}|${w.lineIndex}|${m.equipment_id}`;
      if (existingKeys.has(key)) continue;
      const reason = m.confident ? m.reason : (m.reason || "Plusieurs unités identiques — choisir le bon contrat");
      const { error } = await supabase.from("supplier_invoice_matches").insert({
        company_id: companyId,
        supplier_invoice_id: w.invoice.id,
        contract_equipment_id: m.equipment_id,
        line_index: w.lineIndex,
        line_description: w.line.description,
        amount: w.line.unit_price_excl,
        score: Math.max(0, Math.min(100, m.score)),
        reason,
        status: "suggested",
      });
      if (!error) { suggestions++; existingKeys.add(key); perLine[lineKey] = (perLine[lineKey] || 0) + 1; }
    }
  }

  return { suggestions, lines_examined: bounded.length, lines_remaining: Math.max(0, totalWork - bounded.length) };
}

// ---------- action: analyze ----------
async function actionAnalyze(supabase: any, companyId: string, fromDate: string) {
  const { data: invoices } = await supabase
    .from("supplier_invoices")
    .select("supplier_name, invoice_date, due_date, amount_excl, amount_incl, to_pay, paid, overdue, days_overdue, category, doc_type")
    .eq("company_id", companyId)
    .gte("invoice_date", fromDate);

  const rows = invoices || [];
  const sign = (r: any) => (r.doc_type === "credit_note" ? -1 : 1);

  const byCategory: Record<string, number> = {};
  const byMonth: Record<string, number> = {};
  const bySupplier: Record<string, number> = {};
  let toPay = 0, overdueAmt = 0, overdueCount = 0;
  for (const r of rows) {
    const amt = (r.amount_excl || 0) * sign(r);
    byCategory[r.category || "Non catégorisé"] = (byCategory[r.category || "Non catégorisé"] || 0) + amt;
    const month = (r.invoice_date || "").slice(0, 7);
    if (month) byMonth[month] = (byMonth[month] || 0) + amt;
    if (r.supplier_name) bySupplier[r.supplier_name] = (bySupplier[r.supplier_name] || 0) + amt;
    if (!r.paid && r.doc_type === "invoice") toPay += r.to_pay || 0;
    if (r.overdue) { overdueAmt += r.to_pay || 0; overdueCount++; }
  }
  const topSuppliers = Object.entries(bySupplier).sort((a, b) => b[1] - a[1]).slice(0, 15);

  const system =
    "Tu es directeur financier conseil pour iTakecare (PME belge, leasing/vente de matériel IT reconditionné, ~6 personnes). " +
    "Analyse les dépenses et donne des recommandations CONCRÈTES et actionnables en français. " +
    "Structure en markdown: ## Vue d'ensemble (2-3 phrases), ## Points d'attention (retards, postes anormaux), " +
    "## Optimisations possibles (3-6 recommandations chiffrées si possible: doublons d'abonnements, renégociations, récurrents qui montent), ## Priorités (top 3 actions). " +
    "Sois direct, pas de généralités creuses.";

  const userMsg = JSON.stringify({
    periode_depuis: fromDate,
    total_depenses_htva: Object.values(byCategory).reduce((s, v) => s + v, 0),
    reste_a_payer_tvac: toPay,
    en_retard: { montant: overdueAmt, nombre: overdueCount },
    par_categorie: byCategory,
    par_mois: byMonth,
    top_fournisseurs: Object.fromEntries(topSuppliers),
  });

  const analysis = await callClaudeText(system, `Analyse ces dépenses:\n${userMsg}`, 6000);
  return { analysis };
}

// ---------- main ----------
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
        endpoint: "supplier-invoices-ai",
        maxRequests: 10,
        windowSeconds: 60,
        identifierPrefix: "supplier-invoices-ai",
      },
    });
    if (!access.ok) return access.response;

    let payload: { companyId: string; action: string; invoiceId?: string; fromDate?: string };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { companyId, action } = payload;
    if (!companyId || !action) {
      return jsonResponse({ success: false, error: "companyId et action requis" }, 400);
    }
    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== companyId
    ) {
      return jsonResponse({ success: false, error: "Cross-company access forbidden" }, 403);
    }

    const supabase = access.context.supabaseAdmin;
    const fromDate = payload.fromDate || "2026-01-01";

    let result: unknown;
    if (action === "categorize") result = await actionCategorize(supabase, companyId);
    else if (action === "match") result = await actionMatch(supabase, companyId, payload.invoiceId);
    else if (action === "analyze") result = await actionAnalyze(supabase, companyId, fromDate);
    else return jsonResponse({ success: false, error: `Action inconnue: ${action}` }, 400);

    return jsonResponse({ success: true, action, ...(result as Record<string, unknown>) });
  } catch (error) {
    console.error("❌ supplier-invoices-ai:", error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});
