// voice-coach — analyse hebdomadaire des transcriptions d'Alex et envoie par
// email des suggestions d'ajustement (ouverture + prompt système). PROPOSE-ONLY :
// rien n'est appliqué automatiquement. Cron hebdo, auth X-Cron-Secret.
// verify_jwt = false (voir config.toml).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_MODEL = "claude-opus-4-8";
const WINDOW_DAYS = 7;
const MAX_CALLS = 40;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("VOICE_CRON_SECRET");
  const provided = req.headers.get("X-Cron-Secret");
  if (!cronSecret || provided !== cronSecret) return json(401, { error: "unauthorized_cron" });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 86400 * 1000).toISOString();

  // Appels Alex (ElevenLabs) transcrits sur la fenêtre.
  const { data: calls } = await supabase
    .from("voice_calls")
    .select("company_id, to_phone, status, duration_seconds, created_at, transcription, metadata")
    .eq("provider", "elevenlabs")
    .not("transcription", "is", null)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  if (!calls || calls.length === 0) return json(200, { ok: true, analyzed: 0, reason: "no_calls" });

  // Groupe par société.
  const byCompany = new Map<string, any[]>();
  for (const c of calls) {
    if (!byCompany.has(c.company_id)) byCompany.set(c.company_id, []);
    byCompany.get(c.company_id)!.push(c);
  }

  let reports = 0;
  for (const [companyId, rows] of byCompany) {
    try {
      const html = await analyzeCompany(rows);
      if (!html) continue;
      const emails = await adminEmails(supabase, companyId);
      if (emails.length === 0) { console.log(`[voice-coach] no admin email for ${companyId}`); continue; }
      const sent = await sendReport(emails, rows.length, html);
      if (sent) reports++;
    } catch (e) {
      console.error("[voice-coach] company failed", companyId, e);
    }
  }

  return json(200, { ok: true, companies: byCompany.size, reports });
});

function stats(rows: any[]) {
  const n = rows.length;
  const voicemail = rows.filter((r) => r.status === "voicemail").length;
  const hangupShort = rows.filter((r) => (r.duration_seconds ?? 0) < 15 && r.status !== "voicemail").length;
  const real = rows.filter((r) => r.status === "completed" && (r.duration_seconds ?? 0) >= 20).length;
  const noAnswer = rows.filter((r) => r.status === "no_answer" || r.status === "busy").length;
  const avg = Math.round(rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / Math.max(1, n));
  return { n, voicemail, hangupShort, real, noAnswer, avg };
}

async function analyzeCompany(rows: any[]): Promise<string | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) { console.error("[voice-coach] ANTHROPIC_API_KEY manquante"); return null; }

  const s = stats(rows);
  const sample = rows.slice(0, MAX_CALLS).map((r, i) => {
    const summary = r.metadata?.analysis?.transcript_summary ?? "";
    return `--- Appel ${i + 1} | ${r.duration_seconds ?? 0}s | statut=${r.status} | docs demandés="${r.metadata?.missing_docs ?? ""}"\nRésumé: ${summary}\nTranscription:\n${(r.transcription ?? "").slice(0, 1400)}`;
  }).join("\n\n");

  const system = `Tu es coach qualité d'agents vocaux IA. Tu analyses les transcriptions d'appels de l'agent vocal "Alex" d'iTakecare (leasing informatique B2B). Alex appelle des clients pour récupérer leurs documents KYC manquants. Objectif d'un appel réussi : joindre un humain, lui rappeler ses documents manquants, lui envoyer le lien d'upload (WhatsApp/email), convenir d'un délai. Sur répondeur : laisser UN message court puis raccrocher (ne pas répondre aux menus à touches).

Tu produis un rapport en FRANÇAIS, en HTML simple (balises h3, p, ul, li, strong ; pas de <html>/<head>/<style>), structuré ainsi :
1. <h3>Bilan</h3> : 2-3 phrases sur la période.
2. <h3>Ce qui marche</h3> : patterns gagnants observés (cite des exemples).
3. <h3>Ce qui échoue</h3> : patterns d'échec (raccrochages, mauvaise gestion répondeur, objections non traitées…), avec la cause probable.
4. <h3>Ajustements proposés</h3> : 3 à 6 changements CONCRETS et actionnables du message d'ouverture et/ou du prompt système d'Alex, formulés prêts à appliquer (texte exact suggéré quand pertinent). Priorise par impact.
Sois précis, concis, basé uniquement sur les transcriptions fournies.`;

  const user = `Période : ${WINDOW_DAYS} derniers jours. Statistiques : ${s.n} appels — ${s.real} vraies conversations, ${s.voicemail} répondeurs, ${s.hangupShort} raccrochages <15s, ${s.noAnswer} sans réponse/occupé, durée moyenne ${s.avg}s.\n\nTranscriptions :\n\n${sample}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 4000, system, messages: [{ role: "user", content: user }] }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const text = (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
      const head = `<p style="color:#475569">Analyse de <strong>${s.n} appel(s)</strong> d'Alex sur les ${WINDOW_DAYS} derniers jours — ${s.real} conversations, ${s.voicemail} répondeurs, ${s.hangupShort} raccrochages rapides, durée moyenne ${s.avg}s.</p>`;
      return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:720px;margin:auto;color:#1e293b"><h2 style="color:#0f172a">Coach Alex — suggestions de la semaine</h2>${head}${text}<p style="color:#94a3b8;font-size:12px;margin-top:16px">Rapport généré automatiquement. Aucune modification n'a été appliquée — à vous de valider les ajustements dans ElevenLabs.</p></div>`;
    }
    if (![429, 500, 529].includes(resp.status)) {
      console.error("[voice-coach] anthropic", resp.status, (await resp.text()).slice(0, 200));
      return null;
    }
  }
  return null;
}

async function adminEmails(supabase: any, companyId: string): Promise<string[]> {
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["admin", "super_admin"]);
  const emails: string[] = [];
  for (const a of admins ?? []) {
    const { data: u } = await supabase.auth.admin.getUserById(a.id);
    if (u?.user?.email) emails.push(u.user.email);
  }
  return [...new Set(emails)];
}

async function sendReport(emails: string[], count: number, html: string): Promise<boolean> {
  const resendKey = Deno.env.get("ITAKECARE_RESEND_API");
  if (!resendKey) { console.error("[voice-coach] ITAKECARE_RESEND_API manquante"); return false; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({
      from: "iTakecare <noreply@itakecare.be>",
      to: emails,
      subject: `Coach Alex — ${count} appel(s) analysé(s) cette semaine`,
      html,
    }),
  });
  if (!res.ok) { console.error("[voice-coach] resend", await res.text()); return false; }
  return true;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
