// Tulip insurance API proxy.
//
// Tulip API v2 — https://docs.mytulip.io/docs/api-reference
//   - Single base URL for every environment: https://api.mytulip.io/v2
//   - The environment (sandbox vs production) is decided by *which API key*
//     is used: a test key produces test contracts, a live key real ones.
//     We keep the `environment` field only to pick the right key from Vault.
//   - Auth is a raw `key: <apiKey>` header (NOT Authorization: Bearer).
//
// Domain note: Tulip insures *contracts* (équipement loué), not "policies".
// In Leazr we insure the equipment once an offer becomes a contract.
//
// Auth + key flow (mirrors grenke-api):
//   1. Caller sends a Bearer token (the user's session token).
//   2. We resolve the user's company_id via profiles.
//   3. We call the SECURITY DEFINER RPC get_tulip_credentials(company, env)
//      with service_role to fetch the API key from Supabase Vault.
//   4. We attach the key as a `key` header and proxy the call.
//
// Actions:
//   - "echo"            : health check — GET /products (no params) to confirm
//                         the key is valid and authorized.
//   - "quote"           : POST /contracts?preview=true — computes the contract
//                         price (primes TTC) without committing anything.
//   - "subscribe"       : POST /contracts — creates the insurance contract.
//   - "get_contract"    : GET /contracts/{id} — fetch a contract.
//   - "cancel_contract" : DELETE /contracts/{id} — terminate a contract.
//
// quote/subscribe relay the caller's payload as the Tulip request body.
// Mapping a Leazr contract → a Tulip contract body lives in the caller.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TULIP_BASE_URL = "https://api.mytulip.io/v2";

type Environment = "sandbox" | "production";

interface TulipRequest {
  action: "echo" | "quote" | "subscribe" | "get_contract" | "cancel_contract";
  environment?: Environment;
  payload?: Record<string, unknown>;
  contract_id?: string;
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

    if (environment !== "sandbox" && environment !== "production") {
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
        return await tulipFetch("GET", "/products", apiKey, environment);

      case "quote":
        return await tulipFetch(
          "POST",
          "/contracts?preview=true",
          apiKey,
          environment,
          body.payload ?? {},
        );

      case "subscribe":
        return await tulipFetch(
          "POST",
          "/contracts",
          apiKey,
          environment,
          body.payload ?? {},
        );

      case "get_contract": {
        if (!body.contract_id) {
          return jsonResponse({ success: false, error: "missing_contract_id" }, 400);
        }
        return await tulipFetch(
          "GET",
          `/contracts/${encodeURIComponent(body.contract_id)}`,
          apiKey,
          environment,
        );
      }

      case "cancel_contract": {
        if (!body.contract_id) {
          return jsonResponse({ success: false, error: "missing_contract_id" }, 400);
        }
        return await tulipFetch(
          "DELETE",
          `/contracts/${encodeURIComponent(body.contract_id)}`,
          apiKey,
          environment,
          body.payload ?? {},
        );
      }

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
// Thin authenticated proxy to the Tulip API.
// =====================================================================
async function tulipFetch(
  method: "GET" | "POST" | "DELETE" | "PATCH" | "PUT",
  path: string,
  apiKey: string,
  environment: Environment,
  body?: Record<string, unknown>,
): Promise<Response> {
  const headers: Record<string, string> = {
    key: apiKey,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(TULIP_BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
  }, response.ok ? 200 : response.status);
}
