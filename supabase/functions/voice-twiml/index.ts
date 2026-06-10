// =====================================================================
// voice-twiml — TwiML d'appel sortant du softphone (public, signé Twilio).
//
// Quand le SDK navigateur appelle Device.connect({params:{To, voiceCallId}}),
// Twilio frappe cette URL. On renvoie un <Dial> vers le numéro client, avec
// notre numéro iTakecare en présentation et l'enregistrement activé. Le
// callback d'enregistrement (voice-recording) déclenche la transcription.
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { validateTwilioSignature } from "../_shared/twilio.ts";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const callerId = Deno.env.get("TWILIO_CALLER_ID") ?? "";
  const twiml = (xml: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, { headers: { "Content-Type": "text/xml" } });

  if (req.method !== "POST" || !authToken) {
    return twiml(`<Response><Say language="fr-FR">Configuration manquante.</Say></Response>`);
  }

  const url = new URL(req.url);
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const publicUrl = `${supabaseUrl}/functions/v1/voice-twiml${url.search}`;
  const ok = await validateTwilioSignature(authToken, publicUrl, params, req.headers.get("X-Twilio-Signature"));
  if (!ok) return new Response("Forbidden", { status: 403 });

  const to = (params.To ?? "").trim();
  const voiceCallId = params.voiceCallId ?? params.VoiceCallId ?? "";
  if (!to || !/^\+\d{8,15}$/.test(to)) {
    return twiml(`<Response><Say language="fr-FR">Numéro invalide.</Say></Response>`);
  }

  // Dans le XML, les '&' des URLs DOIVENT être échappés en '&amp;' sinon le
  // TwiML est invalide et Twilio refuse l'appel.
  const xml = (s: string) => s.replace(/&/g, "&amp;");
  const recCb = xml(`${supabaseUrl}/functions/v1/voice-recording?voice_call_id=${encodeURIComponent(voiceCallId)}`);
  const statusCb = xml(`${supabaseUrl}/functions/v1/voice-recording?kind=status&voice_call_id=${encodeURIComponent(voiceCallId)}`);
  // record-from-answer-dual : 2 pistes (agent + client), démarre à la réponse.
  return twiml(
    `<Response>` +
    `<Dial callerId="${callerId}" answerOnBridge="true" record="record-from-answer-dual" ` +
    `recordingStatusCallback="${recCb}" recordingStatusCallbackEvent="completed" ` +
    `action="${statusCb}" method="POST">` +
    `<Number statusCallback="${statusCb}" statusCallbackEvent="answered completed">${to}</Number>` +
    `</Dial>` +
    `</Response>`,
  );
});
