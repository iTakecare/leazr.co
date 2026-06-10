// =====================================================================
// voice-recording — callbacks Twilio du softphone (public, signé).
//   ?kind=status        → statut de l'appel (répondu/terminé/échec)
//   (par défaut)        → enregistrement prêt : on le stocke + transcrit
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateTwilioSignature } from "../_shared/twilio.ts";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const ok200 = () => new Response("OK", { status: 200 });

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const voiceCallId = url.searchParams.get("voice_call_id") ?? "";
  const kind = url.searchParams.get("kind");

  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const publicUrl = `${supabaseUrl}/functions/v1/voice-recording${url.search}`;
  const valid = await validateTwilioSignature(authToken, publicUrl, params, req.headers.get("X-Twilio-Signature"));
  if (!valid) { console.error("[voice-recording] bad signature"); return new Response("Forbidden", { status: 403 }); }
  if (!voiceCallId) return ok200();

  try {
    // -------- statut d'appel --------
    if (kind === "status") {
      const dialStatus = params.DialCallStatus ?? params.CallStatus; // completed|no-answer|busy|failed|canceled|answered
      const duration = Number(params.DialCallDuration ?? params.CallDuration ?? "0") || null;
      const map: Record<string, string> = {
        completed: "completed", answered: "in_progress", "no-answer": "no_answer",
        busy: "busy", failed: "failed", canceled: "canceled",
      };
      const status = map[dialStatus] ?? "completed";
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (duration) patch.duration_seconds = duration;
      await admin.from("voice_calls").update(patch).eq("id", voiceCallId);
      return ok200();
    }

    // -------- enregistrement prêt --------
    const recordingUrl = params.RecordingUrl;
    const recDuration = Number(params.RecordingDuration ?? "0") || null;
    if (!recordingUrl) return ok200();

    const { data: call } = await admin
      .from("voice_calls").select("id, company_id").eq("id", voiceCallId).maybeSingle();
    if (!call) return ok200();

    // Télécharge le MP3 (auth basique Twilio).
    const mp3 = await fetch(`${recordingUrl}.mp3`, {
      headers: { Authorization: "Basic " + btoa(`${accountSid}:${authToken}`) },
    });
    if (!mp3.ok) { console.error("[voice-recording] download", mp3.status); return ok200(); }
    const bytes = new Uint8Array(await mp3.arrayBuffer());
    const path = `${call.company_id}/${voiceCallId}.mp3`;
    const { error: upErr } = await admin.storage.from("call-recordings").upload(path, bytes, { contentType: "audio/mpeg", upsert: true });
    if (upErr) { console.error("[voice-recording] upload", upErr.message); return ok200(); }

    await admin.from("voice_calls").update({
      recording_path: path,
      recording_duration_secs: recDuration,
      updated_at: new Date().toISOString(),
    }).eq("id", voiceCallId);

    // Transcription asynchrone (Whisper + résumé Claude).
    const job = fetch(`${supabaseUrl}/functions/v1/voice-transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ voice_call_id: voiceCallId }),
    }).catch((e) => console.error("[voice-recording] transcribe trigger", e));
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) rt.waitUntil(job); else await job;

    return ok200();
  } catch (e) {
    console.error("[voice-recording]", e);
    return ok200();
  }
});
