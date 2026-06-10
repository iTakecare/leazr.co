// ElevenLabs server-side tool: send_document_link.
// Called by the Alex agent DURING a call when the client says they never
// received the upload link. Alex first asks which channel the client prefers
// (email / WhatsApp / SMS), then calls this tool with { voice_call_id, channel }.
//
// The tool resolves the client + offer + requested documents from the most
// recent document request tied to the call's client, then re-sends the SAME
// upload link through the chosen channel — reusing send-document-request
// (trusted via X-Cron-Secret) for email and messaging-send (trusted via
// x-system-secret) for WhatsApp/SMS. A new document_requests row traces the
// re-send so it appears in the offer timeline.
//
// Auth: shared secret in `x-tool-secret` header (== ELEVENLABS_TOOL_SECRET).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const DOC_LABELS: Record<string, string> = {
  balance_sheet: "Bilan financier",
  provisional_balance: "Bilan financier provisoire",
  tax_notice: "Avertissement extrait de rôle",
  tax_return: "Liasse fiscale",
  id_card_front: "Carte d'identité (recto)",
  id_card_back: "Carte d'identité (verso)",
  id_card: "Carte d'identité",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
  proof_of_address: "Justificatif de domicile",
  company_statutes: "Statuts de l'entreprise",
  custom: "Autre document",
};
function docLabel(code: string): string {
  if (code.startsWith("custom:")) return code.slice(7);
  return DOC_LABELS[code] ?? code;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const expected = Deno.env.get("ELEVENLABS_TOOL_SECRET");
  if (!expected) return json(500, { ok: false, error: "tool_secret_not_configured" });
  const provided = req.headers.get("x-tool-secret");
  if (!provided || provided !== expected) return json(401, { ok: false, error: "unauthorized" });

  let payload: { voice_call_id?: string; channel?: string };
  try { payload = await req.json(); } catch { return json(400, { ok: false, error: "invalid_json" }); }

  // voice_call_id arrives via a templated header (x-voice-call-id = {{voice_call_id}})
  // so the LLM never has to echo the UUID; fall back to the body for safety.
  const voiceCallId = req.headers.get("x-voice-call-id") || payload.voice_call_id;
  // Normalise the channel Alex extracted from the conversation.
  const raw = (payload.channel ?? "").toLowerCase();
  let channel: "email" | "whatsapp" | "sms";
  if (raw.includes("mail") || raw.includes("courriel")) channel = "email";
  else if (raw.includes("whats") || raw.includes("wap")) channel = "whatsapp";
  else if (raw.includes("sms") || raw.includes("texto")) channel = "sms";
  else return json(400, { ok: false, error: "unknown_channel", message: "channel must be email, whatsapp or sms" });

  if (!voiceCallId || typeof voiceCallId !== "string") {
    return json(400, { ok: false, error: "missing_voice_call_id" });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- resolve the call → client / company ----
  const { data: call } = await admin
    .from("voice_calls")
    .select("id, client_id, company_id")
    .eq("id", voiceCallId)
    .maybeSingle();
  if (!call || !call.client_id) return json(404, { ok: false, error: "call_or_client_not_found" });

  // ---- find the most recent document request for this client ----
  // This is the score-B request the client says they never received; we
  // re-send the very same link + document list on the chosen channel.
  const { data: docReq } = await admin
    .from("document_requests")
    .select("offer_id, documents, upload_token, upload_url, custom_message, created_by")
    .eq("client_id", call.client_id)
    .eq("company_id", call.company_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!docReq?.offer_id || !Array.isArray(docReq.documents) || docReq.documents.length === 0) {
    return json(404, { ok: false, error: "no_document_request", message: "Aucune demande de documents à renvoyer pour ce client." });
  }

  const documents = docReq.documents as string[];
  const offerId = docReq.offer_id as string;
  const uploadToken = docReq.upload_token as string;
  const uploadUrl = docReq.upload_url as string;
  const docsList = documents.map(docLabel).join(", ");

  // ---- client + offer contact details ----
  const { data: offer } = await admin
    .from("offers").select("client_name, client_email").eq("id", offerId).maybeSingle();
  const { data: client } = await admin
    .from("clients").select("name, email, phone").eq("id", call.client_id).maybeSingle();
  const clientName = (offer?.client_name as string) || (client?.name as string) || "Client";
  const clientEmail = (offer?.client_email as string) || (client?.email as string) || null;
  const clientPhone = (client?.phone as string) || null;

  // ---- send on the chosen channel ----
  let sent = false;
  const detail: Record<string, unknown> = {};
  const cronSecret = Deno.env.get("GRENKE_CRON_SECRET");

  if (channel === "email") {
    if (!clientEmail) return json(422, { ok: false, error: "no_email", message: "Pas d'adresse email au dossier." });
    const r = await fetch(`${supabaseUrl}/functions/v1/send-document-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Cron-Secret": cronSecret ?? "" },
      body: JSON.stringify({
        offerId, clientEmail, clientName, requestedDocs: documents,
        customMessage: docReq.custom_message ?? undefined, uploadToken,
      }),
    });
    const data = await r.json().catch(() => null);
    sent = r.ok && (data as { success?: boolean })?.success === true;
    detail.email = data;
  } else {
    // whatsapp / sms via messaging-send (system mode)
    if (!clientPhone) return json(422, { ok: false, error: "no_phone", message: "Pas de numéro de téléphone au dossier." });
    const r = await fetch(`${supabaseUrl}/functions/v1/messaging-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // service_role key satisfies the gateway's verify_jwt; the function
        // then sees x-system-secret and runs in system mode (no user).
        "Authorization": `Bearer ${serviceKey}`,
        "x-system-secret": expected,
        "x-system-company-id": call.company_id,
      },
      body: JSON.stringify({
        action: "send_message", client_id: call.client_id, channel,
        template_key: "document_request", offer_id: offerId,
        variables: { "1": clientName, "2": docsList, "3": uploadUrl },
      }),
    });
    const data = await r.json().catch(() => null);
    sent = r.ok && (data as { success?: boolean })?.success === true;
    detail[channel] = data;
  }

  // ---- trace the re-send in the offer timeline ----
  await admin.from("document_requests").insert({
    company_id: call.company_id,
    offer_id: offerId,
    client_id: call.client_id,
    upload_token: uploadToken,
    upload_url: uploadUrl,
    documents,
    custom_message: docReq.custom_message ?? null,
    channels: [channel],
    email_status: channel === "email" ? (sent ? "sent" : "failed") : null,
    whatsapp_status: channel === "whatsapp" ? (sent ? "sent" : "failed") : null,
    sms_status: channel === "sms" ? (sent ? "sent" : "failed") : null,
    results: { source: "voice_agent_alex", voice_call_id: voiceCallId, ...detail },
    created_by: docReq.created_by ?? null,
  });

  if (!sent) return json(502, { ok: false, channel, message: `Échec de l'envoi par ${channel}.` });

  // Short, spoken-back-to-the-LLM confirmation.
  const channelLabel = channel === "email" ? "email" : channel === "whatsapp" ? "WhatsApp" : "SMS";
  return json(200, {
    ok: true,
    channel,
    documents_count: documents.length,
    message: `Lien envoyé par ${channelLabel}. Le client devrait le recevoir dans un instant.`,
  });
});
