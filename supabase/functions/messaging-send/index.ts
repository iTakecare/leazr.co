// =====================================================================
// messaging-send — envoi WhatsApp/SMS sortant (Twilio), multi-tenant.
//
// Actions:
//   - "send_message": envoie un message à un client (ou dans une
//     conversation existante) en résolvant le canal automatiquement.
//
// Résolution du canal ("auto") :
//   1. preferred_channel du client s'il est forcé (whatsapp/sms/none)
//   2. whatsapp_status = 'no'  → SMS direct
//   3. sinon                   → WhatsApp d'abord ; le fallback SMS se fait
//      dans messaging-webhook quand Twilio rapporte que le numéro n'a pas
//      WhatsApp (erreurs 63003/63024) — et on mémorise whatsapp_status.
//
// Fenêtre 24 h WhatsApp : un message libre (sans template) n'est autorisé
// que si le client a écrit il y a moins de 24 h (conversation.last_inbound_at).
// Sinon → 422 "window_closed", l'UI doit proposer un template approuvé.
//
// Credentials Twilio : env TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN (V1
// mono-compte iTakecare, comme Grenke V1). Les senders + templates sont
// par company dans public.messaging_settings.
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { normalizeBelgianPhone } from "../_shared/elevenlabs.ts";
import {
  renderTemplateBody,
  twilioSendMessage,
  type TwilioCredentials,
} from "../_shared/twilio.ts";

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface SendRequest {
  action: "send_message";
  client_id?: string;
  conversation_id?: string;
  offer_id?: string;
  channel?: "auto" | "whatsapp" | "sms";
  text?: string;
  template_key?: string;
  variables?: Record<string, string>;
}

interface MessagingSettings {
  company_id: string;
  enabled: boolean;
  whatsapp_sender: string | null;
  sms_sender: string | null;
  messaging_service_sid: string | null;
  templates: Record<string, { content_sid?: string; body?: string; label?: string }>;
}

interface ClientRow {
  id: string;
  name: string;
  phone: string | null;
  messaging_opt_in_at: string | null;
  whatsapp_status: "unknown" | "yes" | "no";
  preferred_channel: "auto" | "whatsapp" | "sms" | "none";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ---------- auth ----------
    // Two modes:
    //  (a) System mode — trusted internal caller (e.g. the Alex voice agent
    //      tool) authenticates with the shared ELEVENLABS_TOOL_SECRET via the
    //      `x-system-secret` header and passes `x-system-company-id`. No user.
    //  (b) User mode (default) — JWT bearer, same pattern as grenke-api.
    let companyId: string;
    let agentName: string;
    const systemSecret = Deno.env.get("ELEVENLABS_TOOL_SECRET");
    const providedSystem = req.headers.get("x-system-secret");
    if (systemSecret && providedSystem && providedSystem === systemSecret) {
      const sysCompany = req.headers.get("x-system-company-id");
      if (!sysCompany) {
        return jsonResponse({ success: false, error: "missing_system_company" }, 400);
      }
      companyId = sysCompany;
      agentName = "Alex (IA)";
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ success: false, error: "unauthorized" }, 401);
      }
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: claims, error: claimsError } = await userSupabase.auth.getUser(token);
      if (claimsError || !claims?.user) {
        return jsonResponse({ success: false, error: "invalid_token" }, 401);
      }
      const { data: profile } = await userSupabase
        .from("profiles")
        .select("company_id, first_name, last_name")
        .eq("id", claims.user.id)
        .single();
      if (!profile?.company_id) {
        return jsonResponse({ success: false, error: "no_company_for_user" }, 403);
      }
      companyId = profile.company_id;
      agentName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Agent";
    }

    const body = (await req.json().catch(() => null)) as SendRequest | null;
    if (!body || body.action !== "send_message") {
      return jsonResponse({ success: false, error: "invalid_action" }, 400);
    }

    // ---------- settings + credentials ----------
    const { data: settings } = await adminSupabase
      .from("messaging_settings")
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle() as { data: MessagingSettings | null };
    if (!settings?.enabled) {
      return jsonResponse({
        success: false,
        error: "messaging_disabled",
        message: "La messagerie WhatsApp/SMS n'est pas activée pour cette société (Settings → Intégrations).",
      }, 412);
    }
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!accountSid || !authToken) {
      return jsonResponse({
        success: false,
        error: "twilio_credentials_missing",
        message: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN ne sont pas configurés dans les secrets des edge functions.",
      }, 412);
    }
    const creds: TwilioCredentials = { accountSid, authToken };

    // ---------- résolution conversation / client / téléphone ----------
    let conversation: {
      id: string; channel: string; client_id: string | null;
      client_phone: string | null; last_inbound_at: string | null;
    } | null = null;
    let client: ClientRow | null = null;

    if (body.conversation_id) {
      const { data } = await adminSupabase
        .from("chat_conversations")
        .select("id, company_id, channel, client_id, client_phone, last_inbound_at")
        .eq("id", body.conversation_id)
        .maybeSingle();
      if (!data || data.company_id !== companyId) {
        return jsonResponse({ success: false, error: "conversation_not_found" }, 404);
      }
      conversation = data;
      if (data.client_id) {
        const { data: c } = await adminSupabase
          .from("clients")
          .select("id, name, phone, messaging_opt_in_at, whatsapp_status, preferred_channel")
          .eq("id", data.client_id)
          .maybeSingle();
        client = c as ClientRow | null;
      }
    } else if (body.client_id) {
      const { data: c, error } = await adminSupabase
        .from("clients")
        .select("id, name, phone, messaging_opt_in_at, whatsapp_status, preferred_channel, company_id")
        .eq("id", body.client_id)
        .maybeSingle();
      if (error || !c || (c as { company_id: string }).company_id !== companyId) {
        return jsonResponse({ success: false, error: "client_not_found" }, 404);
      }
      client = c as unknown as ClientRow;
    } else {
      return jsonResponse({ success: false, error: "client_id or conversation_id required" }, 400);
    }

    const phone = conversation?.client_phone ?? normalizeBelgianPhone(client?.phone);
    if (!phone) {
      return jsonResponse({
        success: false,
        error: "no_phone",
        message: "Le client n'a pas de numéro de téléphone valide (format belge/E.164 attendu).",
      }, 422);
    }

    if (client?.preferred_channel === "none") {
      return jsonResponse({
        success: false,
        error: "client_opted_out",
        message: "Ce client a désactivé les messages WhatsApp/SMS.",
      }, 422);
    }

    // ---------- choix du canal ----------
    let channel: "whatsapp" | "sms";
    let channelForced = false;
    if (body.channel && body.channel !== "auto") { channel = body.channel; channelForced = true; }
    else if (conversation && conversation.channel !== "web") channel = conversation.channel as "whatsapp" | "sms";
    else if (client?.preferred_channel === "whatsapp" || client?.preferred_channel === "sms") channel = client.preferred_channel;
    else channel = client?.whatsapp_status === "no" ? "sms" : "whatsapp";

    // En mode auto, si le sender WhatsApp n'est pas encore configuré
    // (onboarding Meta en cours), on bascule en SMS plutôt que d'échouer.
    if (channel === "whatsapp" && !channelForced && !settings.whatsapp_sender && !settings.messaging_service_sid && settings.sms_sender) {
      channel = "sms";
    }

    const sender = channel === "whatsapp" ? settings.whatsapp_sender : settings.sms_sender;
    if (!sender && !settings.messaging_service_sid) {
      return jsonResponse({
        success: false,
        error: "sender_not_configured",
        message: `Aucun numéro expéditeur ${channel} configuré dans messaging_settings.`,
      }, 412);
    }

    // ---------- contenu : template ou message libre ----------
    const template = body.template_key ? settings.templates?.[body.template_key] : undefined;
    if (body.template_key && !template) {
      return jsonResponse({ success: false, error: "unknown_template", template_key: body.template_key }, 400);
    }
    const variables = body.variables ?? {};
    // Le body SMS rendu sert aussi de fallback si le WhatsApp échoue, et de
    // texte affiché dans l'inbox pour les envois par template.
    const smsBody = template?.body ? renderTemplateBody(template.body, variables) : (body.text ?? "");
    if (!template && !body.text?.trim()) {
      return jsonResponse({ success: false, error: "empty_message" }, 400);
    }

    // ---------- fenêtre 24 h (WhatsApp freeform uniquement) ----------
    if (channel === "whatsapp" && !template) {
      const lastInbound = conversation?.last_inbound_at ? new Date(conversation.last_inbound_at).getTime() : 0;
      if (Date.now() - lastInbound > WHATSAPP_WINDOW_MS) {
        return jsonResponse({
          success: false,
          error: "window_closed",
          message: "La fenêtre de 24 h WhatsApp est fermée — utilisez un template approuvé pour relancer la conversation.",
        }, 422);
      }
    }

    // ---------- conversation (trouver ou créer) ----------
    if (!conversation || conversation.channel === "web") {
      const { data: existing } = await adminSupabase
        .from("chat_conversations")
        .select("id, channel, client_id, client_phone, last_inbound_at")
        .eq("company_id", companyId)
        .eq("channel", channel)
        .eq("client_phone", phone)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        conversation = existing;
      } else {
        const { data: created, error: convErr } = await adminSupabase
          .from("chat_conversations")
          .insert({
            company_id: companyId,
            channel,
            client_id: client?.id ?? null,
            client_phone: phone,
            visitor_name: client?.name ?? phone,
            status: "active",
          })
          .select("id, channel, client_id, client_phone, last_inbound_at")
          .single();
        if (convErr || !created) {
          return jsonResponse({ success: false, error: "conversation_create_failed", message: convErr?.message }, 500);
        }
        conversation = created;
      }
    }

    // ---------- log du message (queued) puis envoi Twilio ----------
    const { data: msg, error: msgErr } = await adminSupabase
      .from("chat_messages")
      .insert({
        conversation_id: conversation.id,
        sender_type: "agent",
        sender_id: claims.user.id,
        sender_name: agentName,
        message: smsBody || `[template ${body.template_key}]`,
        message_type: "text",
        direction: "outbound",
        delivery_status: "queued",
        template_key: body.template_key ?? null,
        metadata: {
          channel,
          offer_id: body.offer_id ?? null,
          variables,
          sms_body: smsBody,
          to: phone,
        },
      })
      .select("id")
      .single();
    if (msgErr || !msg) {
      return jsonResponse({ success: false, error: "message_log_failed", message: msgErr?.message }, 500);
    }

    const statusCallback = `${supabaseUrl}/functions/v1/messaging-webhook?kind=status&company=${companyId}`;
    const to = channel === "whatsapp" ? `whatsapp:${phone}` : phone;
    const result = await twilioSendMessage(creds, {
      from: sender ?? "",
      to,
      messagingServiceSid: settings.messaging_service_sid ?? undefined,
      // WhatsApp + template approuvé → ContentSid ; sinon Body.
      contentSid: channel === "whatsapp" ? template?.content_sid : undefined,
      contentVariables: channel === "whatsapp" && template?.content_sid ? variables : undefined,
      body: channel === "whatsapp" && template?.content_sid ? undefined : smsBody,
      statusCallback,
    });

    await adminSupabase
      .from("chat_messages")
      .update(result.ok
        ? { provider_sid: result.sid, delivery_status: result.status ?? "sent" }
        : { delivery_status: "failed", delivery_error: `${result.errorCode}: ${result.errorMessage}` })
      .eq("id", msg.id);

    if (!result.ok) {
      return jsonResponse({
        success: false,
        error: "twilio_send_failed",
        message: result.errorMessage,
        error_code: result.errorCode,
        channel,
      }, 502);
    }

    await adminSupabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversation.id);

    return jsonResponse({
      success: true,
      conversation_id: conversation.id,
      message_id: msg.id,
      provider_sid: result.sid,
      channel,
      to: phone,
    });
  } catch (e) {
    console.error("[messaging-send] unexpected error:", e);
    return jsonResponse({
      success: false,
      error: "internal_error",
      message: e instanceof Error ? e.message : String(e),
    }, 500);
  }
});
