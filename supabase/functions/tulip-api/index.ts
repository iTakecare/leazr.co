// Tulip insurance API proxy — Phase 1 (scaffold, awaiting API doc).
//
// Auth + key flow (mirrors grenke-api):
//   1. Caller sends a Bearer token (the user's session token).
//   2. We resolve the user's company_id via profiles.
//   3. We call the SECURITY DEFINER RPC get_tulip_credentials(company, env)
//      with service_role to fetch the API key from Supabase Vault.
//   4. We attach the key as a Bearer header and proxy the call.
//
// Actions:
//   - "echo" : health-check used by the Settings UI's "Test connection" button.
//              Confirms an API key is configured. Once the Tulip API doc is in
//              hand, point TULIP_HOSTS at the real base URL + ECHO_PATH at a
//              lightweight endpoint (e.g. /ping or /me) and flip
//              `ENDPOINTS_KNOWN` to true to do a real round-trip.
//
// Future actions (return 501 until the doc lands):
//   - "quote"          : request an insurance quote for equipment
//   - "subscribe"      : underwrite / create a policy
//   - "get_policy"     : fetch policy status
//   - "cancel_policy"  : cancel a policy

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// TODO(tulip-doc): replace with the real base URLs once the API doc is available.
const TULIP_HOSTS = {
  sandbox: "https://sandbox.api.tulip.example",
  production: "https://api.tulip.example",
} as const;

// TODO(tulip-doc): set to a real lightweight endpoint and flip ENDPOINTS_KNOWN.
const ECHO_PATH = "/health";
const ENDPOINTS_KNOWN = false;

type Environment = keyof typeof TULIP_HOSTS;

interface TulipRequest {
  action: "echo" | "quote" | "subscribe" | "get_policy" | "cancel_policy";
  environment?: Environment;
  payload?: Record<string, unknown>;
  policy_id?: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // ---------- auth ----------
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
    const userId = claims.user.id;

    const { data: profile, error: profileError } = await userSupabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .single();
    if (profileError || !profile?.company_id) {
      return jsonResponse({ success: false, error: "no_company_for_user" }, 403);
    }
    const companyId: string = profile.company_id;

    // ---------- request parsing ----------
    let body: TulipRequest;
    try {
      body = (await req.json()) as TulipRequest;
    } catch {
      return jsonResponse({ success: false, error: "invalid_json_body" }, 400);
    }

    const action = body.action;
    const environment: Environment = body.environment ?? "sandbox";

    if (!TULIP_HOSTS[environment]) {
      return jsonResponse({ success: false, error: "invalid_environment" }, 400);
    }

    // ---------- credentials ----------
    const apiKey = await loadApiKey(adminSupabase, companyId, environment);

    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: "credentials_missing",
        environment,
        message:
          "No Tulip API key is configured for this company on " +
          environment + ". Add your key via Settings → Integrations → Tulip.",
      }, 412);
    }

    // ---------- dispatch ----------
    switch (action) {
      case "echo":
        return await handleEcho(environment, apiKey);

      case "quote":
      case "subscribe":
      case "get_policy":
      case "cancel_policy":
        return jsonResponse({
          success: false,
          error: "not_implemented",
          action,
          message: "Action will ship once the Tulip API documentation is available.",
        }, 501);

      default:
        return jsonResponse({ success: false, error: "unknown_action", action }, 400);
    }
  } catch (error) {
    console.error("[tulip-api] Unexpected error:", error);
    return jsonResponse({
      success: false,
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// =====================================================================
// API key — fetched server-side via SECURITY DEFINER RPC.
// =====================================================================
async function loadApiKey(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
): Promise<string | null> {
  const { data, error } = await adminSupabase.rpc("get_tulip_credentials", {
    p_company_id: companyId,
    p_environment: environment,
  });
  if (error) {
    console.error("[tulip-api] get_tulip_credentials failed:", error);
    return null;
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return row?.api_key ?? null;
}

// =====================================================================
// echo — health check.
//
// Until the real endpoints are known (ENDPOINTS_KNOWN === false) this simply
// confirms a key is present in Vault. Once the doc lands, flip the flag and
// this performs a real authenticated round-trip against ECHO_PATH.
// =====================================================================
async function handleEcho(environment: Environment, apiKey: string): Promise<Response> {
  if (!ENDPOINTS_KNOWN) {
    return jsonResponse({
      success: true,
      environment,
      pending_api_doc: true,
      message:
        "Clé API Tulip trouvée et déchiffrée. Le test réseau réel sera activé " +
        "dès réception de la documentation de l'API Tulip.",
    }, 200);
  }

  let response: Response;
  try {
    response = await fetch(TULIP_HOSTS[environment] + ECHO_PATH, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
  } catch (e) {
    return jsonResponse({
      success: false,
      error: "network_error",
      environment,
      message: e instanceof Error ? e.message : String(e),
    }, 502);
  }

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep raw text */
  }

  return jsonResponse({
    success: response.ok,
    status: response.status,
    environment,
    data: parsed,
  }, response.ok ? 200 : 502);
}
