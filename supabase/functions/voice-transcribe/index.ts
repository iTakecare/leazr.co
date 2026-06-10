// =====================================================================
// voice-transcribe — transcription FR (OpenAI Whisper) + résumé & actions
// (Claude) d'un enregistrement d'appel, écrits dans voice_calls.
//
// Déclenché par voice-recording (Bearer service_role) ; appelable aussi à
// la demande avec le JWT utilisateur (bouton « Transcrire »).
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body = await req.json().catch(() => null) as { voice_call_id?: string } | null;
    if (!body?.voice_call_id) return json({ success: false, error: "voice_call_id required" }, 400);

    // Auth : service_role (interne) OU utilisateur de la même company.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (token !== serviceRoleKey) {
      const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: claims, error } = await userSupabase.auth.getUser(token);
      if (error || !claims?.user) return json({ success: false, error: "unauthorized" }, 401);
    }

    const { data: call } = await admin
      .from("voice_calls").select("id, company_id, recording_path, offer_id, client_id").eq("id", body.voice_call_id).maybeSingle();
    if (!call?.recording_path) return json({ success: false, error: "no_recording" }, 404);

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return json({ success: false, error: "openai_not_configured" }, 412);

    // Contexte (nom client + société) pour guider la reconnaissance.
    let clientName = ""; let companyName = "iTakecare";
    if (call.client_id) {
      const { data: c } = await admin.from("clients").select("name, company_name").eq("id", call.client_id).maybeSingle();
      clientName = (c as { name?: string } | null)?.name ?? "";
      companyName = (c as { company_name?: string } | null)?.company_name || companyName;
    }
    const { data: comp } = await admin.from("companies").select("name").eq("id", call.company_id).maybeSingle();
    const orgName = (comp as { name?: string } | null)?.name || "iTakecare";

    // 1) Télécharge le MP3 du bucket.
    const { data: file, error: dlErr } = await admin.storage.from("call-recordings").download(call.recording_path);
    if (dlErr || !file) return json({ success: false, error: "download_failed", message: dlErr?.message }, 500);

    // 2) Whisper (français) — le `prompt` biaise la reconnaissance vers le
    //    vocabulaire métier et les noms propres (sinon "Gianni de iTakecare"
    //    devient "Janine de ITKF"…).
    const whisperPrompt = `Conversation téléphonique en français entre un conseiller de ${orgName} (société de leasing de matériel informatique) et un client${clientName ? ` nommé ${clientName}` : ""}. Termes fréquents : ${orgName}, Leazr, leasing, demande de financement, mensualité, Grenke, dossier, carte d'identité, bilan, extrait de rôle, documents, MacBook, ordinateur, partenaires financiers.`;
    const fd = new FormData();
    fd.append("file", file, "call.mp3");
    fd.append("model", "whisper-1");
    fd.append("language", "fr");
    fd.append("prompt", whisperPrompt);
    fd.append("temperature", "0");
    const wResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: fd,
    });
    if (!wResp.ok) {
      const t = await wResp.text();
      return json({ success: false, error: "whisper_failed", message: t.slice(0, 300) }, 502);
    }
    const rawTranscription = ((await wResp.json()) as { text?: string }).text ?? "";
    let transcription = rawTranscription;

    // 3) Claude : CORRIGE la transcription (noms/société mal reconnus) +
    //    résumé + actions, avec le contexte des demandes.
    let summary = ""; let actions: unknown[] = [];
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicKey && rawTranscription.trim()) {
      let offers: Array<{ id: string; numero: string | null; statut: string | null }> = [];
      if (call.client_id) {
        const { data: o } = await admin.from("offers")
          .select("id, offer_number, dossier_number, workflow_status")
          .eq("client_id", call.client_id).order("created_at", { ascending: false }).limit(8);
        offers = (o ?? []).map((x) => ({ id: x.id, numero: x.offer_number ?? x.dossier_number, statut: x.workflow_status }));
      }
      const sys = "Tu es l'assistant CRM de Leazr (leasing IT B2B). Tu réponds uniquement par un objet JSON valide.";
      const usr = `Transcription BRUTE (Whisper) d'un appel téléphonique. Elle contient des erreurs de reconnaissance, surtout sur les noms propres et la société.

Contexte certain :
- Société : ${orgName}
${clientName ? `- Client : ${clientName}` : "- Client : inconnu"}
${offers.length ? `- Demandes du client (id, numéro, statut) : ${JSON.stringify(offers)}` : ""}

Transcription brute :
"""${rawTranscription.slice(0, 8000)}"""

Donne :
- "transcription" : la transcription CORRIGÉE en français — corrige les noms propres mal reconnus (ex. remplace une mauvaise graphie du nom de la société par "${orgName}", du client par "${clientName || "le client"}"), la ponctuation et les évidences ; NE réécris PAS le sens, ne supprime rien, garde le style parlé. Idéalement préfixe les répliques par "Conseiller :" / "Client :" si c'est clair.
- "summary" : 2-3 phrases résumant l'appel et ce qui a été convenu.
- "actions" : suggestions parmi {kind, payload, reason} :
  • "task" {"title","description","due_in_days","priority":"low|medium|high"} si une action humaine est attendue
  • "link_offer" {"offer_id","offer_label"} si l'appel concerne une demande listée (jamais d'id inventé)
  • "callback" {"in_days":N,"reason":"..."} si un rappel est convenu
  • "request_documents" {"documents":["carte d'identité","bilan"...],"offer_label":"..."} si le client doit envoyer des documents
  • "callback_ai" {"reason":"..."} si le client doit être rappelé par l'agent vocal IA
Réponds UNIQUEMENT en JSON : {"transcription":"...","summary":"...","actions":[...]}`;
      try {
        const aResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 4000, system: sys, messages: [{ role: "user", content: usr }] }),
        });
        if (aResp.ok) {
          const data = await aResp.json();
          const text = (data.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
          const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
          const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
          if (s !== -1 && e !== -1) {
            const parsed = JSON.parse(cleaned.slice(s, e + 1));
            if (typeof parsed.transcription === "string" && parsed.transcription.trim().length > 20) {
              transcription = parsed.transcription;
            }
            summary = parsed.summary ?? "";
            const validOfferIds = new Set(offers.map((o) => o.id));
            actions = (parsed.actions ?? []).filter((a: { kind?: string; payload?: { offer_id?: string } }) =>
              a.kind !== "link_offer" || (a.payload?.offer_id && validOfferIds.has(a.payload.offer_id)));
          }
        }
      } catch (e) { console.error("[voice-transcribe] claude", e); }
    }

    await admin.from("voice_calls").update({
      transcription,
      summary: summary || null,
      ai_actions: actions.length ? actions : null,
      updated_at: new Date().toISOString(),
    }).eq("id", body.voice_call_id);

    return json({ success: true, transcription, summary, actions });
  } catch (e) {
    console.error("[voice-transcribe]", e);
    return json({ success: false, error: "internal_error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
