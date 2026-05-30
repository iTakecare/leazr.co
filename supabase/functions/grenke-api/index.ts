// Grenke Leasing API proxy — Phase 1.
//
// One action shipped today:
//   - "echo"  : GET /echo against the Grenke Leasing API. Health-check used
//               by the Settings UI's "Test connection" button. Confirms that
//               the cert+key in Vault successfully establish an mTLS session.
//
// Future actions (stubs return 501 for now):
//   - "calculate"            : POST /basic/v1/calculate
//   - "submit_offer"         : POST /basic/v1/requests
//   - "get_status"           : GET  /basic/v1/requests/{financingId}
//   - "get_contract_doc"     : POST .../contractdocument
//   - "upload_document"      : POST .../calculationSets/.../documents/base64
//   - "refresh_reference_data": GET /basic/v1/{legalforms,objecttypes,customslas}
//
// Auth + cert flow:
//   1. Caller sends a Bearer token (the user's session token).
//   2. We resolve the user's company_id via profiles.
//   3. We call the SECURITY DEFINER RPC get_grenke_credentials(company, env)
//      with service_role to fetch the cert/key from Supabase Vault.
//   4. We mount cert+key on Deno.createHttpClient and proxy the call.
//
// See: docs/grenke-api/INTEGRATION.md

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// We DON'T call Grenke's API directly. Their server uses TLS 1.2 post-handshake
// client-cert auth (renegotiation), which rustls — the TLS lib behind Deno's
// fetch — refuses to support (rustls policy, not a bug). Curl + OpenSSL handle
// it fine, so we relay through a tiny nginx mTLS proxy on iTakecare's VPS.
// See docs/grenke-api/INTEGRATION.md and the deploy at /opt/grenke-proxy/ on
// itcmdm-vps.
const GRENKE_PROXY_BASE = "https://grenke-proxy.itakecare.be";

const GRENKE_UPSTREAM_PATH = {
  // The proxy is a single host; we encode the target environment in the
  // request path so the same proxy can later route both UAT and Production.
  // (Today the proxy only handles production — UAT would need its own
  //  cert/key bind-mount and a /uat/ location block.)
  uat: "/uat",
  production: "",
} as const;

type Environment = keyof typeof GRENKE_UPSTREAM_PATH;

interface GrenkeRequest {
  action:
    | "echo"
    | "calculate"
    | "submit_offer"
    | "get_status"
    | "get_contract_doc"
    | "upload_document"
    | "refresh_reference_data";
  environment?: Environment;
  // future fields (calculate, submit_offer, …) live under `payload`
  payload?: Record<string, unknown>;
  financing_id?: string;
}

interface Credentials {
  cert: string;
  key: string;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  console.log(`[grenke-api] ${req.method} request received`);
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
    let body: GrenkeRequest;
    try {
      body = (await req.json()) as GrenkeRequest;
    } catch {
      return jsonResponse({ success: false, error: "invalid_json_body" }, 400);
    }

    const action = body.action;
    const environment: Environment = body.environment ?? "production";

    if (!(environment in GRENKE_UPSTREAM_PATH)) {
      return jsonResponse({ success: false, error: "invalid_environment" }, 400);
    }

    // ---------- credentials ----------
    // Note: cert+key are NOT used here anymore — the VPS proxy holds them.
    // We still load the row so we can fail fast with a clear error if the
    // tenant hasn't gone through the cert upload flow yet (which is the
    // signal that they've completed the Grenke onboarding).
    const creds = await loadCredentials(adminSupabase, companyId, environment);

    if (!creds) {
      // No cert in Vault yet — Settings UI is supposed to surface this state.
      return jsonResponse({
        success: false,
        error: "credentials_missing",
        environment,
        message:
          "No Grenke client certificate is configured for this company on " +
          environment + ". Upload your signed certificate via Settings → Integrations → Grenke.",
      }, 412);
    }

    // ---------- dispatch ----------
    switch (action) {
      case "echo":
        return await handleEcho(environment, creds);

      case "calculate":
        return await handleCalculate(environment, creds, body.payload ?? {});

      case "submit_offer":
      case "get_status":
      case "get_contract_doc":
      case "upload_document":
      case "refresh_reference_data":
        return jsonResponse({
          success: false,
          error: "not_implemented",
          action,
          message: "Action will ship in a later phase. See docs/grenke-api/INTEGRATION.md.",
        }, 501);

      default:
        return jsonResponse({ success: false, error: "unknown_action", action }, 400);
    }
  } catch (error) {
    console.error("[grenke-api] Unexpected error:", error);
    return jsonResponse({
      success: false,
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error),
    }, 500);
  }
});

// =====================================================================
// Credentials — fetched server-side via SECURITY DEFINER RPC.
// =====================================================================
async function loadCredentials(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
): Promise<Credentials | null> {
  const { data, error } = await adminSupabase.rpc("get_grenke_credentials", {
    p_company_id: companyId,
    p_environment: environment,
  });
  if (error) {
    console.error("[grenke-api] get_grenke_credentials failed:", error);
    return null;
  }
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.cert_pem || !row?.key_pem) return null;
  return { cert: row.cert_pem, key: row.key_pem };
}

// =====================================================================
// Low-level fetch wrapper — relays through the iTakecare nginx mTLS proxy.
// The `creds` parameter is intentionally unused at this layer (kept in the
// signature so callers don't need to know about the proxy redirection);
// the actual cert+key are bind-mounted into the nginx container at
// /opt/grenke-proxy/certs/ on itcmdm-vps. See docs/grenke-api/INTEGRATION.md.
// =====================================================================
async function grenkeFetch(
  environment: Environment,
  path: string,
  init: RequestInit,
  _creds: Credentials,
): Promise<Response> {
  const proxySecret = Deno.env.get("GRENKE_PROXY_SECRET");
  if (!proxySecret) {
    throw new Error(
      "GRENKE_PROXY_SECRET is not configured. Set it via " +
      "'supabase secrets set GRENKE_PROXY_SECRET=...' — value lives in the " +
      "nginx config at /opt/grenke-proxy/conf/nginx.conf on itcmdm-vps.",
    );
  }

  const url = GRENKE_PROXY_BASE + GRENKE_UPSTREAM_PATH[environment] + path;
  console.log(`[grenke-api] grenkeFetch via proxy → ${init.method ?? "GET"} ${url}`);

  const headers = new Headers(init.headers);
  headers.set("X-Proxy-Secret", proxySecret);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  return await fetch(url, { ...init, headers });
}

// =====================================================================
// echo — GET /echo (smoke test; just proves cert works)
// =====================================================================
async function handleEcho(environment: Environment, creds: Credentials): Promise<Response> {
  let response: Response;
  try {
    response = await grenkeFetch(environment, "/echo", { method: "GET" }, creds);
  } catch (e) {
    return jsonResponse({
      success: false,
      error: "network_or_tls_error",
      environment,
      message: e instanceof Error ? e.message : String(e),
    }, 502);
  }

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* /echo returns a plain string like `"Echo: 22.06.2023 15:09:18"` */
  }

  return jsonResponse({
    success: response.ok,
    status: response.status,
    environment,
    data: parsed,
  }, response.ok ? 200 : 502);
}

// =====================================================================
// calculate — POST /basic/v1/calculate
//
// Body shape (Grenke):
//   {
//     FinancingAmount: number   (required)
//     ProductType:    string    (required: ClassicLease | PartialAmortisation | Rent | AllIn | AllIn3 | AllIn6 | AllInWithoutBackup | OfficeDirect)
//     PaymentFrequency: string  (required: "Monthly" | "Quarterly")
//     Period?:         number   (1..n months — omit to get all available periods)
//     PaymentMethod?:  string   ("Invoice" | "DirectDebit")
//     Currency?:       string   (ISO 4217, e.g. "EUR")
//     RecurringService?: number
//     HasRepurchase?:  boolean
//     Commission?:     number
//   }
//
// Response on 200: { Items: [{ Period, MonthlyTotalInstalment, FinancingAmount, Currency, ... }] }
// Response on 500 with "No condition list found": the cert is fine but Grenke
//   hasn't yet provisioned a leasing condition grid for this account. That's
//   a business onboarding step, not a code bug — we surface it explicitly
//   so the UI can show a useful message.
// =====================================================================

interface CalculateInput {
  FinancingAmount: number;
  ProductType?: string;
  PaymentFrequency?: string;
  Period?: number;
  PaymentMethod?: string;
  Currency?: string;
  RecurringService?: number;
  HasRepurchase?: boolean;
  Commission?: number;
}

async function handleCalculate(
  environment: Environment,
  creds: Credentials,
  payload: Record<string, unknown>,
): Promise<Response> {
  // Light validation — fail fast on missing required fields. Grenke's own
  // 400 messages are useful but we save a round-trip when the input is
  // obviously wrong (and we can tell the caller what's missing).
  const input = payload as CalculateInput;
  if (typeof input.FinancingAmount !== "number" || !(input.FinancingAmount > 0)) {
    return jsonResponse({
      success: false,
      error: "validation_error",
      field: "FinancingAmount",
      message: "FinancingAmount must be a positive number",
    }, 400);
  }

  // Defaults that mirror iTakecare's standard offer — overridable via payload.
  const body: CalculateInput = {
    Currency: "EUR",
    ProductType: "ClassicLease",
    PaymentFrequency: "Monthly",
    ...input,
  };

  let response: Response;
  try {
    response = await grenkeFetch(
      environment,
      "/basic/v1/calculate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      creds,
    );
  } catch (e) {
    return jsonResponse({
      success: false,
      error: "network_or_tls_error",
      environment,
      message: e instanceof Error ? e.message : String(e),
    }, 502);
  }

  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch { /* keep raw */ }

  if (response.ok) {
    return jsonResponse({
      success: true,
      status: response.status,
      environment,
      input: body,
      data: parsed,
    }, 200);
  }

  // Special-case the "no condition list" error — it's frequent during
  // onboarding and the generic 500 hides the actual cause.
  const grenkeErr = parsed as { Message?: string; Details?: string; CorrelationId?: string } | undefined;
  if (response.status === 500 && grenkeErr?.Details?.includes("No condition list")) {
    return jsonResponse({
      success: false,
      error: "grenke_account_not_provisioned",
      status: response.status,
      environment,
      message:
        "Authentication works but Grenke has not yet configured the leasing " +
        "condition list (pricing / products / markets) for this API account. " +
        "Contact your Grenke representative to enable conditions for " +
        "ClassicLease in BE/FR/LU.",
      grenke_response: parsed,
      input: body,
    }, 503); // 503 = downstream-not-ready, distinct from 5xx app bugs
  }

  return jsonResponse({
    success: false,
    error: "grenke_error",
    status: response.status,
    environment,
    grenke_response: parsed,
    input: body,
  }, response.status >= 500 ? 502 : response.status);
}
