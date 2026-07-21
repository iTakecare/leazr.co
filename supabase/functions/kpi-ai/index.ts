// kpi-ai — Analyste KPI dynamique de Leazr (onglet Gestion > Analyste KPI).
// L'IA interroge la base en direct (SQL lecture seule via la RPC kpi_run_query,
// périmètre société imposé) pour répondre à toute question chiffrée :
// délais de refus, motifs, taux de conversion, sans suite, etc.
// Actions :
//   chat   : question libre → boucle agentique (outils SQL) → réponse markdown
//   report : rapport structuré (JSON) prêt à être mis en page en PDF côté client
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-opus-4-8";
const MAX_ITERATIONS = 12;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

// ---------- Appel Anthropic (avec outils) ----------
async function anthropicRequest(body: Record<string, unknown>): Promise<any> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, ...body }),
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log(`[kpi-ai] usage: ${JSON.stringify(data.usage)}`);
      return data;
    }
    const t = await resp.text();
    lastErr = `Anthropic ${resp.status}: ${t.slice(0, 200)}`;
    if (![429, 500, 529].includes(resp.status)) throw new Error(lastErr);
  }
  throw new Error(lastErr);
}

// ---------- Outils ----------
const BASE_TOOLS = [
  {
    name: "list_tables",
    description: "Liste toutes les tables disponibles dans la base (schéma public).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "describe_tables",
    description: "Donne les colonnes (nom, type, nullable) d'une ou plusieurs tables. À utiliser AVANT d'écrire une requête si tu n'es pas certain des colonnes.",
    input_schema: {
      type: "object",
      properties: {
        tables: { type: "array", items: { type: "string" }, description: "Noms des tables à décrire" },
      },
      required: ["tables"],
    },
  },
  {
    name: "run_sql",
    description:
      "Exécute une requête SQL en LECTURE SEULE (SELECT/WITH uniquement, une seule instruction, max 200 lignes retournées). " +
      "Agrège au maximum en SQL (COUNT, SUM, AVG, percentile_cont, date_trunc...) plutôt que de rapatrier des lignes brutes. " +
      "OBLIGATOIRE : filtrer sur company_id (directement ou via jointure).",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "La requête SQL (PostgreSQL)" },
        purpose: { type: "string", description: "But de la requête, en une phrase courte en français" },
      },
      required: ["sql"],
    },
  },
];

const REPORT_TOOL = {
  name: "emit_report",
  description:
    "Émet le rapport final structuré. À appeler UNE SEULE FOIS, en toute fin, après avoir exécuté toutes les requêtes SQL nécessaires. " +
    "Toutes les valeurs doivent provenir des résultats SQL réels.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titre du rapport" },
      subtitle: { type: "string", description: "Sous-titre / question analysée" },
      period: { type: "string", description: "Période couverte, ex: 'Janvier – Juillet 2026'" },
      kpis: {
        type: "array",
        description: "4 à 8 indicateurs clés",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            value: { type: "string", description: "Valeur formatée, ex: '42 j', '12 500 €', '38 %'" },
            hint: { type: "string", description: "Précision courte optionnelle" },
          },
          required: ["label", "value"],
        },
      },
      sections: {
        type: "array",
        description: "Sections d'analyse détaillées",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            text: { type: "string", description: "Paragraphe d'analyse (texte simple, pas de markdown)" },
            bullets: { type: "array", items: { type: "string" } },
            table: {
              type: "object",
              properties: {
                columns: { type: "array", items: { type: "string" } },
                rows: { type: "array", items: { type: "array", items: { type: "string" } } },
              },
              required: ["columns", "rows"],
            },
          },
          required: ["heading"],
        },
      },
      recommendations: { type: "array", items: { type: "string" }, description: "Actions concrètes recommandées" },
    },
    required: ["title", "period", "kpis", "sections"],
  },
};

// ---------- Exécution des outils ----------
const IDENT_RE = /^[a-z_][a-z0-9_]*$/;

async function toolListTables(supabase: any): Promise<string> {
  const { data, error } = await supabase.rpc("kpi_run_query", {
    p_sql:
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
  });
  if (error) return `ERREUR: ${error.message}`;
  return JSON.stringify((data || []).map((r: any) => r.table_name));
}

async function toolDescribeTables(supabase: any, tables: string[]): Promise<string> {
  const safe = (tables || []).map((t) => String(t).toLowerCase().trim()).filter((t) => IDENT_RE.test(t));
  if (!safe.length) return "ERREUR: aucun nom de table valide";
  const list = safe.map((t) => `'${t}'`).join(",");
  const { data, error } = await supabase.rpc("kpi_run_query", {
    p_sql:
      `SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns ` +
      `WHERE table_schema = 'public' AND table_name IN (${list}) ORDER BY table_name, ordinal_position`,
  });
  if (error) return `ERREUR: ${error.message}`;
  const byTable: Record<string, string[]> = {};
  for (const r of data || []) {
    (byTable[r.table_name] ||= []).push(`${r.column_name} ${r.data_type}${r.is_nullable === "YES" ? "" : " NOT NULL"}`);
  }
  return JSON.stringify(byTable);
}

async function toolRunSql(supabase: any, companyId: string, sql: string): Promise<string> {
  if (!sql || typeof sql !== "string") return "ERREUR: requête vide";
  if (!sql.toLowerCase().includes(companyId.toLowerCase())) {
    return `ERREUR: la requête doit impérativement filtrer le périmètre société avec company_id = '${companyId}' (directement sur la table, ou via une jointure vers une table qui a company_id). Corrige la requête et réessaie.`;
  }
  const { data, error } = await supabase.rpc("kpi_run_query", { p_sql: sql });
  if (error) return `ERREUR SQL: ${error.message}`;
  const s = JSON.stringify(data ?? []);
  return s.length > 30000 ? s.slice(0, 30000) + "\n... [résultat tronqué — agrège davantage en SQL]" : s;
}

// ---------- Prompt système ----------
function buildSystem(companyId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return (
    `Tu es l'Analyste KPI de Leazr, la plateforme de leasing IT d'iTakecare (PME belge, leasing et vente de matériel IT reconditionné, refinancement principalement chez GRENKE + self-leasing). ` +
    `Tu t'adresses au fondateur (Gianni). Nous sommes le ${today}.\n\n` +
    `Tu as un accès SQL EN LECTURE SEULE à la base de production via l'outil run_sql. ` +
    `RÈGLE ABSOLUE : chaque requête doit filtrer company_id = '${companyId}' (directement ou via jointure).\n\n` +
    `CONNAISSANCE DU DOMAINE (tables clés) :\n` +
    `- offers = demandes/offres de leasing. Colonnes utiles : workflow_status (statut courant), rejection_category (motif de refus : fraud, young_company, private_client, financial_situation, other), amount, monthly_payment, coefficient, financed_amount, margin, commission, created_at, client_name, client_id, converted_to_contract, source, dossier_number, contract_duration.\n` +
    `- Statuts d'offres : morts = internal_rejected (refus interne), leaser_rejected (refus bailleur), without_follow_up (sans suite) ; gagnés = validated, offer_validation, financed ; intermédiaires = draft, sent, internal_review, internal_approved, internal_docs_requested, leaser_review, leaser_approved, leaser_docs_requested.\n` +
    `- offer_workflow_logs = historique horodaté des changements de statut (offer_id, previous_status, new_status, reason, sub_reason, created_at). C'est LA table pour les délais : délai avant refus = log.created_at - offers.created_at ; utiliser EXTRACT(EPOCH FROM ...)/86400 pour des jours.\n` +
    `- clients (fiche client : name, company, status, created_at...), contracts (contract_number, status, monthly_payment, contract_duration, leaser_name, client_name, offer_id, created_at), contract_equipment, contract_workflow_logs (même principe que offer_workflow_logs).\n` +
    `- invoices = factures de vente (amount, status, invoice_date, paid_at, due_date, contract_id, leaser_name) ; credit_notes ; supplier_invoices = achats (supplier_name, invoice_date, amount_excl, to_pay, paid, overdue, days_overdue, category, doc_type invoice|credit_note).\n` +
    `- offer_equipment (équipements d'une offre : title, purchase_price, quantity, margin), products (catalogue).\n\n` +
    `MÉTHODE :\n` +
    `- Si tu n'es pas sûr des colonnes → describe_tables. Si tu n'es pas sûr des valeurs d'un champ → SELECT DISTINCT rapide.\n` +
    `- Agrège en SQL (COUNT, SUM, AVG, percentile_cont, date_trunc, FILTER) : max 200 lignes retournées par requête.\n` +
    `- Donne moyennes ET médianes pour les délais quand c'est pertinent.\n` +
    `- Vérifie tes chiffres : si un résultat semble incohérent, refais une requête de contrôle.\n` +
    `- Sois transparent sur la période couverte et les éventuelles limites des données.\n\n` +
    `RÈGLES DE FORMAT des réponses de chat (markdown GFM) :\n` +
    `- Titres '## ' courts, paragraphes de 2-3 lignes max, listes à puces.\n` +
    `- Montants/indicateurs clés en **gras** (montants en €).\n` +
    `- Vrais tableaux markdown avec en-tête et séparateur pour les chiffres.\n` +
    `- Termine par une courte synthèse actionnable quand c'est pertinent.`
  );
}

// ---------- Boucle agentique ----------
interface ExecutedQuery {
  purpose: string;
  sql: string;
}

async function runAgent(
  supabase: any,
  companyId: string,
  messages: Array<{ role: string; content: unknown }>,
  opts: { withReportTool: boolean },
): Promise<{ text: string; queries: ExecutedQuery[]; report: unknown | null }> {
  const system = buildSystem(companyId);
  const tools = opts.withReportTool ? [...BASE_TOOLS, REPORT_TOOL] : BASE_TOOLS;
  const convo: Array<{ role: string; content: unknown }> = [...messages];
  const queries: ExecutedQuery[] = [];
  let report: unknown | null = null;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const data = await anthropicRequest({
      max_tokens: 6000,
      system,
      messages: convo,
      tools,
    });
    const content: any[] = data.content ?? [];
    const toolUses = content.filter((b) => b.type === "tool_use");

    if (data.stop_reason !== "tool_use" || !toolUses.length) {
      const text = content.filter((b) => b.type === "text").map((b) => b.text).join("");
      return { text, queries, report };
    }

    convo.push({ role: "assistant", content });
    const results: any[] = [];
    for (const tu of toolUses) {
      let out: string;
      try {
        if (tu.name === "list_tables") out = await toolListTables(supabase);
        else if (tu.name === "describe_tables") out = await toolDescribeTables(supabase, tu.input?.tables);
        else if (tu.name === "run_sql") {
          out = await toolRunSql(supabase, companyId, tu.input?.sql);
          if (!out.startsWith("ERREUR")) queries.push({ purpose: tu.input?.purpose || "", sql: tu.input?.sql || "" });
        } else if (tu.name === "emit_report") {
          report = tu.input;
          out = "Rapport reçu.";
        } else out = `ERREUR: outil inconnu ${tu.name}`;
      } catch (e) {
        out = `ERREUR: ${e instanceof Error ? e.message : String(e)}`;
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
    }
    convo.push({ role: "user", content: results });
    if (report) return { text: "", queries, report };
  }
  return { text: "L'analyse a dépassé le nombre maximal d'étapes. Reformule ta question de façon plus ciblée.", queries, report };
}

// ---------- Actions ----------
async function actionChat(supabase: any, companyId: string, messages: Array<{ role: string; content: string }>) {
  const clean = (messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12);
  if (!clean.length || clean[clean.length - 1].role !== "user") throw new Error("Le dernier message doit être une question de l'utilisateur");
  const { text, queries } = await runAgent(supabase, companyId, clean, { withReportTool: false });
  return { answer: text, queries };
}

async function actionReport(supabase: any, companyId: string, messages: Array<{ role: string; content: string }>, focus?: string) {
  const clean = (messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-12);
  const instruction =
    (clean.length
      ? "À partir de la conversation ci-dessus, produis un rapport d'analyse complet et rigoureux. Ré-exécute les requêtes SQL nécessaires pour disposer de chiffres exacts et complets (ne te fie pas uniquement aux réponses précédentes)."
      : "Produis un rapport d'analyse GÉNÉRAL de l'activité : volumes et statuts des demandes, taux de conversion, délais moyens/médians par étape, motifs de refus, sans suite, CA facturé, achats, marges. Exécute toutes les requêtes SQL nécessaires.") +
    (focus ? `\nFocus demandé : ${focus}` : "") +
    "\nQuand tu as tous les chiffres, appelle l'outil emit_report avec le rapport structuré final (valeurs formatées en français : '12 500 €', '38 %', '42 j'). N'écris pas le rapport en texte : uniquement via emit_report.";
  const convo = [...clean, { role: "user", content: instruction }];
  const { report, queries, text } = await runAgent(supabase, companyId, convo, { withReportTool: true });
  if (!report) throw new Error(text || "Le rapport n'a pas pu être généré");
  return { report, queries };
}

// ---------- main ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Méthode non supportée" }, 405);

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: { endpoint: "kpi-ai", maxRequests: 15, windowSeconds: 60, identifierPrefix: "kpi-ai" },
    });
    if (!access.ok) return access.response;

    let payload: {
      companyId: string;
      action: string;
      messages?: Array<{ role: string; content: string }>;
      focus?: string;
    };
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { companyId, action } = payload;
    if (!companyId || !action) return jsonResponse({ success: false, error: "companyId et action requis" }, 400);
    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== companyId
    ) {
      return jsonResponse({ success: false, error: "Cross-company access forbidden" }, 403);
    }

    const supabase = access.context.supabaseAdmin;

    let result: unknown;
    if (action === "chat") result = await actionChat(supabase, companyId, payload.messages || []);
    else if (action === "report") result = await actionReport(supabase, companyId, payload.messages || [], payload.focus);
    else return jsonResponse({ success: false, error: `Action inconnue: ${action}` }, 400);

    return jsonResponse({ success: true, action, ...(result as Record<string, unknown>) });
  } catch (error) {
    console.error("❌ kpi-ai:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
