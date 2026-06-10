// =====================================================================
// voice-token — délivre un Access Token Twilio Voice au softphone navigateur.
//
// Le token est un JWT (HS256) signé avec le secret de l'API Key Twilio,
// portant un VoiceGrant (outgoing → notre TwiML App). Le SDK
// @twilio/voice-sdk l'utilise pour s'enregistrer et passer des appels.
// Identité = profil de l'utilisateur (pour relier l'appel à l'agent).
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { cty: "twilio-fpa;v=1", typ: "JWT", alg: "HS256" };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error } = await userSupabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !claims?.user) return json({ success: false, error: "unauthorized" }, 401);

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID");
    const apiKeySecret = Deno.env.get("TWILIO_API_KEY_SECRET");
    const appSid = Deno.env.get("TWILIO_TWIML_APP_SID");
    if (!accountSid || !apiKeySid || !apiKeySecret || !appSid) {
      return json({ success: false, error: "twilio_voice_not_configured" }, 412);
    }

    const identity = `agent_${claims.user.id.replace(/-/g, "").slice(0, 24)}`;
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      jti: `${apiKeySid}-${now}`,
      iss: apiKeySid,
      sub: accountSid,
      iat: now,
      exp: now + 3600,
      grants: {
        identity,
        voice: {
          incoming: { allow: true },
          outgoing: { application_sid: appSid },
        },
      },
    };
    const token = await signJwt(payload, apiKeySecret);
    return json({ success: true, token, identity });
  } catch (e) {
    console.error("[voice-token]", e);
    return json({ success: false, error: "internal_error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
