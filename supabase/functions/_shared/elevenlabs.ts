// Shared utilities for ElevenLabs Conversational AI / Agents Platform.
// API: https://elevenlabs.io/docs/api-reference/twilio/outbound-call

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

export interface ElevenLabsOutboundCallRequest {
  agent_id: string;
  agent_phone_number_id: string;
  to_number: string;
  conversation_initiation_client_data?: {
    dynamic_variables?: Record<string, string | number | boolean>;
    conversation_config_override?: {
      agent?: {
        first_message?: string;
        language?: string;
        prompt?: { prompt?: string };
      };
      tts?: { voice_id?: string };
    };
    user_id?: string;
  };
  call_recording_enabled?: boolean;
  telephony_call_config?: { ringing_timeout_secs?: number };
}

export interface ElevenLabsOutboundCallResponse {
  success: boolean;
  message?: string;
  conversation_id: string | null;
  callSid: string | null;
}

export class ElevenLabsError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

function getEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new ElevenLabsError(`Missing env var: ${name}`);
  return v;
}

export async function startElevenLabsCall(
  req: ElevenLabsOutboundCallRequest,
): Promise<ElevenLabsOutboundCallResponse> {
  const apiKey = getEnv("ELEVENLABS_API_KEY");
  const res = await fetch(`${ELEVENLABS_API_BASE}/v1/convai/twilio/outbound-call`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });

  const text = await res.text();
  let body: unknown;
  try { body = JSON.parse(text); } catch { body = text; }

  if (!res.ok) {
    throw new ElevenLabsError(
      `ElevenLabs outbound-call failed (${res.status})`,
      res.status,
      body,
    );
  }
  return body as ElevenLabsOutboundCallResponse;
}

// E.164 normalizer (Belgian default)
export function normalizeBelgianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("0032")) s = "+32" + s.slice(4);
  else if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (s.startsWith("0")) s = "+32" + s.slice(1);
  else if (!s.startsWith("+")) s = "+32" + s;
  if (!/^\+\d{8,15}$/.test(s)) return null;
  return s;
}

// Verifies the post-call webhook signature.
// Header format: "ElevenLabs-Signature: t=<unix>,v0=<hex_sha256_hmac>"
// HMAC computed over: `${timestamp}.${rawBody}` with the workspace webhook secret.
export async function verifyElevenLabsSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
  toleranceSeconds = 1800,
): Promise<{ ok: boolean; reason?: string }> {
  if (!sigHeader) return { ok: false, reason: "missing signature header" };

  const parts = sigHeader.split(",").map((p) => p.trim());
  const tPart = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v0Part = parts.find((p) => p.startsWith("v0="))?.slice(3);
  if (!tPart || !v0Part) return { ok: false, reason: "malformed signature header" };

  const timestamp = parseInt(tPart, 10);
  if (Number.isNaN(timestamp)) return { ok: false, reason: "invalid timestamp" };

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return { ok: false, reason: `timestamp drift > ${toleranceSeconds}s` };
  }

  const message = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  const expected = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected.length !== v0Part.length) return { ok: false, reason: "length mismatch" };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ v0Part.charCodeAt(i);
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: "hmac mismatch" };
}
