// cfo-ai — CFO virtuel d'iTakecare. Ancré sur les données réelles :
// ventes (invoices), achats (supplier_invoices), rentabilité contrats
// (contracts + contract_equipment + credit_notes) et comptabilité Yuki si configurée.
// Actions :
//   report : rapport mensuel complet (stocké dans ai_reports, cron le 1er du mois)
//   alerts : alertes quotidiennes basées sur des règles (stockées si pertinentes)
//   chat   : question libre, réponse ancrée sur le contexte financier
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import { getYukiSession, yukiGLAccountBalance, summarizeBalance } from "../_shared/yuki.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-opus-4-8";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

async function anthropicCall(system: string, messages: Array<{ role: string; content: string }>, maxTokens = 8000): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY non configurée");
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages }),
    });
    if (resp.ok) {
      const data = await resp.json();
      console.log(`[cfo-ai] usage: ${JSON.stringify(data.usage)}`);
      return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
    }
    const t = await resp.text();
    lastErr = `Anthropic ${resp.status}: ${t.slice(0, 200)}`;
    if (![429, 500, 529].includes(resp.status)) throw new Error(lastErr);
  }
  throw new Error(lastErr);
}

// ---------- Contexte financier complet ----------
async function buildFinancialContext(supabase: any, companyId: string) {
  const year = new Date().getFullYear();
  const fromYear = `${year}-01-01`;

  const [salesQ, purchasesQ, contractsQ, equipmentQ, cnQ, offersQ] = await Promise.all([
    // PAS de filtre date ici : les marges par contrat ont besoin de TOUTES les
    // factures liées (sinon les contrats anciens comptent leurs coûts sans CA).
    // Les stats mensuelles sont filtrées plus bas.
    supabase.from("invoices")
      .select("amount, status, invoice_date, paid_at, due_date, leaser_name, contract_id")
      .eq("company_id", companyId),
    supabase.from("supplier_invoices")
      .select("supplier_name, invoice_date, due_date, amount_excl, to_pay, paid, overdue, days_overdue, category, doc_type")
      .eq("company_id", companyId).gte("invoice_date", fromYear),
    supabase.from("contracts")
      .select("id, contract_number, client_name, status, is_self_leasing, monthly_payment, contract_duration, offer_id, created_at")
      .eq("company_id", companyId),
    supabase.from("contract_equipment").select("contract_id, quantity, purchase_price, actual_purchase_price"),
    supabase.from("credit_notes")
      .select("amount, invoices!credit_notes_invoice_id_fkey!inner(contract_id, company_id)")
      .eq("invoices.company_id", companyId),
    supabase.from("offers").select("id, margin, commission").eq("company_id", companyId),
  ]);

  const sales = salesQ.data || [];
  const purchases = purchasesQ.data || [];

  // Ventes
  const salesByMonth: Record<string, number> = {};
  let unpaidClients = 0, unpaidClientsAmt = 0;
  const today = new Date().toISOString().slice(0, 10);
  for (const s of sales) {
    const d = (s.invoice_date || "");
    if (d >= fromYear) {
      const m = d.slice(0, 7);
      if (m) salesByMonth[m] = (salesByMonth[m] || 0) + (s.amount || 0);
    }
    if (s.status === "sent" && !s.paid_at) { unpaidClients++; unpaidClientsAmt += s.amount || 0; }
  }

  // Achats
  const purchByCat: Record<string, number> = {};
  const purchByMonth: Record<string, number> = {};
  let toPay = 0, overdueAmt = 0, overdueCount = 0;
  const overdueTop: any[] = [];
  for (const p of purchases) {
    const sign = p.doc_type === "credit_note" ? -1 : 1;
    const amt = (p.amount_excl || 0) * sign;
    purchByCat[p.category || "Non catégorisé"] = (purchByCat[p.category || "Non catégorisé"] || 0) + amt;
    const m = (p.invoice_date || "").slice(0, 7);
    if (m) purchByMonth[m] = (purchByMonth[m] || 0) + amt;
    if (!p.paid && p.doc_type === "invoice") toPay += p.to_pay || 0;
    if (p.overdue) { overdueAmt += p.to_pay || 0; overdueCount++; overdueTop.push({ f: p.supplier_name, m: p.to_pay, j: p.days_overdue }); }
  }
  overdueTop.sort((a, b) => (b.m || 0) - (a.m || 0));

  // Rentabilité par contrat
  const offerById = new Map((offersQ.data || []).map((o: any) => [o.id, o]));
  const eqBy = new Map<string, any[]>();
  for (const e of equipmentQ.data || []) { if (!eqBy.has(e.contract_id)) eqBy.set(e.contract_id, []); eqBy.get(e.contract_id)!.push(e); }
  const invBy = new Map<string, number>();
  for (const i of sales) if (i.contract_id && i.status !== "cancelled") invBy.set(i.contract_id, (invBy.get(i.contract_id) || 0) + (i.amount || 0));
  const cnBy = new Map<string, number>();
  for (const c of cnQ.data || []) { const cid = (c as any).invoices?.contract_id; if (cid) cnBy.set(cid, (cnBy.get(cid) || 0) + (c.amount || 0)); }

  const margins: any[] = [];
  for (const c of contractsQ.data || []) {
    if (c.status === "cancelled") continue;
    const rev = (invBy.get(c.id) || 0) - (cnBy.get(c.id) || 0);
    const eqs = eqBy.get(c.id) || [];
    let cost = 0;
    for (const e of eqs) cost += (e.actual_purchase_price ?? e.purchase_price ?? 0) * (e.quantity || 1);
    const commission = (offerById.get(c.offer_id) as any)?.commission || 0;
    if (rev || cost) margins.push({ n: c.contract_number, client: c.client_name, status: c.status, rev, cost, marge: rev - cost - commission });
  }
  margins.sort((a, b) => a.marge - b.marge);
  const totRev = margins.reduce((s, m) => s + m.rev, 0);
  const totMarge = margins.reduce((s, m) => s + m.marge, 0);
  const negatives = margins.filter((m) => m.rev > 0 && m.marge < 0);

  // Yuki (comptabilité) si configuré
  let yuki: any = null;
  try {
    const session = await getYukiSession(supabase, companyId);
    if (session?.administrationId) {
      const rows = await yukiGLAccountBalance(session.sessionId, session.administrationId, today);
      yuki = summarizeBalance(rows);
    }
  } catch (e) {
    yuki = { erreur: e instanceof Error ? e.message : "indisponible" };
  }

  return {
    date: today,
    ventes: {
      ca_htva_par_mois: salesByMonth,
      factures_clients_impayees: { nombre: unpaidClients, montant: unpaidClientsAmt },
    },
    achats: {
      par_categorie: purchByCat,
      par_mois: purchByMonth,
      reste_a_payer_tvac: toPay,
      en_retard: { nombre: overdueCount, montant: overdueAmt, top: overdueTop.slice(0, 10) },
    },
    rentabilite_contrats: {
      nb: margins.length,
      ca_total: totRev,
      marge_totale: totMarge,
      marge_pct: totRev ? (totMarge / totRev) * 100 : null,
      marges_negatives: negatives.slice(0, 10),
      top5: margins.slice(-5).reverse(),
      flop5: margins.slice(0, 5),
    },
    comptabilite_yuki: yuki,
  };
}

const CFO_SYSTEM =
  "Tu es le directeur financier (CFO) d'iTakecare, PME belge (~6 personnes) de leasing et vente de matériel IT reconditionné, " +
  "qui refinance ses contrats principalement chez GRENKE et fait aussi du self-leasing (loyers mensuels encaissés en direct). " +
  "Tu reçois les données financières réelles en JSON : ventes, achats (sync Billit/Peppol), rentabilité réelle par contrat, " +
  "et si disponible la comptabilité Yuki (PCMN belge : classe 6 charges, 7 produits, 55 trésorerie, 40 clients, 44 fournisseurs). " +
  "Sois direct, concret et chiffré. Pas de généralités creuses. Montants en €. Tu t'adresses au fondateur (Gianni).";

// ---------- actions ----------
async function actionReport(supabase: any, companyId: string) {
  const ctx = await buildFinancialContext(supabase, companyId);
  const period = new Date().toISOString().slice(0, 7);
  const content = await anthropicCall(
    CFO_SYSTEM,
    [{
      role: "user",
      content:
        `Rédige le rapport CFO mensuel (markdown) pour ${period}. Structure :\n` +
        "## Synthèse exécutive (5 lignes max)\n## Ventes & cash entrant\n## Dépenses & cash sortant (retards !)\n" +
        "## Rentabilité des contrats (marges réelles, contrats à problème)\n" +
        (ctx.comptabilite_yuki && !ctx.comptabilite_yuki.erreur ? "## Vue comptable (Yuki)\n" : "") +
        "## Risques & points d'attention\n## Plan d'action (5 actions max, priorisées, chiffrées)\n\n" +
        `Données réelles :\n${JSON.stringify(ctx)}`,
    }],
    10000,
  );
  const { data, error } = await supabase
    .from("ai_reports")
    .insert({ company_id: companyId, kind: "cfo_report", period, title: `Rapport CFO ${period}`, content, data: ctx })
    .select()
    .single();
  if (error) throw error;
  return { report: data };
}

async function actionAlerts(supabase: any, companyId: string) {
  const ctx = await buildFinancialContext(supabase, companyId);
  const facts: string[] = [];
  const a = ctx.achats, v = ctx.ventes, r = ctx.rentabilite_contrats;
  if (a.en_retard.montant > 1000) facts.push(`${a.en_retard.nombre} factures fournisseurs en retard pour ${a.en_retard.montant.toFixed(0)}€ (top: ${a.en_retard.top.slice(0, 3).map((t: any) => `${t.f} ${t.m?.toFixed(0)}€/${t.j}j`).join(", ")})`);
  if (v.factures_clients_impayees.montant > 2000) facts.push(`${v.factures_clients_impayees.nombre} factures clients envoyées non payées pour ${v.factures_clients_impayees.montant.toFixed(0)}€`);
  if (r.marges_negatives.length > 0) facts.push(`${r.marges_negatives.length} contrat(s) facturé(s) à marge négative: ${r.marges_negatives.slice(0, 3).map((m: any) => `${m.n || m.client} (${m.marge.toFixed(0)}€)`).join(", ")}`);
  const months = Object.entries(a.par_mois).sort();
  if (months.length >= 4) {
    const last3 = months.slice(-4, -1).map(([, val]) => val as number);
    const avg = last3.reduce((s, x) => s + x, 0) / 3;
    const cur = months[months.length - 1][1] as number;
    if (avg > 0 && cur > avg * 1.5) facts.push(`Dépenses du mois courant (${cur.toFixed(0)}€) à +${(((cur / avg) - 1) * 100).toFixed(0)}% vs moyenne des 3 mois précédents (${avg.toFixed(0)}€)`);
  }

  if (!facts.length) return { alerts: 0, message: "Aucune alerte" };

  // Anti-spam : pas plus d'une alerte par jour
  const todayStart = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("ai_reports").select("id").eq("company_id", companyId).eq("kind", "cfo_alert")
    .gte("created_at", todayStart).limit(1);
  if (existing?.length) return { alerts: facts.length, skipped: "déjà émise aujourd'hui" };

  const content = await anthropicCall(
    CFO_SYSTEM,
    [{
      role: "user",
      content: `Rédige une alerte CFO courte (markdown, max 15 lignes) à partir de ces faits, avec l'action recommandée pour chacun :\n- ${facts.join("\n- ")}`,
    }],
    2000,
  );
  await supabase.from("ai_reports").insert({
    company_id: companyId, kind: "cfo_alert", period: todayStart,
    title: `Alertes CFO ${todayStart}`, content, data: { facts },
  });
  return { alerts: facts.length };
}

async function actionChat(supabase: any, companyId: string, messages: Array<{ role: string; content: string }>) {
  const ctx = await buildFinancialContext(supabase, companyId);
  const system = `${CFO_SYSTEM}\n\nDonnées financières actuelles (réelles) :\n${JSON.stringify(ctx)}`;
  const answer = await anthropicCall(system, messages.slice(-12), 4000);
  return { answer };
}

// ---------- main ----------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Méthode non supportée" }, 405);

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin"],
      rateLimit: { endpoint: "cfo-ai", maxRequests: 15, windowSeconds: 60, identifierPrefix: "cfo-ai" },
    });
    if (!access.ok) return access.response;

    let payload: { companyId: string; action: string; messages?: Array<{ role: string; content: string }> };
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
    if (action === "report") result = await actionReport(supabase, companyId);
    else if (action === "alerts") result = await actionAlerts(supabase, companyId);
    else if (action === "chat") result = await actionChat(supabase, companyId, payload.messages || []);
    else return jsonResponse({ success: false, error: `Action inconnue: ${action}` }, 400);

    return jsonResponse({ success: true, action, ...(result as Record<string, unknown>) });
  } catch (error) {
    console.error("❌ cfo-ai:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
