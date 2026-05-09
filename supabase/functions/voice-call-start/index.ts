// Initiates an outbound voice call via ElevenLabs Agents (Alex) for a client
// whose KYC documents are pending. Authenticated, admin-only, rate-limited.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import {
  ElevenLabsError,
  normalizeBelgianPhone,
  startElevenLabsCall,
} from "../_shared/elevenlabs.ts";

const requestSchema = z.object({
  client_id: z.string().uuid(),
  kyc_report_id: z.string().uuid().optional(),
  language: z.enum(["fr", "nl", "en"]).default("fr"),
  missing_docs: z.string().max(500).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const security = await requireElevatedAccess(req, corsHeaders, {
    rateLimit: {
      endpoint: "voice-call-start",
      maxRequests: 10,
      windowSeconds: 86400,
      identifierPrefix: "voice",
    },
  });
  if (!security.ok) return security.response;

  const { supabaseAdmin, userId, companyId } = security.context;

  let parsed;
  try {
    parsed = requestSchema.parse(await req.json());
  } catch (e) {
    return jsonErr(400, "Invalid request body", e instanceof z.ZodError ? e.errors : undefined);
  }

  const { data: client, error: clientErr } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, name, phone, company_id, voice_consent_given_at")
    .eq("id", parsed.client_id)
    .maybeSingle();

  if (clientErr) {
    console.error("[voice-call-start] client lookup error", clientErr);
    return jsonErr(500, "Client lookup failed");
  }
  if (!client) return jsonErr(404, "Client not found");
  if (companyId && client.company_id !== companyId) {
    return jsonErr(403, "Client belongs to a different tenant");
  }
  if (!client.voice_consent_given_at) {
    return jsonErr(412, "Client has not consented to AI voice calls");
  }

  const e164 = normalizeBelgianPhone(client.phone);
  if (!e164) return jsonErr(422, "Client has no valid phone number");

  if (parsed.kyc_report_id) {
    const { data: report } = await supabaseAdmin
      .from("client_kyc_reports")
      .select("id, client_id")
      .eq("id", parsed.kyc_report_id)
      .maybeSingle();
    if (!report || report.client_id !== client.id) {
      return jsonErr(400, "kyc_report_id does not belong to this client");
    }
  }

  const firstName = client.first_name || (client.name?.split(" ")[0] ?? "");
  const consentSnapshot = client.voice_consent_given_at;
  const missingDocs = parsed.missing_docs || "vos documents administratifs";

  const { data: callRow, error: insertErr } = await supabaseAdmin
    .from("voice_calls")
    .insert({
      client_id: client.id,
      company_id: client.company_id,
      kyc_report_id: parsed.kyc_report_id ?? null,
      provider: "elevenlabs",
      status: "queued",
      initiated_by: userId,
      to_phone: e164,
      language: parsed.language,
      consent_snapshot_at: consentSnapshot,
      metadata: { missing_docs: missingDocs },
    })
    .select()
    .single();

  if (insertErr || !callRow) {
    console.error("[voice-call-start] insert failed", insertErr);
    return jsonErr(500, "Failed to create call record");
  }

  const agentId = Deno.env.get("ELEVENLABS_AGENT_ID");
  const agentPhoneNumberId = Deno.env.get("ELEVENLABS_AGENT_PHONE_NUMBER_ID");
  if (!agentId || !agentPhoneNumberId) {
    await supabaseAdmin.from("voice_calls")
      .update({ status: "failed", metadata: { ...callRow.metadata, error: "elevenlabs_not_configured" } })
      .eq("id", callRow.id);
    return jsonErr(500, "ElevenLabs not configured (missing env vars)");
  }

  // First message is forced literal for RGPD compliance (announcement + consent reminder).
  const firstMessageByLang: Record<string, string> = {
    fr: `Bonjour ${firstName}, je suis Alex, l'assistante virtuelle d'iTakecare. Cet appel est enregistré pour assurer la qualité du service. Vous pouvez à tout moment demander à parler à un collaborateur humain. Avez-vous quelques minutes ?`,
    nl: `Goedendag ${firstName}, ik ben Alex, de virtuele assistente van iTakecare. Dit gesprek wordt opgenomen voor kwaliteitsdoeleinden. U kunt op elk moment vragen om met een menselijke medewerker te spreken. Heeft u enkele minuten?`,
    en: `Hello ${firstName}, I'm Alex, iTakecare's virtual assistant. This call is being recorded for quality purposes. You can ask to speak with a human colleague at any time. Do you have a few minutes?`,
  };

  try {
    const eleven = await startElevenLabsCall({
      agent_id: agentId,
      agent_phone_number_id: agentPhoneNumberId,
      to_number: e164,
      call_recording_enabled: true,
      conversation_initiation_client_data: {
        user_id: callRow.id, // our voice_calls.id, echoed back in webhooks
        dynamic_variables: {
          client_first_name: firstName,
          missing_docs: missingDocs,
          language: parsed.language,
          voice_call_id: callRow.id,
          client_id: client.id,
          company_id: client.company_id,
        },
        conversation_config_override: {
          agent: {
            language: parsed.language,
            first_message: firstMessageByLang[parsed.language] ?? firstMessageByLang.fr,
          },
        },
      },
    });

    if (!eleven.success || !eleven.conversation_id) {
      throw new ElevenLabsError(
        `ElevenLabs returned success=false: ${eleven.message ?? "unknown"}`,
        undefined,
        eleven,
      );
    }

    await supabaseAdmin.from("voice_calls")
      .update({
        provider_conversation_id: eleven.conversation_id,
        provider_call_sid: eleven.callSid,
        provider_agent_id: agentId,
        status: "ringing",
      })
      .eq("id", callRow.id);

    return new Response(
      JSON.stringify({
        ok: true,
        voice_call_id: callRow.id,
        conversation_id: eleven.conversation_id,
        call_sid: eleven.callSid,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[voice-call-start] ElevenLabs call failed", e);
    const errBody = e instanceof ElevenLabsError ? e.body : String(e);
    await supabaseAdmin.from("voice_calls")
      .update({
        status: "failed",
        metadata: { ...callRow.metadata, error: "provider_request_failed", provider_error: errBody },
      })
      .eq("id", callRow.id);
    return jsonErr(502, "Voice call initiation failed");
  }
});

function jsonErr(status: number, message: string, details?: unknown) {
  return new Response(
    JSON.stringify({ error: message, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
