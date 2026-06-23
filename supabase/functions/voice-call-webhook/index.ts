// ElevenLabs Conversational AI post-call webhook receiver.
// Public endpoint, authenticated via HMAC signature (ElevenLabs-Signature header).
// Handles 3 event types: post_call_transcription, post_call_audio, call_initiation_failure.
// Deploy with verify_jwt = false (see config.toml).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyElevenLabsSignature } from "../_shared/elevenlabs.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp(405, { error: "Method not allowed" });

  const secret = Deno.env.get("ELEVENLABS_WEBHOOK_SECRET");
  if (!secret) {
    console.error("[voice-call-webhook] ELEVENLABS_WEBHOOK_SECRET not set");
    return jsonResp(500, { error: "Webhook secret not configured" });
  }

  // Read raw body once, then parse — we need the raw bytes for HMAC.
  const rawBody = await req.text();
  const sigHeader = req.headers.get("ElevenLabs-Signature")
    ?? req.headers.get("elevenlabs-signature");

  const verify = await verifyElevenLabsSignature(rawBody, sigHeader, secret);
  if (!verify.ok) {
    console.warn(`[voice-call-webhook] signature rejected: ${verify.reason}`);
    return jsonResp(401, { error: "Unauthorized" });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResp(400, { error: "Invalid JSON" });
  }

  const type: string | undefined = payload?.type;
  const data = payload?.data ?? {};
  if (!type) return jsonResp(200, { ignored: true, reason: "missing type" });

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    switch (type) {
      case "post_call_transcription":
        return await handleTranscription(supabase, data);
      case "post_call_audio":
        // Base64 MP3 in data.full_audio. Skipped for now (PR3: upload to Supabase Storage).
        console.log(`[voice-call-webhook] post_call_audio received (not stored)`);
        return jsonResp(200, { ok: true, stored: false });
      case "call_initiation_failure":
        return await handleInitiationFailure(supabase, data);
      default:
        return jsonResp(200, { ignored: true, reason: `unknown type: ${type}` });
    }
  } catch (e) {
    console.error("[voice-call-webhook] handler error", e);
    return jsonResp(500, { error: "Webhook handler failed" });
  }
});

async function handleTranscription(supabase: any, data: any) {
  const conversationId: string | undefined = data.conversation_id;
  const dynamicVars = data.conversation_initiation_client_data?.dynamic_variables ?? {};
  const ourCallId: string | undefined = dynamicVars.voice_call_id ?? data.user_id;

  const callRow = await findCallRow(supabase, ourCallId, conversationId);
  if (!callRow) {
    console.warn(`[voice-call-webhook] no row for conversation_id=${conversationId}`);
    return jsonResp(200, { ignored: true, reason: "no matching row" });
  }

  // Flatten transcript array → readable text.
  const transcriptArr = Array.isArray(data.transcript) ? data.transcript : [];
  const transcriptionText = transcriptArr
    .map((t: any) => `[${t.role ?? "?"}] ${t.message ?? ""}`)
    .filter((line: string) => line.length > 4)
    .join("\n");

  const meta = data.metadata ?? {};
  const durationSec = numOrNull(meta.call_duration_secs);
  const cost = numOrNull(meta.cost);
  const summary = data.analysis?.transcript_summary ?? null;
  const callStatus: string = data.status ?? "done";

  // Detect transfer/no-answer/failed from termination reason if available.
  const terminationReason: string | undefined = meta.termination_reason
    ?? meta.phone_call?.termination_reason;
  // Alex a-t-il atterri sur un répondeur ? ElevenLabs ne met PAS toujours
  // termination_reason='voicemail' (souvent 'Call ended by remote party') et son
  // analyse ne le signale pas toujours. On combine 3 signaux : motif/statut,
  // analyse (titre/résumé), ET la transcription elle-même (le message du
  // répondeur apparaît dans les tours [user] : "laissez un message", "après le
  // bip", "appuyez sur", "n'est pas disponible", "voicemail"…).
  const analysisText = `${data.analysis?.call_summary_title ?? ""} ${data.analysis?.transcript_summary ?? ""}`;
  const reasonStr = `${terminationReason ?? ""} ${callStatus ?? ""} ${analysisText}`.toLowerCase();
  const isVoicemail =
    /voicemail|voice.?mail|answering[ _-]?machine|répondeur|messagerie vocale/.test(reasonStr) ||
    /laisser un message|laissez un message|après le bip|après le signal|messagerie|voicemail|n['’]est pas disponible|appuyez sur|record your message|not available|pas disponible pour/i.test(transcriptionText ?? "");

  let mappedStatus = "completed";
  if (callRow.status === "transferred_to_human") {
    mappedStatus = "transferred_to_human";
  } else if (isVoicemail) {
    mappedStatus = "voicemail";
  } else if (terminationReason === "no-answer" || callStatus === "no_answer") {
    mappedStatus = "no_answer";
  } else if (callStatus === "failed") {
    mappedStatus = "failed";
  }

  await supabase.from("voice_calls").update({
    status: mappedStatus,
    transcription: transcriptionText || null,
    summary,
    duration_seconds: durationSec,
    cost_eur: cost,
    metadata: {
      ...(callRow.metadata ?? {}),
      termination_reason: terminationReason ?? null,
      analysis: data.analysis ?? null,
    },
  }).eq("id", callRow.id);

  return jsonResp(200, { ok: true });
}

async function handleInitiationFailure(supabase: any, data: any) {
  const conversationId: string | undefined = data.conversation_id;
  const ourCallId: string | undefined =
    data.conversation_initiation_client_data?.dynamic_variables?.voice_call_id ?? data.user_id;

  const callRow = await findCallRow(supabase, ourCallId, conversationId);
  if (!callRow) return jsonResp(200, { ignored: true });

  await supabase.from("voice_calls").update({
    status: "failed",
    metadata: {
      ...(callRow.metadata ?? {}),
      initiation_failure: data,
    },
  }).eq("id", callRow.id);

  return jsonResp(200, { ok: true });
}

async function findCallRow(supabase: any, ourId: string | undefined, providerId: string | undefined) {
  if (ourId) {
    const { data } = await supabase
      .from("voice_calls")
      .select("id, status, metadata")
      .eq("id", ourId)
      .maybeSingle();
    if (data) return data;
  }
  if (providerId) {
    const { data } = await supabase
      .from("voice_calls")
      .select("id, status, metadata")
      .eq("provider_conversation_id", providerId)
      .maybeSingle();
    return data;
  }
  return null;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function jsonResp(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
