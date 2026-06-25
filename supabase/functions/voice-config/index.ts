// voice-config — configuration de l'agent vocal Alex (ElevenLabs Convai) +
// dialogue avec le « Coach Alex ». Admin only.
//
// Actions :
//   - get_agent    : lit le prompt système, le message d'ouverture, la langue et
//                    les paramètres TTS/LLM de l'agent Alex depuis ElevenLabs.
//   - update_agent : applique les modifications (prompt, ouverture, voix, modèle…).
//   - list_reports : derniers rapports du Coach Alex (table voice_coach_reports).
//   - run_coach    : lance MAINTENANT l'analyse des transcriptions récentes et
//                    persiste un rapport (sans email).
//   - coach_chat   : dialogue avec le coach (Claude) — contexte = prompt actuel +
//                    transcriptions récentes + dernier rapport. Le coach peut
//                    proposer un prompt complet prêt à appliquer (bloc ```prompt```).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import { ElevenLabsError, getConvaiAgent, patchConvaiAgent } from "../_shared/elevenlabs.ts";

const ANTHROPIC_MODEL = "claude-opus-4-8";
const WINDOW_DAYS = 7;
const MAX_CALLS = 40;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const security = await requireElevatedAccess(req, corsHeaders, {
    rateLimit: { endpoint: "voice-config", maxRequests: 120, windowSeconds: 3600, identifierPrefix: "voice" },
  });
  if (!security.ok) return security.response;
  const { supabaseAdmin, userId, companyId } = security.context;

  let payload: any;
  try { payload = await req.json(); } catch { return json(400, { error: "invalid_json" }); }
  const action = payload?.action;

  const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");

  try {
    switch (action) {
      case "get_agent": {
        if (!agentId) return json(500, { error: "elevenlabs_not_configured" });
        const agent = await getConvaiAgent(agentId);
        return json(200, { ok: true, config: extractConfig(agent) });
      }

      case "update_agent": {
        if (!agentId) return json(500, { error: "elevenlabs_not_configured" });
        const agent = await getConvaiAgent(agentId);
        const curPrompt = agent?.conversation_config?.agent?.prompt ?? {};
        const u = payload.updates ?? {};

        // PATCH MINIMAL : on n'envoie QUE les champs modifiés (ElevenLabs fait un
        // deep-merge). On n'échoit jamais le champ legacy `prompt.tools` (déprécié
        // → rejeté à l'écriture) ni les champs read-only de la réponse GET.
        const promptPatch: Record<string, unknown> = {};
        const agentPatch: Record<string, unknown> = {};
        const ttsPatch: Record<string, unknown> = {};

        if (typeof u.system_prompt === "string") promptPatch.prompt = u.system_prompt;
        if (typeof u.llm === "string") promptPatch.llm = u.llm;
        if (typeof u.temperature === "number") promptPatch.temperature = u.temperature;
        if (typeof u.first_message === "string") agentPatch.first_message = u.first_message;
        if (typeof u.language === "string") agentPatch.language = u.language;
        if (typeof u.voice_id === "string") ttsPatch.voice_id = u.voice_id;
        if (typeof u.tts_model_id === "string") ttsPatch.model_id = u.tts_model_id;
        if (typeof u.stability === "number") ttsPatch.stability = u.stability;
        if (typeof u.speed === "number") ttsPatch.speed = u.speed;
        if (typeof u.similarity_boost === "number") ttsPatch.similarity_boost = u.similarity_boost;

        if (typeof u.language_detection === "boolean") {
          // On renvoie la map built_in_tools COMPLÈTE (clés existantes échoées +
          // language_detection togglé) → préserve transfer_to_number/voicemail_detection.
          const cur = (curPrompt.built_in_tools && typeof curPrompt.built_in_tools === "object")
            ? curPrompt.built_in_tools : {};
          const bit: Record<string, unknown> = { ...cur };
          bit.language_detection = u.language_detection
            ? (cur.language_detection ?? { ...LANGUAGE_DETECTION_TOOL })
            : null;
          promptPatch.built_in_tools = bit;
        }

        if (Object.keys(promptPatch).length) agentPatch.prompt = promptPatch;
        const ccPatch: Record<string, unknown> = {};
        if (Object.keys(agentPatch).length) ccPatch.agent = agentPatch;
        if (Object.keys(ttsPatch).length) ccPatch.tts = ttsPatch;

        const updated = await patchConvaiAgent(agentId, { conversation_config: ccPatch });
        return json(200, { ok: true, config: extractConfig(updated) });
      }

      case "list_reports": {
        const { data } = await supabaseAdmin
          .from("voice_coach_reports")
          .select("id, source, window_days, calls_analyzed, stats, html, summary, created_at")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(12);
        return json(200, { ok: true, reports: data ?? [] });
      }

      case "run_coach": {
        const result = await runCoach(supabaseAdmin, companyId, userId);
        return json(200, { ok: true, ...result });
      }

      case "coach_chat": {
        const messages = Array.isArray(payload.messages) ? payload.messages : [];
        const text = await coachChat(supabaseAdmin, companyId, agentId, messages);
        return json(200, { ok: true, reply: text });
      }

      default:
        return json(400, { error: "unknown_action" });
    }
  } catch (e) {
    if (e instanceof ElevenLabsError) {
      console.error("[voice-config] elevenlabs", e.status, e.body);
      return json(502, { error: "elevenlabs_error", status: e.status, detail: e.body });
    }
    console.error("[voice-config] failed", e);
    return json(500, { error: "internal_error", detail: String(e) });
  }
});

// Extrait une vue éditable (et lisible) de la config de l'agent.
function extractConfig(agent: any) {
  const cc = agent?.conversation_config ?? {};
  const a = cc.agent ?? {};
  const prompt = a.prompt ?? {};
  const tts = cc.tts ?? {};

  // Langues : défaut (agent.language) + langues additionnelles (language_presets).
  const defaultLang = a.language ?? "fr";
  const presetLangs = Object.keys(cc.language_presets ?? {});
  const supported_languages = [...new Set([defaultLang, ...presetLangs])];

  return {
    name: agent?.name ?? "Alex",
    system_prompt: prompt.prompt ?? "",
    first_message: a.first_message ?? "",
    language: defaultLang,
    supported_languages,
    language_detection_enabled: hasLanguageDetection(prompt),
    llm: prompt.llm ?? "",
    temperature: typeof prompt.temperature === "number" ? prompt.temperature : null,
    voice_id: tts.voice_id ?? "",
    tts_model_id: tts.model_id ?? "",
    stability: typeof tts.stability === "number" ? tts.stability : null,
    speed: typeof tts.speed === "number" ? tts.speed : null,
    similarity_boost: typeof tts.similarity_boost === "number" ? tts.similarity_boost : null,
    tools: (prompt.tools ?? []).map((t: any) => t?.name ?? t?.type ?? "tool"),
  };
}

// Le tool système `language_detection` peut vivre dans built_in_tools (objet, API
// actuelle) ou dans le tableau legacy prompt.tools. On lit/écrit les deux par
// prudence (l'agent Alex expose encore le tableau legacy).
function hasLanguageDetection(prompt: any): boolean {
  const bit = prompt?.built_in_tools;
  if (bit && bit.language_detection) return true;
  const legacy = prompt?.tools;
  if (Array.isArray(legacy) && legacy.some((t: any) => (t?.name ?? t?.type) === "language_detection")) return true;
  return false;
}

const LANGUAGE_DETECTION_TOOL = { name: "language_detection", params: { system_tool_type: "language_detection" } };

// --- Coach Alex : récupération des transcriptions + stats sur la fenêtre. ------
async function fetchCalls(supabase: any, companyId: string | null) {
  const sinceIso = new Date(Date.now() - WINDOW_DAYS * 86400 * 1000).toISOString();
  let q = supabase
    .from("voice_calls")
    .select("company_id, status, duration_seconds, created_at, transcription, metadata")
    .eq("provider", "elevenlabs")
    .not("transcription", "is", null)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });
  if (companyId) q = q.eq("company_id", companyId);
  const { data } = await q;
  return data ?? [];
}

function stats(rows: any[]) {
  const n = rows.length;
  const voicemail = rows.filter((r) => r.status === "voicemail").length;
  const hangupShort = rows.filter((r) => (r.duration_seconds ?? 0) < 15 && r.status !== "voicemail").length;
  const real = rows.filter((r) => r.status === "completed" && (r.duration_seconds ?? 0) >= 20).length;
  const noAnswer = rows.filter((r) => r.status === "no_answer" || r.status === "busy").length;
  const avg = Math.round(rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / Math.max(1, n));
  return { n, voicemail, hangupShort, real, noAnswer, avg };
}

function sampleTranscripts(rows: any[]) {
  return rows.slice(0, MAX_CALLS).map((r, i) => {
    const summary = r.metadata?.analysis?.transcript_summary ?? "";
    return `--- Appel ${i + 1} | ${r.duration_seconds ?? 0}s | statut=${r.status} | docs demandés="${r.metadata?.missing_docs ?? ""}"\nRésumé: ${summary}\nTranscription:\n${(r.transcription ?? "").slice(0, 1400)}`;
  }).join("\n\n");
}

async function callAnthropic(system: string, messages: { role: string; content: string }[], maxTokens = 4000): Promise<string | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) { console.error("[voice-config] ANTHROPIC_API_KEY manquante"); return null; }
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages }),
    });
    if (resp.ok) {
      const data = await resp.json();
      return (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
    }
    if (![429, 500, 529].includes(resp.status)) {
      console.error("[voice-config] anthropic", resp.status, (await resp.text()).slice(0, 200));
      return null;
    }
  }
  return null;
}

const COACH_SYSTEM_BASE = `Tu es coach qualité d'agents vocaux IA. Tu analyses les transcriptions d'appels de l'agent vocal "Alex" d'iTakecare (leasing informatique B2B). Alex appelle des clients pour récupérer leurs documents KYC manquants. Objectif d'un appel réussi : joindre un humain, lui rappeler ses documents manquants, lui envoyer le lien d'upload (WhatsApp/email), convenir d'un délai. Sur répondeur : laisser UN message court puis raccrocher (ne pas répondre aux menus à touches).`;

async function runCoach(supabase: any, companyId: string | null, userId: string | null) {
  const rows = await fetchCalls(supabase, companyId);
  if (rows.length === 0) return { analyzed: 0, reason: "no_calls" };
  const s = stats(rows);
  const system = `${COACH_SYSTEM_BASE}

Tu produis un rapport en FRANÇAIS, en HTML simple (balises h3, p, ul, li, strong ; pas de <html>/<head>/<style>), structuré ainsi :
1. <h3>Bilan</h3> : 2-3 phrases sur la période.
2. <h3>Ce qui marche</h3> : patterns gagnants observés (cite des exemples).
3. <h3>Ce qui échoue</h3> : patterns d'échec (raccrochages, mauvaise gestion répondeur, objections non traitées…), avec la cause probable.
4. <h3>Ajustements proposés</h3> : 3 à 6 changements CONCRETS et actionnables du message d'ouverture et/ou du prompt système d'Alex, formulés prêts à appliquer (texte exact suggéré quand pertinent). Priorise par impact.
Sois précis, concis, basé uniquement sur les transcriptions fournies.`;
  const user = `Période : ${WINDOW_DAYS} derniers jours. Statistiques : ${s.n} appels — ${s.real} vraies conversations, ${s.voicemail} répondeurs, ${s.hangupShort} raccrochages <15s, ${s.noAnswer} sans réponse/occupé, durée moyenne ${s.avg}s.\n\nTranscriptions :\n\n${sampleTranscripts(rows)}`;

  const text = await callAnthropic(system, [{ role: "user", content: user }]);
  if (!text) return { analyzed: 0, reason: "anthropic_failed" };

  const head = `<p style="color:#475569">Analyse de <strong>${s.n} appel(s)</strong> d'Alex sur les ${WINDOW_DAYS} derniers jours — ${s.real} conversations, ${s.voicemail} répondeurs, ${s.hangupShort} raccrochages rapides, durée moyenne ${s.avg}s.</p>`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1e293b"><h2 style="color:#0f172a">Coach Alex — analyse à la demande</h2>${head}${text}</div>`;
  // Bilan texte (sans HTML) pour le contexte du chat.
  const summary = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 1200);

  const { data: inserted } = await supabase
    .from("voice_coach_reports")
    .insert({ company_id: companyId, source: "manual", window_days: WINDOW_DAYS, calls_analyzed: s.n, stats: s, html, summary, created_by: userId })
    .select("id, source, window_days, calls_analyzed, stats, html, summary, created_at")
    .single();

  return { analyzed: s.n, report: inserted };
}

async function coachChat(supabase: any, companyId: string | null, agentId: string | undefined, messages: any[]) {
  const rows = await fetchCalls(supabase, companyId);
  const s = stats(rows);

  // Prompt actuel d'Alex (best effort — ne bloque pas le chat si ElevenLabs échoue).
  let current = "";
  if (agentId) {
    try {
      const agent = await getConvaiAgent(agentId);
      const c = extractConfig(agent);
      current = `\n\n[PROMPT SYSTÈME ACTUEL D'ALEX]\n${c.system_prompt || "(vide)"}\n\n[MESSAGE D'OUVERTURE ACTUEL]\n${c.first_message || "(vide)"}`;
    } catch (_e) { /* ignore */ }
  }

  // Dernier rapport du coach pour donner le fil rouge.
  const { data: last } = await supabase
    .from("voice_coach_reports")
    .select("summary, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1);
  const lastSummary = last?.[0]?.summary ? `\n\n[DERNIER RAPPORT COACH]\n${last[0].summary}` : "";

  const system = `${COACH_SYSTEM_BASE}

Tu dialogues avec un responsable iTakecare pour AMÉLIORER le prompt système et le message d'ouverture d'Alex, sur la base de l'analyse des transcriptions récentes. Tu es concret, direct, et tu t'appuies sur des exemples tirés des appels.

Règle de format IMPORTANTE : quand tu proposes un prompt système complet (ou un message d'ouverture complet) prêt à appliquer, écris-le dans un bloc de code fermé balisé, exactement ainsi :
\`\`\`prompt
<le texte complet du prompt système>
\`\`\`
et/ou
\`\`\`first_message
<le texte complet du message d'ouverture>
\`\`\`
N'utilise ces blocs QUE pour du texte directement applicable (pas pour des extraits ou des commentaires). Sinon réponds normalement en français.

CONTEXTE — Statistiques des ${WINDOW_DAYS} derniers jours : ${s.n} appels, ${s.real} vraies conversations, ${s.voicemail} répondeurs, ${s.hangupShort} raccrochages <15s, ${s.noAnswer} sans réponse, durée moyenne ${s.avg}s.${current}${lastSummary}

Échantillon de transcriptions récentes :\n\n${sampleTranscripts(rows).slice(0, 18000)}`;

  const cleaned = messages
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-16)
    .map((m: any) => ({ role: m.role, content: m.content }));
  if (cleaned.length === 0) return "Pose-moi une question ou demande-moi une proposition de prompt améliorée.";

  const text = await callAnthropic(system, cleaned, 4000);
  return text ?? "Désolé, l'analyse a échoué. Réessaie dans un instant.";
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
