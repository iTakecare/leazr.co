// cmo-ai — Directeur marketing virtuel d'iTakecare. Ancré sur les données réelles :
// acquisition (offers.source = canal d'origine déclaré, dernier contact), conversion
// (converted_to_contract / workflow_status), valeur (margin, financed_amount) et
// dépense publicitaire (supplier_invoices catégorie marketing).
// IMPORTANT : utm_source n'est PAS rempli en prod -> le canal fiable est offers.source.
// Actions :
//   report : rapport marketing mensuel (stocké dans ai_reports, cron le 1er du mois)
//   alerts : alertes hebdo basées sur des règles (CAC, canal sans conversion, dépendance)
//   chat   : question libre, réponse ancrée sur le contexte marketing
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

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
      console.log(`[cmo-ai] usage: ${JSON.stringify(data.usage)}`);
      return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
    }
    const t = await resp.text();
    lastErr = `Anthropic ${resp.status}: ${t.slice(0, 200)}`;
    if (![429, 500, 529].includes(resp.status)) throw new Error(lastErr);
  }
  throw new Error(lastErr);
}

// Canaux d'acquisition normalisés à partir de offers.source (valeurs réelles :
// meta, site_web/website, existing_client, recommendation, google, event, other, null).
const PAID = new Set(["meta", "google", "facebook", "instagram", "linkedin"]);
function channelOf(source: string | null): string {
  const s = (source || "").toLowerCase().trim();
  if (!s) return "Inconnu";
  if (s === "meta" || s === "facebook" || s === "instagram") return "Meta (Ads)";
  if (s === "google") return "Google (Ads)";
  if (s === "linkedin") return "LinkedIn";
  if (s === "site_web" || s === "website" || s === "web") return "Site web";
  if (s === "existing_client") return "Client existant";
  if (s === "recommendation") return "Recommandation";
  if (s === "event") return "Événement";
  if (s === "other") return "Autre";
  return s;
}
const isPaidSource = (source: string | null) => PAID.has((source || "").toLowerCase().trim());

// ---------- Contexte marketing complet ----------
async function buildMarketingContext(supabase: any, companyId: string) {
  const year = new Date().getFullYear();
  const fromYear = `${year}-01-01`;
  const today = new Date().toISOString().slice(0, 10);

  const [offersQ, spendQ] = await Promise.all([
    supabase.from("offers")
      .select("id, source, workflow_status, status, converted_to_contract, margin, financed_amount, monthly_payment, created_at, signed_at, client_id")
      .eq("company_id", companyId).gte("created_at", fromYear),
    supabase.from("supplier_invoices")
      .select("supplier_name, invoice_date, amount_excl, doc_type")
      .eq("company_id", companyId)
      .eq("category", "Frais de marketing et publicité")
      .gte("invoice_date", fromYear),
  ]);

  const offers = offersQ.data || [];
  const spend = spendQ.data || [];

  // Étapes du funnel (workflow_status réels)
  const isWon = (o: any) => o.converted_to_contract === true ||
    ["financed", "contract_signed", "invoicing", "accepted"].includes(o.workflow_status);
  const isRejected = (o: any) => ["internal_rejected", "leaser_rejected"].includes(o.workflow_status);
  const isDead = (o: any) => o.workflow_status === "without_follow_up";

  // Par canal
  type Ch = { canal: string; paid: boolean; leads: number; gagnees: number; marge_gagnees: number; finance_gagnees: number };
  const byChannel = new Map<string, Ch>();
  let totLeads = 0, totWon = 0, totMargeWon = 0;
  let paidLeads = 0, paidWon = 0, paidMargeWon = 0;
  for (const o of offers) {
    const canal = channelOf(o.source);
    const paid = isPaidSource(o.source);
    if (!byChannel.has(canal)) byChannel.set(canal, { canal, paid, leads: 0, gagnees: 0, marge_gagnees: 0, finance_gagnees: 0 });
    const c = byChannel.get(canal)!;
    c.leads++; totLeads++;
    if (paid) paidLeads++;
    if (isWon(o)) {
      c.gagnees++; totWon++;
      const marge = o.margin || 0;
      c.marge_gagnees += marge; totMargeWon += marge;
      c.finance_gagnees += o.financed_amount || 0;
      if (paid) { paidWon++; paidMargeWon += marge; }
    }
  }
  const canaux = [...byChannel.values()]
    .map((c) => ({ ...c, taux_conversion_pct: c.leads ? (c.gagnees / c.leads) * 100 : 0, marge_moy_par_gagnee: c.gagnees ? c.marge_gagnees / c.gagnees : 0 }))
    .sort((a, b) => b.leads - a.leads);

  // Funnel global
  const funnel = {
    offres_creees: offers.length,
    gagnees: offers.filter(isWon).length,
    rejetees: offers.filter(isRejected).length,
    sans_suite: offers.filter(isDead).length,
    en_cours: offers.filter((o: any) => !isWon(o) && !isRejected(o) && !isDead(o)).length,
    taux_conversion_global_pct: offers.length ? (offers.filter(isWon).length / offers.length) * 100 : 0,
  };

  // Dépense publicitaire
  let spendTotal = 0;
  const spendBySupplier: Record<string, number> = {};
  const spendByMonth: Record<string, number> = {};
  for (const s of spend) {
    const sign = s.doc_type === "credit_note" ? -1 : 1;
    const amt = (s.amount_excl || 0) * sign;
    spendTotal += amt;
    spendBySupplier[s.supplier_name || "Inconnu"] = (spendBySupplier[s.supplier_name || "Inconnu"] || 0) + amt;
    const m = (s.invoice_date || "").slice(0, 7);
    if (m) spendByMonth[m] = (spendByMonth[m] || 0) + amt;
  }
  const topSpend = Object.entries(spendBySupplier).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([f, m]) => ({ fournisseur: f, montant: m }));

  // Par mois : offres créées, gagnées, dépense
  const leadsByMonth: Record<string, number> = {};
  const wonByMonth: Record<string, number> = {};
  for (const o of offers) {
    const m = (o.created_at || "").slice(0, 7);
    if (!m) continue;
    leadsByMonth[m] = (leadsByMonth[m] || 0) + 1;
    if (isWon(o)) wonByMonth[m] = (wonByMonth[m] || 0) + 1;
  }
  const months = [...new Set([...Object.keys(leadsByMonth), ...Object.keys(spendByMonth)])].sort();
  const par_mois = months.map((m) => ({
    mois: m,
    offres: leadsByMonth[m] || 0,
    gagnees: wonByMonth[m] || 0,
    depense_pub: Math.round((spendByMonth[m] || 0) * 100) / 100,
  }));

  // CAC / ROAS — la dépense pub est quasi 100% canaux payants (Meta) -> on rapporte
  // au paid ET en "blended" (toute acquisition confondue).
  const cac_paid = paidWon ? spendTotal / paidWon : null;
  const cac_blended = totWon ? spendTotal / totWon : null;
  const roas_paid = spendTotal > 0 ? paidMargeWon / spendTotal : null; // marge générée / € dépensé

  return {
    date: today,
    periode: `${year}`,
    acquisition: {
      total_offres: totLeads,
      total_gagnees: totWon,
      marge_totale_gagnees: Math.round(totMargeWon),
      par_canal: canaux.map((c) => ({
        canal: c.canal,
        payant: c.paid,
        offres: c.leads,
        gagnees: c.gagnees,
        taux_conversion_pct: Math.round(c.taux_conversion_pct * 10) / 10,
        marge_gagnees: Math.round(c.marge_gagnees),
        marge_moy_par_gagnee: Math.round(c.marge_moy_par_gagnee),
        financement_gagnees: Math.round(c.finance_gagnees),
      })),
    },
    funnel: {
      offres_creees: funnel.offres_creees,
      en_cours: funnel.en_cours,
      gagnees: funnel.gagnees,
      rejetees: funnel.rejetees,
      sans_suite: funnel.sans_suite,
      taux_conversion_global_pct: Math.round(funnel.taux_conversion_global_pct * 10) / 10,
    },
    publicite: {
      depense_totale_htva: Math.round(spendTotal),
      nb_factures: spend.length,
      par_fournisseur: topSpend.map((s) => ({ ...s, montant: Math.round(s.montant) })),
    },
    performance: {
      offres_payantes: paidLeads,
      gagnees_payantes: paidWon,
      marge_gagnees_payantes: Math.round(paidMargeWon),
      cac_payant: cac_paid != null ? Math.round(cac_paid) : null,      // coût d'acquisition d'un client payant
      cac_blended: cac_blended != null ? Math.round(cac_blended) : null, // dépense pub / total clients gagnés
      roas_marge: roas_paid != null ? Math.round(roas_paid * 100) / 100 : null, // € de marge par € de pub
    },
    par_mois,
  };
}

const CMO_SYSTEM =
  "Tu es le directeur marketing (CMO) d'iTakecare, PME belge (~6 personnes) de leasing et vente de matériel IT reconditionné, en B2B uniquement. " +
  "Tu reçois les données marketing RÉELLES en JSON : acquisition par canal (champ source de l'offre = origine déclarée, dernier contact), " +
  "funnel de conversion (offre créée -> gagnée quand elle se transforme en contrat/financement), valeur (marge et montant financé des offres gagnées), " +
  "et dépense publicitaire (factures fournisseurs catégorie marketing, quasi exclusivement Meta Ads). " +
  "Note importante : les UTM ne sont pas remplis, l'attribution repose sur le champ 'source' (déclaratif, dernier canal). Le canal payant principal est Meta. " +
  "Indicateurs clés : CAC (coût d'acquisition = dépense pub / clients gagnés), ROAS en marge (€ de marge générés par € de pub), taux de conversion par canal, dépendance à un canal. " +
  "Sois direct, concret et chiffré. Pas de généralités creuses. Montants en €. Tu t'adresses au fondateur (Gianni).\n\n" +
  "RÈGLES DE FORMAT (impératif, le rendu est en markdown GFM) :\n" +
  "- Titres de section en '## ' courts.\n" +
  "- Paragraphes de 2-3 lignes MAX ; privilégie les listes à puces '- '.\n" +
  "- Mets les indicateurs clés en **gras**.\n" +
  "- Pour les chiffres, utilise de VRAIS tableaux markdown avec ligne d'en-tête ET séparateur, ex :\n" +
  "  | Canal | Offres | Gagnées | Conv. |\n  |---|--:|--:|--:|\n  | Meta | **271** | 30 | 11 % |\n" +
  "- JAMAIS de tableau en une seule ligne ni de longs blocs denses. Aère.\n" +
  "- Termine chaque section par une ou deux actions concrètes en gras.\n" +
  "- Sois honnête sur les limites de la donnée (attribution déclarative, pas de tracking clic/impression).";

// ---------- actions ----------
async function actionReport(supabase: any, companyId: string) {
  const ctx = await buildMarketingContext(supabase, companyId);
  const period = new Date().toISOString().slice(0, 7);
  const content = await anthropicCall(
    CMO_SYSTEM,
    [{
      role: "user",
      content:
        `Rédige le rapport CMO mensuel pour ${period}, clair et scannable en 1 minute. Sections EXACTES :\n\n` +
        "## 🎯 Synthèse exécutive\n3-4 puces : l'état de l'acquisition + LA priorité marketing du mois.\n\n" +
        "## 📥 Acquisition par canal\nTableau : Canal | Offres | Gagnées | Taux conv. | Marge gagnées. Commente le mix et la dépendance à un canal.\n\n" +
        "## 💸 Performance publicitaire\nDépense pub totale en gras, **CAC** (payant et blended) et **ROAS en marge**. Dis si la pub est rentable.\n\n" +
        "## 🔄 Conversion\nFunnel (créées → en cours → gagnées / rejetées / sans suite) + taux global. Où ça fuit ?\n\n" +
        "## ⚠️ Risques & angles morts\n2-4 puces (dépendance Meta, canaux sans conversion qui coûtent, attribution déclarative...).\n\n" +
        "## ✅ Plan d'action\nTableau priorisé : Priorité | Action | Impact attendu. Max 5 lignes.\n\n" +
        `Données réelles (JSON) :\n${JSON.stringify(ctx)}`,
    }],
    10000,
  );
  const { data, error } = await supabase
    .from("ai_reports")
    .insert({ company_id: companyId, kind: "cmo_report", period, title: `Rapport CMO ${period}`, content, data: ctx })
    .select()
    .single();
  if (error) throw error;
  return { report: data };
}

async function actionAlerts(supabase: any, companyId: string) {
  const ctx = await buildMarketingContext(supabase, companyId);
  const facts: string[] = [];
  const perf = ctx.performance, pub = ctx.publicite, acq = ctx.acquisition, fn = ctx.funnel;

  // Canal payant qui coûte mais ne convertit pas / mal
  for (const c of acq.par_canal) {
    if (c.payant && c.offres >= 10 && c.gagnees === 0) {
      facts.push(`Canal payant ${c.canal} : ${c.offres} offres et 0 gagnée — la dépense pub ne se transforme pas en contrats.`);
    }
  }
  // ROAS < 1 (la pub coûte plus qu'elle ne rapporte en marge)
  if (perf.roas_marge != null && pub.depense_totale_htva > 500 && perf.roas_marge < 1) {
    facts.push(`ROAS en marge à ${perf.roas_marge} (< 1) : ${pub.depense_totale_htva}€ de pub pour ${perf.marge_gagnees_payantes}€ de marge gagnée sur le payant.`);
  }
  // CAC élevé vs marge moyenne payante
  const paidChan = acq.par_canal.find((c: any) => c.canal === "Meta (Ads)") || acq.par_canal.find((c: any) => c.payant);
  if (perf.cac_payant != null && paidChan && paidChan.marge_moy_par_gagnee > 0 && perf.cac_payant > paidChan.marge_moy_par_gagnee) {
    facts.push(`CAC payant (${perf.cac_payant}€) supérieur à la marge moyenne d'une affaire gagnée payante (${paidChan.marge_moy_par_gagnee}€).`);
  }
  // Dépendance à un seul canal
  if (acq.total_offres > 0) {
    const top = acq.par_canal[0];
    if (top && top.offres / acq.total_offres > 0.6) {
      facts.push(`Dépendance forte : ${Math.round((top.offres / acq.total_offres) * 100)}% des offres viennent de ${top.canal}. Risque si ce canal se tarit.`);
    }
  }
  // Taux de conversion global faible
  if (fn.offres_creees >= 30 && fn.taux_conversion_global_pct < 8) {
    facts.push(`Taux de conversion global faible : ${fn.taux_conversion_global_pct}% (${fn.gagnees}/${fn.offres_creees}). ${fn.sans_suite} offres sans suite.`);
  }

  if (!facts.length) return { alerts: 0, message: "Aucune alerte" };

  // Anti-spam : pas plus d'une alerte par jour
  const todayStart = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from("ai_reports").select("id").eq("company_id", companyId).eq("kind", "cmo_alert")
    .gte("created_at", todayStart).limit(1);
  if (existing?.length) return { alerts: facts.length, skipped: "déjà émise aujourd'hui" };

  const content = await anthropicCall(
    CMO_SYSTEM,
    [{
      role: "user",
      content: `Rédige une alerte CMO courte (markdown, max 15 lignes) à partir de ces faits, avec l'action recommandée pour chacun :\n- ${facts.join("\n- ")}`,
    }],
    2000,
  );
  await supabase.from("ai_reports").insert({
    company_id: companyId, kind: "cmo_alert", period: todayStart,
    title: `Alertes CMO ${todayStart}`, content, data: { facts },
  });
  return { alerts: facts.length };
}

async function actionChat(supabase: any, companyId: string, messages: Array<{ role: string; content: string }>) {
  const ctx = await buildMarketingContext(supabase, companyId);
  const system = `${CMO_SYSTEM}\n\nDonnées marketing actuelles (réelles) :\n${JSON.stringify(ctx)}`;
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
      rateLimit: { endpoint: "cmo-ai", maxRequests: 15, windowSeconds: 60, identifierPrefix: "cmo-ai" },
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
    console.error("❌ cmo-ai:", error);
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
