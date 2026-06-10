// Twilio helper partagé — envoi WhatsApp/SMS + validation de signature.
//
// Un seul endpoint Twilio sert les deux canaux : le canal est porté par le
// préfixe du numéro ("whatsapp:+324…" vs "+324…"). Les templates WhatsApp
// (pré-approuvés par Meta) s'envoient via ContentSid + ContentVariables ;
// le SMS et le freeform WhatsApp (fenêtre 24 h) via Body.

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

export interface TwilioSendParams {
  from: string; // "whatsapp:+32…" ou "+32…" / sender alphanumérique SMS
  to: string;   // idem (préfixe whatsapp: pour le canal WhatsApp)
  body?: string;
  contentSid?: string;            // template WhatsApp approuvé (HX…)
  contentVariables?: Record<string, string>; // {"1": "Jean", "2": "…"}
  statusCallback?: string;
  messagingServiceSid?: string;   // alternative à `from`
}

export interface TwilioMessageResult {
  ok: boolean;
  sid?: string;
  status?: string;
  errorCode?: number | null;
  errorMessage?: string;
  raw?: unknown;
}

export async function twilioSendMessage(
  creds: TwilioCredentials,
  params: TwilioSendParams,
): Promise<TwilioMessageResult> {
  const form = new URLSearchParams();
  form.set("To", params.to);
  if (params.messagingServiceSid) form.set("MessagingServiceSid", params.messagingServiceSid);
  else form.set("From", params.from);
  if (params.contentSid) {
    form.set("ContentSid", params.contentSid);
    if (params.contentVariables) form.set("ContentVariables", JSON.stringify(params.contentVariables));
  }
  if (params.body) form.set("Body", params.body);
  if (params.statusCallback) form.set("StatusCallback", params.statusCallback);

  const resp = await fetch(`${TWILIO_API_BASE}/Accounts/${creds.accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${creds.accountSid}:${creds.authToken}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await resp.json().catch(() => null) as Record<string, unknown> | null;
  if (!resp.ok || !data) {
    return {
      ok: false,
      errorCode: (data?.code as number) ?? resp.status,
      errorMessage: (data?.message as string) ?? `HTTP ${resp.status}`,
      raw: data,
    };
  }
  return {
    ok: true,
    sid: data.sid as string,
    status: data.status as string,
    errorCode: (data.error_code as number | null) ?? null,
    raw: data,
  };
}

// Validation X-Twilio-Signature : HMAC-SHA1 base64 de (url + clés triées +
// valeurs concaténées) avec l'auth token. https://www.twilio.com/docs/usage/security
export async function validateTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): Promise<boolean> {
  if (!signature) return false;
  const sorted = Object.keys(params).sort();
  let data = url;
  for (const key of sorted) data += key + params[key];

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // Comparaison constante (les deux sont des base64 courts).
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

// Rend un body SMS à partir d'un template "…{{1}}…{{2}}…" + variables.
export function renderTemplateBody(body: string, variables: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => variables[k] ?? "");
}

// Codes d'erreur Twilio signifiant "ce numéro n'a pas WhatsApp" — déclenchent
// le fallback SMS + la mémorisation whatsapp_status='no' sur le client.
// 63003: Channel could not find To address ; 63024: invalid recipient.
export const TWILIO_NOT_WHATSAPP_ERRORS = new Set([63003, 63024]);
