// ElevenLabs server-side tool endpoint: report_blockers.
// Called directly by the Alex agent during a call to record what's blocking
// the client from sending their KYC documents. Authenticated via shared
// secret in `x-tool-secret` header (configured in the agent tool).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return text(405, "Method not allowed");

  const expected = Deno.env.get("ELEVENLABS_TOOL_SECRET");
  if (!expected) {
    console.error("[report-blockers] ELEVENLABS_TOOL_SECRET not configured");
    return text(500, "Tool secret not configured");
  }
  const provided = req.headers.get("x-tool-secret");
  if (!provided || !constantTimeEq(provided, expected)) {
    return text(401, "Unauthorized");
  }

  let body: any;
  try { body = await req.json(); } catch {
    return text(400, "Invalid JSON");
  }

  // ElevenLabs sends the LLM-shaped args directly per our declared schema.
  // Expected shape: { voice_call_id, blockers: string[] }.
  const voiceCallId: string | undefined = body.voice_call_id;
  const blockers: unknown = body.blockers;

  if (!voiceCallId || typeof voiceCallId !== "string") {
    return text(400, "Missing voice_call_id");
  }
  if (!Array.isArray(blockers) || !blockers.every((b) => typeof b === "string")) {
    return text(400, "blockers must be an array of strings");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase
    .from("voice_calls")
    .select("id")
    .eq("id", voiceCallId)
    .maybeSingle();

  if (!existing) return text(404, "voice_call not found");

  const { error } = await supabase
    .from("voice_calls")
    .update({ client_blockers: blockers })
    .eq("id", voiceCallId);

  if (error) {
    console.error("[report-blockers] update failed", error);
    return text(500, "Failed to record blockers");
  }

  // ElevenLabs feeds whatever we return back to the LLM. Keep it short.
  return new Response(
    JSON.stringify({ ok: true, recorded: blockers.length }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function text(status: number, msg: string) {
  return new Response(msg, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain" },
  });
}
