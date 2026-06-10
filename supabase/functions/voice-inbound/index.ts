// =====================================================================
// voice-inbound — TwiML des appels ENTRANTS sur le numéro iTakecare.
//
// Le numéro Twilio pointe sa VoiceUrl ici. On :
//   1. mappe le numéro appelé (To) → société (messaging_settings.voice_number)
//   2. crée une ligne voice_calls (direction inbound) + identifie l'appelant
//   3. fait sonner les agents EN LIGNE dans le navigateur (<Client>), avec
//      enregistrement ; sinon → message + messagerie vocale (record).
//
// Le softphone (console) reçoit l'appel via device.on('incoming').
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateTwilioSignature } from "../_shared/twilio.ts";
import { normalizeBelgianPhone } from "../_shared/elevenlabs.ts";

const PRESENCE_TTL_MS = 60_000; // un agent est "en ligne" s'il a battu < 60 s

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const twiml = (xml: string) => new Response(`<?xml version="1.0" encoding="UTF-8"?>${xml}`, { headers: { "Content-Type": "text/xml" } });

  if (req.method !== "POST") return twiml(`<Response><Reject/></Response>`);

  const url = new URL(req.url);
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") params[k] = v;

  const publicUrl = `${supabaseUrl}/functions/v1/voice-inbound${url.search}`;
  const valid = await validateTwilioSignature(authToken, publicUrl, params, req.headers.get("X-Twilio-Signature"));
  if (!valid) return new Response("Forbidden", { status: 403 });

  try {
    const to = params.To ?? "";
    const from = params.From ?? "";
    const callSid = params.CallSid ?? "";

    // 1) société propriétaire du numéro
    const { data: settings } = await admin
      .from("messaging_settings").select("company_id").eq("voice_number", to).maybeSingle();
    const companyId = settings?.company_id;
    if (!companyId) return twiml(`<Response><Say language="fr-FR">Ce numéro n'est pas configuré.</Say></Response>`);

    // 2) identification de l'appelant (par téléphone, format-agnostique :
    //    comparaison sur les 9 derniers chiffres)
    const digits = (from || "").replace(/\D/g, "");
    const last9 = digits.slice(-9);
    let clientId: string | null = null;
    let clientName = "";
    if (last9.length >= 8) {
      const { data: candidates } = await admin
        .from("clients").select("id, name, phone").eq("company_id", companyId).not("phone", "is", null).limit(5000);
      const match = (candidates ?? []).find((c) =>
        String((c as { phone: string }).phone).replace(/\D/g, "").slice(-9) === last9);
      clientId = (match as { id: string } | undefined)?.id ?? null;
      clientName = (match as { name?: string } | undefined)?.name ?? "";
    }

    // 3) ligne voice_calls (inbound)
    const { data: call } = await admin.from("voice_calls").insert({
      company_id: companyId,
      client_id: clientId,
      direction: "inbound",
      to_phone: from,
      status: "ringing",
      provider: "twilio_softphone",
      provider_call_sid: callSid,
      language: "fr",
    }).select("id").single();
    const voiceCallId = call?.id ?? "";

    // 4) agents en ligne
    const since = new Date(Date.now() - PRESENCE_TTL_MS).toISOString();
    const { data: agents } = await admin
      .from("voice_presence").select("identity, last_seen")
      .eq("company_id", companyId).eq("online", true).gte("last_seen", since);

    // '&' échappés en '&amp;' (XML valide obligatoire pour Twilio).
    const xmlEsc = (s: string) => s.replace(/&/g, "&amp;");
    const recCb = xmlEsc(`${supabaseUrl}/functions/v1/voice-recording?voice_call_id=${encodeURIComponent(voiceCallId)}`);
    const statusCb = xmlEsc(`${supabaseUrl}/functions/v1/voice-recording?kind=status&voice_call_id=${encodeURIComponent(voiceCallId)}`);

    if (agents && agents.length > 0) {
      // Fait sonner tous les agents en ligne ; le premier qui décroche prend.
      // On passe le contexte en paramètres custom (lus par le SDK à l'arrivée).
      const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      const clients = agents.map((a) =>
        `<Client>${a.identity}` +
        `<Parameter name="voiceCallId" value="${voiceCallId}"/>` +
        `<Parameter name="from" value="${attr(from)}"/>` +
        (clientId ? `<Parameter name="clientId" value="${clientId}"/>` : "") +
        (clientName ? `<Parameter name="clientName" value="${attr(clientName)}"/>` : "") +
        `</Client>`).join("");
      return twiml(
        `<Response><Dial timeout="25" answerOnBridge="true" record="record-from-answer-dual" ` +
        `recordingStatusCallback="${recCb}" recordingStatusCallbackEvent="completed" ` +
        `action="${statusCb}" method="POST">${clients}</Dial>` +
        // Si personne ne décroche, le <Dial> rend la main ici → messagerie.
        `<Say language="fr-FR">Nous ne pouvons pas prendre votre appel pour le moment. Laissez un message après le bip.</Say>` +
        `<Record maxLength="120" playBeep="true" recordingStatusCallback="${recCb}"/>` +
        `</Response>`,
      );
    }

    // Aucun agent en ligne → messagerie vocale.
    await admin.from("voice_calls").update({ status: "no_answer", outcome: "voicemail" }).eq("id", voiceCallId);
    return twiml(
      `<Response>` +
      `<Say language="fr-FR">Bonjour, vous êtes bien chez iTakecare. Nous ne sommes pas disponibles. Laissez un message après le bip, nous vous rappellerons.</Say>` +
      `<Record maxLength="120" playBeep="true" recordingStatusCallback="${recCb}"/>` +
      `</Response>`,
    );
  } catch (e) {
    console.error("[voice-inbound]", e);
    return twiml(`<Response><Say language="fr-FR">Une erreur est survenue.</Say></Response>`);
  }
});
