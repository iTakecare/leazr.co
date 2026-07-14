// =====================================================================
// messaging-webhook — webhooks Twilio (public, verify_jwt=false).
//
// Deux kinds, distingués par query param :
//   ?kind=inbound&company=<uuid>  → message entrant (WhatsApp ou SMS)
//   ?kind=status&company=<uuid>   → callback de statut d'un envoi
//
// Sécurité : chaque requête est authentifiée par X-Twilio-Signature
// (HMAC-SHA1 de l'URL + params avec TWILIO_AUTH_TOKEN). Pas de signature
// valide → 403.
//
// Entrant :
//   - identifie le client par téléphone (normalisé E.164, comparaison sur
//     le numéro complet), trouve/crée la conversation du canal
//   - last_inbound_at = now (ouvre la fenêtre 24 h WhatsApp)
//   - inbound WhatsApp ⇒ whatsapp_status='yes' sur le client
//   - médias rapatriés dans le bucket privé chat-media
//
// Statut :
//   - met à jour delivery_status/delivery_error du message (realtime pousse
//     les ✓✓ dans l'inbox)
//   - si un envoi WhatsApp échoue avec un code "pas de WhatsApp"
//     (63003/63024) : whatsapp_status='no' + renvoi automatique en SMS
//     (une seule fois, métadonnée fallback_done).
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { normalizeBelgianPhone } from "../_shared/elevenlabs.ts";
import {
  TWILIO_NOT_WHATSAPP_ERRORS,
  TWILIO_WHATSAPP_WINDOW_ERRORS,
  twilioSendMessage,
  validateTwilioSignature,
} from "../_shared/twilio.ts";

const twiml = () =>
  new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });

const extFromContentType = (ct: string): string => {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
  };
  return map[ct] ?? "bin";
};

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  if (!authToken || !accountSid) return new Response("Twilio not configured", { status: 500 });

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const companyId = url.searchParams.get("company");
  if (!companyId || (kind !== "inbound" && kind !== "status")) {
    return new Response("Bad request", { status: 400 });
  }

  // ---------- signature Twilio ----------
  // Twilio signe l'URL publique exacte. Derrière la gateway Supabase,
  // req.url peut porter un host interne → on reconstruit avec SUPABASE_URL.
  const formData = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") params[k] = v;
  }
  const publicUrl = `${supabaseUrl}/functions/v1/messaging-webhook${url.search}`;
  const signatureOk = await validateTwilioSignature(
    authToken,
    publicUrl,
    params,
    req.headers.get("X-Twilio-Signature"),
  );
  if (!signatureOk) {
    console.error("[messaging-webhook] invalid Twilio signature for", publicUrl);
    return new Response("Forbidden", { status: 403 });
  }

  try {
    if (kind === "status") return await handleStatus(adminSupabase, companyId, params, supabaseUrl);
    return await handleInbound(adminSupabase, companyId, params, { accountSid, authToken });
  } catch (e) {
    console.error("[messaging-webhook] error:", e);
    // 200 quand même : Twilio retente sinon, et on ne veut pas de tempête
    // de retries sur une erreur de notre côté (le message est loggé).
    return twiml();
  }
});

// ---------------------------------------------------------------------
// Message entrant
// ---------------------------------------------------------------------
async function handleInbound(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  p: Record<string, string>,
  twilioCreds: { accountSid: string; authToken: string },
): Promise<Response> {
  const rawFrom = p.From ?? "";
  const channel: "whatsapp" | "sms" = rawFrom.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const phone = normalizeBelgianPhone(rawFrom.replace(/^whatsapp:/, ""));
  if (!phone) return twiml();

  // --- retrouver le client par téléphone (comparaison E.164 en JS : les
  // numéros en base sont en format libre "+32 470/12.34.56", "0470123456"…) ---
  const { data: candidates } = await adminSupabase
    .from("clients")
    .select("id, name, phone, whatsapp_status")
    .eq("company_id", companyId)
    .not("phone", "is", null)
    .limit(5000);
  const client = (candidates ?? []).find(
    (c) => normalizeBelgianPhone((c as { phone: string }).phone) === phone,
  ) as { id: string; name: string; whatsapp_status: string } | undefined;

  // --- conversation du canal pour ce numéro ---
  const { data: existing } = await adminSupabase
    .from("chat_conversations")
    .select("id, client_id")
    .eq("company_id", companyId)
    .eq("channel", channel)
    .eq("client_phone", phone)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId: string;
  const now = new Date().toISOString();
  if (existing) {
    conversationId = existing.id;
    await adminSupabase
      .from("chat_conversations")
      .update({
        last_inbound_at: now,
        updated_at: now,
        status: "waiting",
        // rattachement a posteriori si le client a été créé entre-temps
        ...(client && !existing.client_id ? { client_id: client.id } : {}),
      })
      .eq("id", conversationId);
  } else {
    const { data: created, error } = await adminSupabase
      .from("chat_conversations")
      .insert({
        company_id: companyId,
        channel,
        client_id: client?.id ?? null,
        client_phone: phone,
        visitor_name: client?.name ?? p.ProfileName ?? phone,
        status: "waiting",
        last_inbound_at: now,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[messaging-webhook] conversation insert failed:", error?.message);
      return twiml();
    }
    conversationId = created.id;
  }

  // --- apprentissage : ce numéro a WhatsApp ---
  if (client && channel === "whatsapp" && client.whatsapp_status !== "yes") {
    await adminSupabase
      .from("clients")
      .update({ whatsapp_status: "yes", whatsapp_checked_at: now })
      .eq("id", client.id);
  }

  const senderName = client?.name ?? p.ProfileName ?? phone;

  // --- cloche admin : un message entrant doit se voir même hors de l'inbox ---
  const preview = p.Body?.trim() ? p.Body.trim().slice(0, 120) : "📎 Pièce jointe";
  await adminSupabase.from("admin_notifications").insert({
    company_id: companyId,
    type: "messaging_inbound",
    title: channel === "whatsapp" ? "Nouveau message WhatsApp 💬" : "Nouveau SMS 📱",
    message: `${senderName} : ${preview}`,
    metadata: { conversation_id: conversationId, channel, from: phone, client_id: client?.id ?? null },
  });

  const numMedia = Number(p.NumMedia ?? "0") || 0;
  const bodyText = p.Body?.trim() ?? "";

  // --- texte ---
  // Pour un média WhatsApp, Body contient le nom du fichier / la légende : on
  // le porte sur la pièce jointe (voir plus bas) plutôt que d'ajouter un
  // message texte séparé qui ferait doublon. Message texte seul → insertion.
  if (bodyText && numMedia === 0) {
    await adminSupabase.from("chat_messages").insert({
      conversation_id: conversationId,
      sender_type: "visitor",
      sender_name: senderName,
      message: bodyText,
      message_type: "text",
      direction: "inbound",
      provider_sid: p.MessageSid ?? null,
      metadata: { channel, from: phone },
    });
  }

  // --- médias → bucket privé chat-media ---
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = p[`MediaUrl${i}`];
    const contentType = p[`MediaContentType${i}`] ?? "application/octet-stream";
    if (!mediaUrl) continue;
    // Le nom de fichier/légende (Body) n'accompagne que la 1re pièce jointe.
    const caption = i === 0 && bodyText ? bodyText : "Pièce jointe";
    try {
      const mediaResp = await fetch(mediaUrl, {
        headers: {
          Authorization: "Basic " + btoa(`${twilioCreds.accountSid}:${twilioCreds.authToken}`),
        },
      });
      if (!mediaResp.ok) throw new Error(`media fetch HTTP ${mediaResp.status}`);
      const bytes = new Uint8Array(await mediaResp.arrayBuffer());
      const path = `${companyId}/${conversationId}/${p.MessageSid ?? crypto.randomUUID()}-${i}.${extFromContentType(contentType)}`;
      const { error: upErr } = await adminSupabase.storage
        .from("chat-media")
        .upload(path, bytes, { contentType, upsert: true });
      if (upErr) throw new Error(upErr.message);
      await adminSupabase.from("chat_messages").insert({
        conversation_id: conversationId,
        sender_type: "visitor",
        sender_name: senderName,
        message: caption,
        message_type: "media",
        direction: "inbound",
        provider_sid: p.MessageSid ?? null,
        media_path: path,
        media_content_type: contentType,
        metadata: { channel, from: phone },
      });
    } catch (e) {
      console.error(`[messaging-webhook] media ${i} failed:`, e);
    }
  }

  // --- assistant IA : analyse asynchrone de la conversation (suggestions
  // link_offer / task / classify_document / reply, validées dans l'inbox).
  // waitUntil garde la lambda en vie après la réponse à Twilio — l'analyse
  // Claude (~2-5 s) ne retarde pas le webhook.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const analysis = fetch(`${supabaseUrl}/functions/v1/messaging-ai`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "analyze_conversation", conversation_id: conversationId, company_id: companyId }),
  }).then((r) => {
    if (!r.ok) console.error(`[messaging-webhook] messaging-ai HTTP ${r.status}`);
  }).catch((e) => console.error("[messaging-webhook] messaging-ai failed:", e));
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(analysis);
  else await analysis;

  return twiml();
}

// ---------------------------------------------------------------------
// Callback de statut (+ fallback SMS automatique)
// ---------------------------------------------------------------------
async function handleStatus(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  p: Record<string, string>,
  supabaseUrl: string,
): Promise<Response> {
  const sid = p.MessageSid;
  const status = p.MessageStatus; // queued|sent|delivered|read|failed|undelivered
  if (!sid || !status) return new Response("OK", { status: 200 });

  const errorCode = p.ErrorCode ? Number(p.ErrorCode) : null;
  const { data: msg } = await adminSupabase
    .from("chat_messages")
    .select("id, conversation_id, template_key, delivery_status, metadata")
    .eq("provider_sid", sid)
    .maybeSingle();

  if (msg) {
    // "read" ne doit pas régresser vers "delivered" si les callbacks
    // arrivent dans le désordre.
    const rank: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 };
    const isRegression = (rank[status] ?? 9) < (rank[msg.delivery_status as string] ?? -1)
      && status !== "failed" && status !== "undelivered";
    if (!isRegression) {
      await adminSupabase
        .from("chat_messages")
        .update({
          delivery_status: status,
          delivery_error: errorCode ? `${errorCode}: ${p.ErrorMessage ?? ""}`.trim() : null,
        })
        .eq("id", msg.id);
    }
  }

  // --- échec WhatsApp → fallback SMS ---
  // Deux familles d'échec déclenchent le repli SMS :
  //   • "pas de compte WhatsApp" (63003/63024) → on mémorise whatsapp_status='no'.
  //   • "fenêtre 24 h / template refusé" (63016…) → le client A WhatsApp, on NE
  //     marque PAS whatsapp_status='no', on bascule juste en SMS.
  const meta = (msg?.metadata ?? {}) as Record<string, unknown>;
  const wasWhatsApp = meta.channel === "whatsapp";
  const failed = status === "failed" || status === "undelivered";
  const notWhatsApp = errorCode !== null && TWILIO_NOT_WHATSAPP_ERRORS.has(errorCode);
  const windowOrTemplate = errorCode !== null && TWILIO_WHATSAPP_WINDOW_ERRORS.has(errorCode);

  if (msg && failed && wasWhatsApp && (notWhatsApp || windowOrTemplate) && !meta.fallback_done) {
    const { data: conv } = await adminSupabase
      .from("chat_conversations")
      .select("id, client_id, client_phone")
      .eq("id", msg.conversation_id)
      .maybeSingle();
    if (!conv?.client_phone) return new Response("OK", { status: 200 });

    // Uniquement pour "pas de compte WhatsApp" : on retient l'absence de compte.
    if (conv.client_id && notWhatsApp) {
      await adminSupabase
        .from("clients")
        .update({ whatsapp_status: "no", whatsapp_checked_at: new Date().toISOString() })
        .eq("id", conv.client_id);
    }

    const smsBody = (meta.sms_body as string) ?? "";
    const { data: settings } = await adminSupabase
      .from("messaging_settings")
      .select("sms_sender, messaging_service_sid")
      .eq("company_id", companyId)
      .maybeSingle();
    if (!smsBody.trim() || (!settings?.sms_sender && !settings?.messaging_service_sid)) {
      return new Response("OK", { status: 200 });
    }

    // marquer AVANT l'envoi pour exclure toute double exécution si Twilio
    // rejoue le callback pendant l'envoi
    await adminSupabase
      .from("chat_messages")
      .update({ metadata: { ...meta, fallback_done: true } })
      .eq("id", msg.id);

    // conversation SMS (séparée du fil whatsapp)
    let smsConvId: string;
    const { data: smsConv } = await adminSupabase
      .from("chat_conversations")
      .select("id")
      .eq("company_id", companyId)
      .eq("channel", "sms")
      .eq("client_phone", conv.client_phone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (smsConv) smsConvId = smsConv.id;
    else {
      const { data: created } = await adminSupabase
        .from("chat_conversations")
        .insert({
          company_id: companyId,
          channel: "sms",
          client_id: conv.client_id,
          client_phone: conv.client_phone,
          visitor_name: conv.client_phone,
          status: "active",
        })
        .select("id")
        .single();
      if (!created) return new Response("OK", { status: 200 });
      smsConvId = created.id;
    }

    const { data: fallbackMsg } = await adminSupabase
      .from("chat_messages")
      .insert({
        conversation_id: smsConvId,
        sender_type: "agent",
        sender_name: "Leazr (fallback SMS)",
        message: smsBody,
        message_type: "text",
        direction: "outbound",
        delivery_status: "queued",
        template_key: msg.template_key,
        metadata: { channel: "sms", fallback_of: sid, to: conv.client_phone },
      })
      .select("id")
      .single();

    const result = await twilioSendMessage(
      { accountSid: Deno.env.get("TWILIO_ACCOUNT_SID")!, authToken: Deno.env.get("TWILIO_AUTH_TOKEN")! },
      {
        from: settings.sms_sender ?? "",
        to: conv.client_phone,
        messagingServiceSid: settings.messaging_service_sid ?? undefined,
        body: smsBody,
        statusCallback: `${supabaseUrl}/functions/v1/messaging-webhook?kind=status&company=${companyId}`,
      },
    );
    if (fallbackMsg) {
      await adminSupabase
        .from("chat_messages")
        .update(result.ok
          ? { provider_sid: result.sid, delivery_status: result.status ?? "sent" }
          : { delivery_status: "failed", delivery_error: `${result.errorCode}: ${result.errorMessage}` })
        .eq("id", fallbackMsg.id);
    }
    console.log(`[messaging-webhook] WhatsApp→SMS fallback for ${sid}: ${result.ok ? result.sid : result.errorMessage}`);
  }

  return new Response("OK", { status: 200 });
}
