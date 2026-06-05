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
import { encode as base64Encode } from "https://deno.land/std@0.177.0/encoding/base64.ts";
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
//
// We reach the proxy through a Tailscale Funnel hostname instead of the direct
// grenke-proxy.itakecare.be (Hostinger's network edge was intermittently
// blackholing Supabase's rotating egress IPs, so direct SYNs never reached the
// VPS — proven by tcpdump). Funnel is an OUTBOUND connection from the VPS to
// Tailscale's edge, so inbound filtering at Hostinger no longer matters. The
// nginx proxy + mTLS to Grenke are unchanged; Funnel just fronts it. To revert
// to the direct host, set GRENKE_PROXY_BASE back to https://grenke-proxy.itakecare.be.
const GRENKE_PROXY_BASE = "https://grenke-proxy.tail334e63.ts.net";

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
    | "refresh_reference_data"
    | "build_offer_payload"
    | "backfill_product_links"
    | "poll_grenke_statuses"
    | "poll_grenke_contracts"
    | "get_esignature_config"
    | "start_esignature"
    | "reconcile_grenke_requests"
    | "link_grenke_request"
    | "reconcile_grenke_contracts"
    | "get_grenke_submissions";
  environment?: Environment;
  // future fields (calculate, submit_offer, …) live under `payload`
  payload?: Record<string, unknown>;
  financing_id?: string;
  offer_id?: string;
  // Set by the grenke-automation orchestrator to drive a per-offer action
  // server-to-server (X-Cron-Secret auth), deriving the company from the offer
  // instead of a user token. Only a small allowlist of actions is permitted.
  cron?: boolean;
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

    // ---------- cron path (no user auth) ----------
    // The status poller is invoked by pg_cron with an X-Cron-Secret header
    // instead of a user Bearer token. It runs as service-role across all
    // companies that have Grenke configured. We peek the body to detect it.
    const rawBody = await req.text();
    let earlyBody: GrenkeRequest = {} as GrenkeRequest;
    try { earlyBody = JSON.parse(rawBody) as GrenkeRequest; } catch { /* */ }

    if (earlyBody.action === "poll_grenke_statuses") {
      const cronSecret = Deno.env.get("GRENKE_CRON_SECRET");
      const provided = req.headers.get("X-Cron-Secret");
      if (!cronSecret || provided !== cronSecret) {
        return jsonResponse({ success: false, error: "unauthorized_cron" }, 401);
      }
      return await handlePollGrenkeStatuses(adminSupabase);
    }

    // Cron: refresh contract states + auto-link newly-accepted contracts across
    // all Grenke companies (the accepted-deal half of the 15-minute auto-sync).
    if (earlyBody.action === "poll_grenke_contracts") {
      const cronSecret = Deno.env.get("GRENKE_CRON_SECRET");
      const provided = req.headers.get("X-Cron-Secret");
      if (!cronSecret || provided !== cronSecret) {
        return jsonResponse({ success: false, error: "unauthorized_cron" }, 401);
      }
      return await handlePollGrenkeContracts(adminSupabase);
    }

    // ---------- cron path: per-offer pipeline actions (no user auth) ----------
    // The grenke-automation orchestrator drives submit / e-signature / status
    // for one offer at a time, server-to-server. The company is derived from
    // the offer row, and only this small allowlist of actions is reachable.
    if (earlyBody.cron === true && CRON_OFFER_ACTIONS.has(earlyBody.action)) {
      const cronSecret = Deno.env.get("GRENKE_CRON_SECRET");
      const provided = req.headers.get("X-Cron-Secret");
      if (!cronSecret || provided !== cronSecret) {
        return jsonResponse({ success: false, error: "unauthorized_cron" }, 401);
      }
      return await handleCronOfferAction(adminSupabase, earlyBody);
    }

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
    // Body was already read as text (rawBody) for the cron peek. Reuse it.
    let body: GrenkeRequest;
    try {
      body = JSON.parse(rawBody) as GrenkeRequest;
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

      case "refresh_reference_data":
        return await handleRefreshReferenceData(adminSupabase, companyId, environment, creds);

      case "build_offer_payload":
        return await handleBuildOfferPayload(adminSupabase, companyId, environment, body.offer_id);

      case "backfill_product_links":
        return await handleBackfillProductLinks(
          adminSupabase,
          companyId,
          (body.payload?.dry_run as boolean) ?? true,
        );

      case "get_status":
        return await handleGetStatus(adminSupabase, companyId, environment, creds, body.offer_id);

      case "get_esignature_config":
        return await handleGetESignatureConfig(adminSupabase, companyId, environment, creds, body.offer_id);

      case "start_esignature":
        return await handleStartESignature(adminSupabase, companyId, environment, creds, body.offer_id, body.payload ?? {});

      case "submit_offer":
        return await handleSubmitOffer(
          adminSupabase,
          companyId,
          environment,
          creds,
          body.offer_id,
          (body.payload?.force as boolean) ?? false,
        );

      case "upload_document":
        return await handleUploadDocuments(adminSupabase, companyId, environment, creds, body.offer_id, body.payload ?? {});

      case "reconcile_grenke_requests":
        return await handleReconcileGrenkeRequests(adminSupabase, companyId, environment, creds, body.payload ?? {});

      case "link_grenke_request":
        return await handleLinkGrenkeRequest(adminSupabase, companyId, environment, body.payload ?? {});

      case "reconcile_grenke_contracts":
        return await handleReconcileGrenkeContracts(adminSupabase, companyId, environment, creds, body.payload ?? {});

      case "debug_grenke_lookup":
        return await handleDebugGrenkeLookup(environment, creds, String((body.payload as { query?: string })?.query ?? ""));

      case "get_grenke_submissions":
        return await handleGetGrenkeSubmissions(adminSupabase, companyId, body.offer_id);

      case "get_contract_doc":
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

// Actions the grenke-automation orchestrator may drive per-offer via the
// X-Cron-Secret (company derived from the offer, not a user token).
const CRON_OFFER_ACTIONS = new Set<string>(["submit_offer", "start_esignature", "get_status"]);

// =====================================================================
// Cron-driven per-offer dispatch — resolves the company + environment from
// the offer row, loads credentials, and calls the same battle-tested handler
// the UI uses. Keeps all Grenke HTTP / proxy logic in this one function.
// =====================================================================
async function handleCronOfferAction(
  adminSupabase: ReturnType<typeof createClient>,
  body: GrenkeRequest,
): Promise<Response> {
  const offerId = body.offer_id;
  if (!offerId) {
    return jsonResponse({ success: false, error: "validation_error", message: "offer_id is required" }, 400);
  }
  const { data: offer, error } = await adminSupabase
    .from("offers")
    .select("company_id, grenke_environment")
    .eq("id", offerId)
    .maybeSingle();
  if (error) return jsonResponse({ success: false, error: "offer_lookup_failed", message: error.message }, 500);
  if (!offer) return jsonResponse({ success: false, error: "offer_not_found" }, 404);

  const companyId = (offer as { company_id: string }).company_id;
  const environment: Environment =
    ((offer as { grenke_environment?: string }).grenke_environment as Environment) ||
    body.environment ||
    "production";
  if (!(environment in GRENKE_UPSTREAM_PATH)) {
    return jsonResponse({ success: false, error: "invalid_environment" }, 400);
  }

  const creds = await loadCredentials(adminSupabase, companyId, environment);
  if (!creds) {
    return jsonResponse({ success: false, error: "credentials_missing", environment }, 412);
  }

  switch (body.action) {
    case "submit_offer":
      return await handleSubmitOffer(
        adminSupabase, companyId, environment, creds, offerId,
        (body.payload?.force as boolean) ?? false,
      );
    case "start_esignature":
      return await handleStartESignature(
        adminSupabase, companyId, environment, creds, offerId, body.payload ?? {},
      );
    case "get_status":
      return await handleGetStatus(adminSupabase, companyId, environment, creds, offerId);
    default:
      return jsonResponse({ success: false, error: "unknown_cron_action", action: body.action }, 400);
  }
}

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
// A thrown fetch error is a *pre-response* failure (TCP connect / DNS / TLS
// handshake never completed) when the message looks like one of these. Such
// failures provably never reached Grenke, so they are safe to retry even for a
// non-idempotent POST (no risk of creating a duplicate financing dossier).
function isConnectPhaseError(e: unknown): boolean {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    m.includes("tcp connect") ||
    m.includes("(connect)") ||
    m.includes("connection refused") ||
    m.includes("connection timed out") ||
    m.includes("connection reset") ||
    m.includes("error trying to connect") ||
    m.includes("dns error") ||
    m.includes("os error 110")
  );
}

// Per-attempt cap. Real Grenke responses are <6s in practice, so 25s is ample
// headroom for a valid (even slow) call while keeping the worst case (3 dropped
// attempts) comfortably under the edge-function wall-clock limit.
const GRENKE_FETCH_TIMEOUT_MS = 25_000;
const GRENKE_FETCH_MAX_ATTEMPTS = 3;

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
  const method = (init.method ?? "GET").toUpperCase();
  const isIdempotent = method === "GET" || method === "HEAD";

  const headers = new Headers(init.headers);
  headers.set("X-Proxy-Secret", proxySecret);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  // Retry transient connection failures. The Supabase → VPS-proxy hop can drop
  // the first SYN intermittently (Hostinger edge / rotating Supabase egress IPs
  // being greylisted upstream). Retrying from the same isolate usually lands a
  // moment later. We only ever return a real HTTP response (incl. 4xx/5xx) —
  // those are never retried. For a POST we retry ONLY connect-phase throws, so
  // we can never double-submit a financing request.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= GRENKE_FETCH_MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GRENKE_FETCH_TIMEOUT_MS);
    try {
      console.log(`[grenke-api] grenkeFetch via proxy → ${method} ${url} (attempt ${attempt}/${GRENKE_FETCH_MAX_ATTEMPTS})`);
      const res = await fetch(url, { ...init, headers, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = attempt < GRENKE_FETCH_MAX_ATTEMPTS && (isIdempotent || isConnectPhaseError(e));
      console.warn(`[grenke-api] grenkeFetch attempt ${attempt} failed (${msg}); retryable=${retryable}`);
      if (!retryable) break;
      await new Promise((r) => setTimeout(r, 700 * attempt)); // 0.7s, 1.4s backoff
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
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

  // Defaults that match iTakecare's Grenke BE contract — overridable via payload.
  //   ProductType=Rent      → confirmed by Marius (Digital Sales Reseller Journey,
  //                            grenke digital GmbH) on 2026-05-30. Other product
  //                            types (ClassicLease, AllIn, etc.) are NOT enabled
  //                            on this account.
  //   PaymentFrequency=Quarterly → the API rejects 'Monthly' with
  //                            'PaymentFrequency Monthly is not available.
  //                             Should be one of [Quarterly]'. The instalment
  //                            field is still called 'MonthlyTotalInstalment'
  //                            (= monthly equivalent), but Grenke bills the
  //                            lessee on a quarterly cadence.
  const body: CalculateInput = {
    Currency: "EUR",
    ProductType: "Rent",
    PaymentFrequency: "Quarterly",
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

// =====================================================================
// refresh_reference_data — GET /basic/v1/{legalforms,objecttypes,customslas}
//
// Pulls the 3 reference lists Grenke maintains per branch and caches them
// per (company_id, environment, kind) in public.grenke_reference_data.
// Idempotent. Safe to re-run any time.
//
// Why we cache: every offer payload references LegalFormId and
// ObjectTypeId. We want the dropdown options without hitting Grenke for
// every keystroke. A weekly refresh is enough; Grenke rarely adds rows.
// =====================================================================

type RefDataKind = "legalforms" | "objecttypes" | "customslas";

const REF_DATA_ENDPOINTS: Record<RefDataKind, string> = {
  legalforms: "/basic/v1/legalforms",
  objecttypes: "/basic/v1/objecttypes",
  customslas: "/basic/v1/customslas",
};

async function handleRefreshReferenceData(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
): Promise<Response> {
  const results: Record<RefDataKind, { ok: boolean; count: number; error?: string }> = {
    legalforms: { ok: false, count: 0 },
    objecttypes: { ok: false, count: 0 },
    customslas: { ok: false, count: 0 },
  };

  for (const kind of Object.keys(REF_DATA_ENDPOINTS) as RefDataKind[]) {
    const path = REF_DATA_ENDPOINTS[kind];
    try {
      const response = await grenkeFetch(environment, path, { method: "GET" }, creds);
      const text = await response.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = text; }

      if (!response.ok) {
        results[kind] = { ok: false, count: 0, error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
        continue;
      }

      // Normalize: legalforms + customslas return a bare array, objecttypes
      // returns { Items: [...] }. We store the full original payload as-is
      // (the UI can adapt) but compute the count from whichever shape.
      const items = Array.isArray(parsed)
        ? parsed
        : (parsed as { Items?: unknown[] })?.Items ?? [];
      const count = Array.isArray(items) ? items.length : 0;

      // Upsert into grenke_reference_data
      const { error: upsertErr } = await adminSupabase
        .from("grenke_reference_data")
        .upsert({
          company_id: companyId,
          environment,
          kind,
          payload: parsed,
          fetched_at: new Date().toISOString(),
        }, { onConflict: "company_id,environment,kind" });

      if (upsertErr) {
        results[kind] = { ok: false, count, error: `DB upsert failed: ${upsertErr.message}` };
        continue;
      }

      results[kind] = { ok: true, count };
    } catch (e) {
      results[kind] = {
        ok: false,
        count: 0,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);
  return jsonResponse({
    success: allOk,
    environment,
    results,
    refreshed_at: new Date().toISOString(),
  }, allOk ? 200 : 207); // 207 multi-status if partial
}

// =====================================================================
// build_offer_payload — DRY RUN, no call to Grenke
//
// Loads a Leazr offer + its client + its equipment, applies the
// per-company Leazr→Grenke mappings, and returns the FinancingRequest
// payload that submit_offer WOULD send. Pure preview — the user
// inspects what would be submitted before any real call.
//
// Validation is non-blocking: missing fields surface as 'warnings'
// (one entry per problem) rather than as a 4xx error. The UI shows
// the warnings prominently above the JSON.
// =====================================================================

interface GrenkeFinancingObject {
  Quantity: number;
  ObjectTypeId?: number;
  Manufacturer: string;
  NetPricePerObject: number;
  // "Name of Object Type" — an ALTERNATIVE to ObjectTypeId, NOT the product
  // name. We always send ObjectTypeId, so Name is omitted. The product's own
  // name/description goes in Details.
  Name?: string;
  SerialNumber?: string;
  Details?: string;
}

interface GrenkeAddress {
  Line1: string;
  PostCode: string;
  City: string;
  Country: string;
  Type: "Main" | "Billing" | "Delivery" | "Accountholder" | "Private";
}

interface GrenkeTelephone {
  Number: string;
  Type: "Phone" | "Mobile" | "Fax";
}

interface GrenkeLessee {
  CompanyName: string;
  ExternalId: string;
  LegalFormId?: number;
  FoundationDate?: string;
  Email?: string;
  Telephones?: GrenkeTelephone[];
  Addresses: GrenkeAddress[];
}

interface GrenkeFinancingRequest {
  FinancingAmount: number;
  Period: number;
  PaymentFrequency: "Quarterly" | "Monthly";
  PaymentMethod?: "Invoice" | "DirectDebit";
  Currency: string;
  ProductType: string;
  Lessee: GrenkeLessee;
  FinancingObjects: GrenkeFinancingObject[];
}

interface PayloadWarning {
  field: string;
  message: string;
  // Optional context: when the warning is about a specific equipment row,
  // we tag it so the UI can show an inline fix UI right next to that row.
  equipment_id?: string;
  fix_kind?: "category" | "manufacturer" | "selling_price" | "client_address";
}

interface EquipmentDebug {
  equipment_id: string;
  title: string;
  product_id: string | null;
  product_source: "linked" | "title_match" | "none";
  resolved_category_id: string | null;
  category_source: "offer_equipment" | "product" | "title_match" | "none";
  resolved_brand_id: string | null;
  brand_source: "override" | "mapping" | "products.brand_name" | "brands.translation" | "brands.name" | "none";
  resolved_manufacturer: string;
  resolved_object_type_id: number | null;
  resolved_net_price: number;
  price_source: "monthly_coefficient" | "selling_price" | "purchase_price";
}

// Strip "BE" / "FR" / "LU" prefixes + non-digits from a VAT number.
// Grenke wants the numeric/national identifier without the ISO prefix.
function formatExternalId(vat: string | null, country: string | null): string {
  if (!vat) return "";
  const upper = vat.trim().toUpperCase().replace(/\s|\./g, "");
  const c = (country ?? "").toUpperCase();
  const prefix = c === "BE" || c === "FR" || c === "LU"
    ? c
    : (upper.startsWith("BE") || upper.startsWith("FR") || upper.startsWith("LU"))
      ? upper.slice(0, 2)
      : "";
  return prefix && upper.startsWith(prefix) ? upper.slice(prefix.length) : upper;
}

// Minimal E.164 normalizer — Belgian-default to keep behaviour identical
// to the helper in _shared/elevenlabs.ts. We duplicate (rather than import
// across function boundaries) to keep the edge function self-contained.
function normalizeBelgianPhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("0032")) s = "+32" + s.slice(4);
  else if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (s.startsWith("0")) s = "+32" + s.slice(1);
  else if (!s.startsWith("+")) s = "+32" + s;
  if (!/^\+\d{8,15}$/.test(s)) return null;
  return s;
}

interface MatchedProduct {
  id: string;
  name: string;
  brand_id: string | null;
  brand_name: string | null;
  category_id: string | null;
  brands: { id: string; name: string | null; translation: string | null } | null;
}

// Fallback resolution for equipment lines that aren't linked to a catalog
// product (offer_equipment.product_id is null) — a very common legacy case.
// We try to find a catalog product whose name CONTAINS the equipment title
// (e.g. offer line "ProBook 460 G11" ↔ catalog "HP ProBook 460 G11"). If
// exactly one or a clear best match is found, we borrow its brand + category.
// Read-only: we never write product_id back here.
async function findCatalogProductByTitle(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  title: string,
): Promise<MatchedProduct | null> {
  const clean = title.trim();
  if (clean.length < 3) return null;
  // Escape LIKE wildcards so a product name with % or _ can't broaden the match.
  const escaped = clean.replace(/[\\%_]/g, (m) => "\\" + m);

  const { data, error } = await adminSupabase
    .from("products")
    .select("id, name, brand_id, brand_name, category_id, brands:brand_id ( id, name, translation )")
    .eq("company_id", companyId)
    .ilike("name", `%${escaped}%`)
    .limit(5);

  if (error || !data || data.length === 0) return null;
  const rows = data as unknown as MatchedProduct[];
  if (rows.length === 1) return rows[0];
  // Multiple hits (e.g. spec variants of the same model) — pick the name
  // closest in length to the title. Variants share brand+category, so the
  // exact pick doesn't matter for our purpose.
  rows.sort(
    (a, b) => Math.abs(a.name.length - clean.length) - Math.abs(b.name.length - clean.length),
  );
  return rows[0];
}

// Result of the payload builder. ok=false carries an HTTP-ish status + error
// so both the dry-run wrapper and submit_offer can react consistently.
type BuildResult =
  | { ok: false; status: number; error: string; message: string }
  | {
      ok: true;
      payload: GrenkeFinancingRequest;
      warnings: PayloadWarning[];
      sums: { computed_total: number; declared_financing_amount: number };
      equipment_debug: EquipmentDebug[];
    };

// Build Grenke's "Details" free-text label for a financing object. Grenke
// hard-limits it to 50 characters (HTTP 400 otherwise). Rather than blindly
// truncating, we compact: drop the spec key labels, abbreviate common CPU
// names (Ultra 5 → U5, Core i7 → i7, Ryzen 5 → R5) and join values with "/".
// e.g. title "ProBook 460 G11" + {CPU: Ultra 5, Mémoire: 16Go, Capacité: 512Go}
//      → "ProBook 460 G11 - U5/16Go/512Go". Ellipsis truncation is a last resort.
const GRENKE_DETAILS_MAX = 50;
function abbreviateSpecValue(value: string): string {
  return value
    .replace(/\b(Intel|AMD|Processeur|Processor)\b/gi, "")
    .replace(/\bCore\s+Ultra\s+(\d+)/gi, "U$1")
    .replace(/\bUltra\s+(\d+)/gi, "U$1")
    .replace(/\bCore\s+(i\d+)/gi, "$1")
    .replace(/\bRyzen\s+(\d+)/gi, "R$1")
    .replace(/\s+/g, " ")
    .trim();
}
function buildGrenkeDetails(
  title: string | null | undefined,
  specPairs: Array<{ key?: string; value?: string }>,
  orderNotes: string | null | undefined,
): string {
  const values = specPairs
    .map((p) => abbreviateSpecValue(String(p?.value ?? "").trim()))
    .filter(Boolean);
  const specText = values.join("/");
  let details = [String(title ?? "").trim(), specText].filter((s) => s).join(" - ");
  // Append order notes only if they still fit within the 50-char budget.
  const notes = String(orderNotes ?? "").trim();
  if (notes && (details + " — " + notes).length <= GRENKE_DETAILS_MAX) {
    details = details + " — " + notes;
  }
  if (details.length > GRENKE_DETAILS_MAX) {
    details = details.slice(0, GRENKE_DETAILS_MAX - 1).trimEnd() + "…";
  }
  return details;
}

// Core builder — pure data in, structured result out. No Response. Reused by
// handleBuildOfferPayload (dry-run preview) and handleSubmitOffer (real POST).
async function buildOfferPayloadCore(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  _environment: Environment,
  offerId: string | undefined,
): Promise<BuildResult> {
  if (!offerId || typeof offerId !== "string") {
    return { ok: false, status: 400, error: "validation_error", message: "offer_id is required" };
  }

  // ---------- 1. Load offer + verify ownership ----------
  const { data: offer, error: offerErr } = await adminSupabase
    .from("offers")
    .select("id, company_id, client_id, financed_amount, duration, leaser_id, monthly_payment, coefficient, is_purchase")
    .eq("id", offerId)
    .maybeSingle();

  if (offerErr) {
    console.error("[grenke-api] build_offer_payload: offer fetch failed", offerErr);
    return { ok: false, status: 500, error: "offer_lookup_failed", message: offerErr.message };
  }
  if (!offer) {
    return { ok: false, status: 404, error: "offer_not_found", message: `Offer ${offerId} not found` };
  }
  if (offer.company_id !== companyId) {
    return { ok: false, status: 403, error: "forbidden", message: "Offer belongs to a different company" };
  }

  // ---------- 2. Load client ----------
  // We pull BOTH the base address columns AND the billing_* variants. Empirically,
  // billing_* is what the iTakecare admin UI displays as the authoritative
  // address — the base columns sometimes contain legacy/corrupted data (e.g.
  // an offer reference number stored in clients.city). Resolution order at
  // payload build: billing_* first, base columns as fallback.
  const { data: client, error: clientErr } = await adminSupabase
    .from("clients")
    .select(`
      id, company, name, vat_number, entity_type, company_creation_date, email, phone,
      address, city, postal_code, country,
      billing_address, billing_city, billing_postal_code, billing_country
    `)
    .eq("id", offer.client_id)
    .maybeSingle();

  if (clientErr) {
    return { ok: false, status: 500, error: "client_lookup_failed", message: clientErr.message };
  }
  if (!client) {
    return { ok: false, status: 404, error: "client_not_found", message: `Client ${offer.client_id} not found` };
  }

  // ---------- 3. Load equipment + products + brands ----------
  // selling_price = the price billed to the leaser (Grenke's NetPricePerObject).
  // purchase_price = iTakecare's cost — NOT what Grenke wants in the
  // FinancingAmount sum. We keep purchase_price too only as a last-resort
  // fallback when selling_price is null.
  // We also pull products.category_id as a fallback when offer_equipment
  // doesn't have its own category set (common for items added via the catalog).
  const { data: equipment, error: equipErr } = await adminSupabase
    .from("offer_equipment")
    .select(`
      id, title, quantity, purchase_price, selling_price, monthly_payment,
      category_id, serial_number, order_notes,
      product_id, grenke_manufacturer_override,
      attributes:offer_equipment_attributes ( key, value ),
      specifications:offer_equipment_specifications ( key, value ),
      products:product_id (
        id, brand_name, brand_id, category_id,
        brands:brand_id ( id, name, translation )
      )
    `)
    .eq("offer_id", offerId)
    .order("created_at");

  if (equipErr) {
    return { ok: false, status: 500, error: "equipment_lookup_failed", message: equipErr.message };
  }

  // ---------- 4. Load mappings ----------
  const { data: mappingRows } = await adminSupabase
    .from("grenke_field_mappings")
    .select("kind, leazr_key, grenke_value")
    .eq("company_id", companyId);

  const mappings: Record<string, Record<string, string>> = {
    legal_form: {},
    object_type: {},
    manufacturer: {},
  };
  for (const row of (mappingRows ?? []) as Array<{ kind: string; leazr_key: string; grenke_value: string }>) {
    if (row.kind in mappings) {
      mappings[row.kind][row.leazr_key] = row.grenke_value;
    }
  }

  // ---------- 5. Build the payload ----------
  const warnings: PayloadWarning[] = [];

  // --- Lessee ---
  const legalFormRaw = mappings.legal_form[client.entity_type ?? ""];
  let legalFormId: number | undefined;
  if (legalFormRaw) {
    const parsed = Number(legalFormRaw);
    if (Number.isFinite(parsed)) legalFormId = parsed;
  } else {
    warnings.push({
      field: "Lessee.LegalFormId",
      message: client.entity_type
        ? `entity_type "${client.entity_type}" n'est pas mappé. Voir Settings → Intégrations → Grenke → Mappings.`
        : "entity_type du client est vide. Configurez-le sur la fiche client puis remappez.",
    });
  }

  const externalId = formatExternalId(client.vat_number, client.country);
  if (!externalId) {
    warnings.push({
      field: "Lessee.ExternalId",
      message: "Le client n'a pas de numéro de TVA. Grenke exige le BCE/SIRET/RCS.",
    });
  }

  const companyName = (client.company ?? client.name ?? "").trim();
  if (!companyName) {
    warnings.push({
      field: "Lessee.CompanyName",
      message: "Ni clients.company ni clients.name n'est renseigné.",
    });
  }

  const phoneE164 = normalizeBelgianPhone(client.phone);
  const telephones: GrenkeTelephone[] = phoneE164 ? [{ Number: phoneE164, Type: "Phone" }] : [];
  if (!phoneE164 && client.phone) {
    warnings.push({
      field: "Lessee.Telephones",
      message: `Le téléphone "${client.phone}" n'a pas pu être normalisé en E.164.`,
    });
  }

  // Pick the best address. iTakecare's admin UI shows billing_* as the
  // authoritative address, and the base columns are sometimes corrupted
  // (legacy data — e.g. clients.city contains an offer ref number on some
  // ASBL records). Resolution: billing_* if non-empty, else base columns.
  const pickAddr = (billing: string | null | undefined, base: string | null | undefined): string =>
    ((billing ?? "").trim() || (base ?? "").trim());

  const addressLine1 = pickAddr(client.billing_address, client.address);
  const addressPostCode = pickAddr(client.billing_postal_code, client.postal_code);
  const addressCity = pickAddr(client.billing_city, client.city);
  const addressCountry = (pickAddr(client.billing_country, client.country) || "BE").toUpperCase();

  if (!addressLine1) {
    warnings.push({
      field: "Lessee.Addresses[0].Line1",
      message: "L'adresse du client est vide (ni billing_address ni address).",
    });
  }
  if (!addressCity) {
    warnings.push({
      field: "Lessee.Addresses[0].City",
      message: "La ville du client est vide.",
    });
  }
  if (!addressPostCode) {
    warnings.push({
      field: "Lessee.Addresses[0].PostCode",
      message: "Le code postal du client est vide.",
    });
  }

  const lessee: GrenkeLessee = {
    CompanyName: companyName,
    ExternalId: externalId,
    LegalFormId: legalFormId,
    FoundationDate: client.company_creation_date ?? undefined,
    Email: client.email ?? undefined,
    Telephones: telephones,
    Addresses: [{
      Line1: addressLine1,
      PostCode: addressPostCode,
      City: addressCity,
      Country: addressCountry,
      Type: "Main",
    }],
  };

  // --- FinancingObjects ---
  type EquipmentRow = {
    id: string;
    title: string;
    quantity: number;
    purchase_price: number;
    selling_price: number | null;
    monthly_payment: number | null;
    category_id: string | null;
    serial_number: string | null;
    order_notes: string | null;
    product_id: string | null;
    grenke_manufacturer_override: string | null;
    attributes: Array<{ key: string; value: string }> | null;
    specifications: Array<{ key: string; value: string }> | null;
    products: {
      id: string;
      brand_name: string | null;
      brand_id: string | null;
      category_id: string | null;
      brands: { id: string; name: string | null; translation: string | null } | null;
    } | null;
  };

  const financingObjects: GrenkeFinancingObject[] = [];
  const equipmentDebug: EquipmentDebug[] = [];
  let computedTotal = 0;

  // Leasing pricing basis. In a leasing offer the value Grenke must finance is
  // the P.V. (selling price) the UI shows, which is derived from the agreed
  // monthly and the leasing coefficient — NOT offer_equipment.selling_price,
  // a margin-based convenience field that goes stale when the monthly is edited.
  // UI relationship (NewEquipmentSection): monthly_line = P.V.unit × qty × coef/100.
  const offerCoef = Number((offer as { coefficient?: number }).coefficient) || 0;
  const isLeasing = (offer as { is_purchase?: boolean }).is_purchase !== true;
  const useMonthlyBasis = isLeasing && offerCoef > 0;

  for (const [idx, raw] of ((equipment ?? []) as unknown as EquipmentRow[]).entries()) {
    const eq = raw;

    // Resolve the effective catalog product. If the line is linked
    // (product_id set), use the joined product. Otherwise try a title match
    // against the catalog — covers the common case of a manually-named line
    // ("ProBook 460 G11") that actually exists in the catalog under a fuller
    // name ("HP ProBook 460 G11").
    let effectiveProduct = eq.products;
    let productSource: EquipmentDebug["product_source"] = eq.products ? "linked" : "none";
    if (!effectiveProduct) {
      const matched = await findCatalogProductByTitle(adminSupabase, companyId, eq.title);
      if (matched) {
        effectiveProduct = matched;
        productSource = "title_match";
      }
    }

    // Resolve category — offer_equipment.category_id, else the (possibly
    // title-matched) product's category.
    let effectiveCategoryId: string | null = null;
    let categorySource: EquipmentDebug["category_source"] = "none";
    if (eq.category_id) {
      effectiveCategoryId = eq.category_id;
      categorySource = "offer_equipment";
    } else if (effectiveProduct?.category_id) {
      effectiveCategoryId = effectiveProduct.category_id;
      categorySource = productSource === "title_match" ? "title_match" : "product";
    }

    // ObjectTypeId from mapping
    const objectTypeRaw = effectiveCategoryId ? mappings.object_type[effectiveCategoryId] : undefined;
    let objectTypeId: number | undefined;
    if (objectTypeRaw) {
      const parsed = Number(objectTypeRaw);
      if (Number.isFinite(parsed)) objectTypeId = parsed;
    } else if (!effectiveCategoryId) {
      warnings.push({
        field: `FinancingObjects[${idx}].ObjectTypeId`,
        message: `L'équipement "${eq.title}" n'a pas de catégorie (aucune ligne, produit ou correspondance catalogue).`,
        equipment_id: eq.id,
        fix_kind: "category",
      });
    } else {
      warnings.push({
        field: `FinancingObjects[${idx}].ObjectTypeId`,
        message: `La catégorie de "${eq.title}" n'est pas mappée. Voir Settings → Intégrations → Grenke → Mappings.`,
        equipment_id: eq.id,
        fix_kind: "category",
      });
    }

    // Manufacturer resolution — highest priority first:
    //   1. grenke_manufacturer_override on the equipment line (set via modal)
    //   2. grenke_field_mappings (per-company brand override)
    //   3. effectiveProduct.brand_name (denormalized cache)
    //   4. effectiveProduct.brands.translation || .name (via brand_id join)
    //   5. fallback "Other" + warning
    let manufacturer = "Other";
    let manufacturerSource = "fallback";
    const brandId = effectiveProduct?.brand_id ?? null;
    const brandRow = effectiveProduct?.brands ?? null;

    if (eq.grenke_manufacturer_override && eq.grenke_manufacturer_override.trim()) {
      manufacturer = eq.grenke_manufacturer_override.trim();
      manufacturerSource = "override";
    } else if (brandId && mappings.manufacturer[brandId]) {
      manufacturer = mappings.manufacturer[brandId];
      manufacturerSource = "mapping";
    } else if (effectiveProduct?.brand_name) {
      manufacturer = effectiveProduct.brand_name;
      manufacturerSource = "products.brand_name";
    } else if (brandRow?.translation) {
      manufacturer = brandRow.translation;
      manufacturerSource = "brands.translation";
    } else if (brandRow?.name) {
      manufacturer = brandRow.name;
      manufacturerSource = "brands.name";
    } else {
      warnings.push({
        field: `FinancingObjects[${idx}].Manufacturer`,
        message: effectiveProduct
          ? `Le produit catalogue lié à "${eq.title}" n'a pas de marque. Ajoutez-la dans le catalogue ou définissez une override.`
          : `"${eq.title}" n'a aucune correspondance catalogue. Définissez une override de marque.`,
        equipment_id: eq.id,
        fix_kind: "manufacturer",
      });
    }

    // NetPricePerObject — the price billed to the leaser (NOT iTakecare's
    // purchase cost). offer_equipment.selling_price is the canonical value.
    // We fall back to purchase_price only if selling_price is null (which
    // shouldn't happen on a properly priced offer).
    // Per-unit net price (= P.V. unitaire shown in the UI).
    //   leasing  → monthly_line × 100 / (coef × quantity)   [matches the UI]
    //   else     → stored selling_price, then purchase_price as a last resort.
    let netPrice: number | null = null;
    let priceSource: EquipmentDebug["price_source"] = "selling_price";
    const lineMonthly = Number(eq.monthly_payment) || 0;
    const lineQty = eq.quantity || 1;
    if (useMonthlyBasis && lineMonthly > 0 && lineQty > 0) {
      netPrice = (lineMonthly * 100) / (offerCoef * lineQty);
      priceSource = "monthly_coefficient";
    } else if (eq.selling_price != null && eq.selling_price > 0) {
      netPrice = eq.selling_price;
      priceSource = "selling_price";
    } else {
      netPrice = eq.purchase_price;
      priceSource = "purchase_price";
      warnings.push({
        field: `FinancingObjects[${idx}].NetPricePerObject`,
        message: `"${eq.title}" n'a ni mensualité+coefficient ni selling_price — fallback sur purchase_price (${eq.purchase_price}). Vérifiez la pricing de la ligne.`,
        equipment_id: eq.id,
        fix_kind: "selling_price",
      });
    }

    // Round the per-object price to 2 decimals FIRST, then derive everything
    // (the line we send AND our running total) from that same rounded value.
    // Grenke recomputes Σ(Quantity × NetPricePerObject) from the rounded prices
    // it receives, so accumulating from the unrounded price here would make our
    // FinancingAmount disagree with Grenke's sum by a rounding cent (→ 400).
    const netPriceRounded = Math.round(netPrice * 100) / 100;

    const obj: GrenkeFinancingObject = {
      Quantity: eq.quantity,
      ObjectTypeId: objectTypeId,
      Manufacturer: manufacturer,
      NetPricePerObject: netPriceRounded,
    };
    if (eq.serial_number) obj.SerialNumber = eq.serial_number;
    // The product's human-readable name + its attributes/specs + any order notes
    // go in Details (free text, Grenke's "détails du bien"). Name is reserved for
    // the object-TYPE name and must stay unset when ObjectTypeId is supplied
    // (else Grenke 400: "No Financing Object with Name '…' and ObjectType '…'…").
    const specPairs = [
      ...((eq.attributes ?? []) as Array<{ key: string; value: string }>),
      ...((eq.specifications ?? []) as Array<{ key: string; value: string }>),
    ].filter((p) => p?.key && String(p.value ?? "").trim());
    const details = buildGrenkeDetails(eq.title, specPairs, eq.order_notes);
    if (details) obj.Details = details;

    financingObjects.push(obj);
    computedTotal += eq.quantity * netPriceRounded;

    equipmentDebug.push({
      equipment_id: eq.id,
      title: eq.title,
      product_id: eq.product_id,
      product_source: productSource,
      resolved_category_id: effectiveCategoryId,
      category_source: categorySource,
      resolved_brand_id: brandId,
      brand_source: manufacturerSource as EquipmentDebug["brand_source"],
      resolved_manufacturer: manufacturer,
      resolved_object_type_id: objectTypeId ?? null,
      resolved_net_price: Math.round(netPrice * 100) / 100,
      price_source: priceSource,
    });
  }

  if (financingObjects.length === 0) {
    warnings.push({
      field: "FinancingObjects",
      message: "Aucun équipement sur cette offre.",
    });
  }

  // Grenke validates FinancingAmount === Σ(Quantity × NetPricePerObject)
  // EXACTLY. We therefore ALWAYS send the computed line-item sum, so the two
  // can never disagree by a rounding cent. We compare against the offer's
  // EXPECTED financed amount only to decide whether to warn. For a leasing offer
  // the expected amount is monthly × 100 / coef (the P.V. the UI shows) — NOT
  // offers.financed_amount, which is a stored field that goes stale when the
  // monthly is edited (it was the source of the wrong amount sent to Grenke).
  //   - small delta (≤ 1 EUR): pure rounding, send computedTotal silently.
  //   - large delta (> 1 EUR): the offer pricing is genuinely out of sync.
  computedTotal = Math.round(computedTotal * 100) / 100;
  const expectedAmount = (useMonthlyBasis && Number(offer.monthly_payment) > 0)
    ? Math.round((Number(offer.monthly_payment) * 100 / offerCoef) * 100) / 100
    : Math.round((offer.financed_amount ?? 0) * 100) / 100;
  const declaredAmount = expectedAmount;
  const amountDelta = Math.round((computedTotal - declaredAmount) * 100) / 100;
  const ROUNDING_TOLERANCE = 1.0;
  if (Math.abs(amountDelta) > ROUNDING_TOLERANCE) {
    warnings.push({
      field: "FinancingAmount",
      message: `Écart important: financed_amount=${declaredAmount} mais Σ(lignes)=${computedTotal} (Δ ${amountDelta}). On enverra ${computedTotal} à Grenke — vérifiez la pricing de l'offre.`,
    });
  }
  const financingAmount = computedTotal;

  // --- Final payload ---
  const payload: GrenkeFinancingRequest = {
    FinancingAmount: financingAmount,
    Period: offer.duration ?? 36,
    PaymentFrequency: "Quarterly",
    // iTakecare's Grenke BE profile only accepts DirectDebit (Grenke 400 on
    // "Invoice": "Should be one of [DirectDebit]").
    PaymentMethod: "DirectDebit",
    Currency: "EUR",
    ProductType: "Rent",
    Lessee: lessee,
    FinancingObjects: financingObjects,
  };

  return {
    ok: true,
    payload,
    warnings,
    sums: {
      computed_total: computedTotal,
      declared_financing_amount: declaredAmount,
    },
    // Debug — per-equipment resolution trace, useful in the modal to
    // explain why a brand/category came back as "Other" / unmapped.
    equipment_debug: equipmentDebug,
  };
}

// Dry-run wrapper — builds the payload and returns it as an HTTP response.
async function handleBuildOfferPayload(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  offerId: string | undefined,
): Promise<Response> {
  const result = await buildOfferPayloadCore(adminSupabase, companyId, environment, offerId);
  if (!result.ok) {
    return jsonResponse({ success: false, error: result.error, message: result.message }, result.status);
  }
  return jsonResponse({
    success: result.warnings.length === 0,
    environment,
    offer_id: offerId,
    payload: result.payload,
    warnings: result.warnings,
    sums: result.sums,
    equipment_debug: result.equipment_debug,
  }, 200);
}

// =====================================================================
// submit_offer — POST /basic/v1/requests (REAL Grenke dossier creation)
//
// Guardrails:
//   - Re-builds the payload SERVER-SIDE from the DB (never trusts a
//     client-supplied payload — prevents amount/identity spoofing).
//   - Refuses if the payload still has warnings (must be clean).
//   - Refuses if the offer already has a grenke_financing_id, unless
//     force=true (anti-double-submit / idempotency).
//   - On success: persists grenke_financing_id / request_id / state /
//     submitted_at / environment on the offer.
//   - On Grenke error: persists grenke_last_error and returns it.
// =====================================================================
async function handleSubmitOffer(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
  offerId: string | undefined,
  force: boolean,
): Promise<Response> {
  if (!offerId) {
    return jsonResponse({ success: false, error: "validation_error", message: "offer_id is required" }, 400);
  }

  // Anti-double-submit: check existing grenke linkage first.
  const { data: existing, error: existErr } = await adminSupabase
    .from("offers")
    .select("id, company_id, grenke_financing_id, grenke_state")
    .eq("id", offerId)
    .maybeSingle();
  if (existErr) {
    return jsonResponse({ success: false, error: "offer_lookup_failed", message: existErr.message }, 500);
  }
  if (!existing) {
    return jsonResponse({ success: false, error: "offer_not_found", message: `Offer ${offerId} not found` }, 404);
  }
  if (existing.company_id !== companyId) {
    return jsonResponse({ success: false, error: "forbidden", message: "Offer belongs to a different company" }, 403);
  }
  if (existing.grenke_financing_id && !force) {
    return jsonResponse({
      success: false,
      error: "already_submitted",
      message: `Cette offre a déjà été soumise à Grenke (financingId ${existing.grenke_financing_id}, état ${existing.grenke_state ?? "?"}). Utilisez force=true pour re-soumettre.`,
      grenke_financing_id: existing.grenke_financing_id,
      grenke_state: existing.grenke_state,
    }, 409);
  }

  // Re-build the payload server-side.
  const built = await buildOfferPayloadCore(adminSupabase, companyId, environment, offerId);
  if (!built.ok) {
    return jsonResponse({ success: false, error: built.error, message: built.message }, built.status);
  }
  if (built.warnings.length > 0) {
    return jsonResponse({
      success: false,
      error: "payload_has_warnings",
      message: "Le payload contient des avertissements — corrigez-les avant de soumettre.",
      warnings: built.warnings,
    }, 422);
  }

  // POST to Grenke.
  let response: Response;
  try {
    response = await grenkeFetch(
      environment,
      "/basic/v1/requests",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.payload),
      },
      creds,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await adminSupabase.from("offers").update({
      grenke_last_error: { stage: "network", message: msg, at: new Date().toISOString() },
    }).eq("id", offerId);
    return jsonResponse({ success: false, error: "network_or_tls_error", message: msg }, 502);
  }

  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep raw */ }

  if (!response.ok) {
    await adminSupabase.from("offers").update({
      grenke_last_error: { stage: "grenke", status: response.status, body: parsed, at: new Date().toISOString() },
    }).eq("id", offerId);
    return jsonResponse({
      success: false,
      error: "grenke_rejected",
      status: response.status,
      grenke_response: parsed,
    }, response.status >= 500 ? 502 : response.status);
  }

  // Success — extract the identifiers Grenke returns.
  const r = parsed as { FinancingId?: string; RequestId?: string; State?: string } | undefined;
  const financingId = r?.FinancingId ?? null;
  let requestId = r?.RequestId ?? null;
  const state = r?.State ?? "RequestToGrenke";
  const now = new Date().toISOString();

  // The human-readable partner request number (e.g. "180-33037") is Grenke's
  // RequestId. If the POST response didn't echo it, fetch it via GET so we can
  // store it as the leaser request number shown in Leazr.
  if (!requestId && financingId) {
    try {
      const getResp = await grenkeFetch(environment, `/basic/v1/requests/${financingId}`, { method: "GET" }, creds);
      if (getResp.ok) {
        const gp = (await getResp.json().catch(() => null)) as { RequestId?: string } | null;
        requestId = gp?.RequestId ?? null;
      }
    } catch { /* non-fatal — the poller will backfill it later */ }
  }

  // Record as the offer's active submission (archives any previous one — this is
  // the re-analysis case when `force` is used after a refusal) and mirror the
  // active pointer onto the offer.
  await recordGrenkeSubmission(adminSupabase, offerId, {
    FinancingId: financingId ?? undefined,
    RequestId: requestId ?? undefined,
    State: state,
    submitted_at: now,
  }, environment, { advanceWorkflow: false });

  return jsonResponse({
    success: true,
    environment,
    offer_id: offerId,
    grenke_financing_id: financingId,
    grenke_request_id: requestId,
    grenke_state: state,
    grenke_response: parsed,
  }, 200);
}

// =====================================================================
// get_status / poll_grenke_statuses — fetch the current Grenke state of a
// submitted offer and persist it (+ map terminal-negative states to the
// Leazr workflow). The Contracted → contract auto-creation is handled in a
// dedicated step (see handleContractedOffer), kept separate because contract
// creation is non-trivial and must stay idempotent.
// =====================================================================

const GRENKE_TERMINAL_STATES = new Set(["Contracted", "Declined", "Cancelled"]);

type OfferStatusRow = {
  id: string;
  company_id: string;
  grenke_financing_id: string | null;
  grenke_environment: string | null;
  grenke_state: string | null;
  workflow_status: string | null;
  grenke_request_id: string | null;
  leaser_request_number: string | null;
};

// Human-readable French label + notification copy for each Grenke state.
// Used to notify the iTakecare team at every signature / lifecycle step.
const GRENKE_STATE_NOTIFY: Record<string, { title: string; message: string }> = {
  RequestToGrenke: { title: "Dossier soumis à Grenke", message: "Le dossier a été transmis à Grenke." },
  MissingInfo: { title: "Grenke : infos manquantes", message: "Grenke demande des informations complémentaires." },
  ApplicationReceived: { title: "Grenke : dossier en analyse", message: "Grenke a bien reçu et analyse le dossier." },
  GuaranteeRequired: { title: "Grenke : garantie requise", message: "Grenke requiert une garantie pour ce dossier." },
  ReadyToSign: { title: "Grenke : prêt à signer ✍️", message: "Le dossier est accepté — prêt à envoyer pour signature DocuSign." },
  StartingESignature: { title: "Signature : démarrage", message: "L'e-signature DocuSign a démarré." },
  AwaitingCustomerSignature: { title: "Signature : attente client", message: "En attente de la signature du contrat par le client." },
  AwaitingPartnerSignature: { title: "Signature : attente fournisseur", message: "En attente de votre signature (fournisseur) sur le contrat." },
  AwaitingSigningAppSignature: { title: "Signature : en cours", message: "Signature électronique en cours." },
  AwaitingDeliveryConfirmation: { title: "Signature : bon de livraison", message: "En attente de la signature du bon de livraison par le client. ⚠️ La date de livraison de référence reste celle saisie dans le contrat Leazr." },
  ContractPrinted: { title: "Contrat imprimé", message: "Le contrat a été imprimé côté Grenke." },
  Contracted: { title: "Grenke : contrat actif ✅", message: "Grenke a contractualisé le dossier. Vous pouvez finaliser le contrat Leazr." },
  Declined: { title: "Grenke : dossier refusé ❌", message: "Grenke a refusé le dossier." },
  Cancelled: { title: "Grenke : dossier annulé", message: "Le dossier Grenke a été annulé." },
};

// Fetch one offer's status from Grenke and persist grenke_state. Maps
// Declined/Cancelled → leaser_rejected. Returns the new state.
async function fetchAndPersistStatus(
  adminSupabase: ReturnType<typeof createClient>,
  environment: Environment,
  creds: Credentials,
  offer: OfferStatusRow,
): Promise<{ state: string | null; workflowChanged: boolean; error?: string }> {
  const financingId = offer.grenke_financing_id;
  if (!financingId) return { state: null, workflowChanged: false, error: "no_financing_id" };

  let response: Response;
  try {
    response = await grenkeFetch(environment, `/basic/v1/requests/${financingId}`, { method: "GET" }, creds);
  } catch (e) {
    return { state: null, workflowChanged: false, error: e instanceof Error ? e.message : String(e) };
  }
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* keep raw */ }
  if (!response.ok) {
    return { state: null, workflowChanged: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
  }

  const state = (parsed as { State?: string })?.State ?? null;
  const requestId = (parsed as { RequestId?: string })?.RequestId ?? null;
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    grenke_state: state,
    grenke_state_updated_at: now,
  };

  // Backfill Grenke's human-readable request number (e.g. "180-33037"). Keep
  // grenke_request_id in sync, and fill the user-facing leaser_request_number
  // only when it's still empty (never clobber a manual edit).
  if (requestId) {
    if (offer.grenke_request_id !== requestId) update.grenke_request_id = requestId;
    if (!offer.leaser_request_number) update.leaser_request_number = requestId;
  }

  let workflowChanged = false;
  // Only Declined is a reliable refusal. A Grenke "Cancelled" request is often a
  // request that became a contract (accepted), so we never auto-close it here.
  if (state === "Declined" && offer.workflow_status !== "leaser_rejected") {
    update.workflow_status = "leaser_rejected"; // Refusé
    workflowChanged = true;
  }
  // NOTE: Contracted → contract creation is intentionally NOT done here yet.
  // It's handled by the one-click finalize (UI) / future server port.

  await adminSupabase.from("offers").update(update).eq("id", offer.id);

  // Mirror the state onto the active history row for this dossier, and backfill
  // its Grenke request number once Grenke has assigned it (the POST that created
  // the dossier often returns an empty RequestId — the human number "180-…" is
  // attributed a moment later, so we capture it on the next status fetch).
  const subUpdate: Record<string, unknown> = { state, state_updated_at: now };
  if (requestId) subUpdate.request_id = requestId;
  await adminSupabase.from("grenke_submissions")
    .update(subUpdate)
    .eq("offer_id", offer.id)
    .eq("financing_id", financingId);

  // Notify the team on every state CHANGE (so each signature step is visible).
  const stateChanged = state !== null && state !== offer.grenke_state;
  if (stateChanged) {
    const copy = GRENKE_STATE_NOTIFY[state] ?? { title: `Grenke : ${state}`, message: `Nouvel état Grenke : ${state}.` };
    try {
      await adminSupabase.from("admin_notifications").insert({
        company_id: offer.company_id,
        offer_id: offer.id,
        type: "grenke_state",
        title: copy.title,
        message: copy.message,
        metadata: { grenke_state: state, previous_state: offer.grenke_state },
      });
    } catch (e) {
      console.warn("[grenke-api] admin_notification insert failed:", e instanceof Error ? e.message : String(e));
    }
  }

  return { state, workflowChanged };
}

async function handleGetStatus(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
  offerId: string | undefined,
): Promise<Response> {
  if (!offerId) {
    return jsonResponse({ success: false, error: "validation_error", message: "offer_id is required" }, 400);
  }
  const { data: offer, error } = await adminSupabase
    .from("offers")
    .select("id, company_id, grenke_financing_id, grenke_environment, grenke_state, workflow_status, grenke_request_id, leaser_request_number")
    .eq("id", offerId)
    .maybeSingle();
  if (error) return jsonResponse({ success: false, error: "offer_lookup_failed", message: error.message }, 500);
  if (!offer) return jsonResponse({ success: false, error: "offer_not_found" }, 404);
  if ((offer as OfferStatusRow).company_id !== companyId) {
    return jsonResponse({ success: false, error: "forbidden" }, 403);
  }
  if (!(offer as OfferStatusRow).grenke_financing_id) {
    return jsonResponse({ success: false, error: "not_submitted", message: "Cette offre n'a pas encore été soumise à Grenke." }, 400);
  }
  const env = ((offer as OfferStatusRow).grenke_environment as Environment) || environment;
  const res = await fetchAndPersistStatus(adminSupabase, env, creds, offer as OfferStatusRow);
  if (res.error) {
    return jsonResponse({ success: false, error: "grenke_status_failed", message: res.error }, 502);
  }
  return jsonResponse({
    success: true,
    offer_id: offerId,
    grenke_state: res.state,
    workflow_changed: res.workflowChanged,
  }, 200);
}

// Cron entry point — polls every submitted offer still in a non-terminal
// Grenke state, across all companies that have Grenke configured.
async function handlePollGrenkeStatuses(
  adminSupabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const { data: offers, error } = await adminSupabase
    .from("offers")
    .select("id, company_id, grenke_financing_id, grenke_environment, grenke_state, workflow_status, grenke_request_id, leaser_request_number")
    .not("grenke_financing_id", "is", null)
    .not("grenke_state", "in", "(Contracted,Declined,Cancelled)")
    // Offers already converted to a contract are finished — the contract poll
    // owns them now. Don't re-poll a stale dossier and flip them to Cancelled.
    .eq("converted_to_contract", false)
    .limit(200);
  if (error) {
    return jsonResponse({ success: false, error: "poll_lookup_failed", message: error.message }, 500);
  }
  const rows = (offers ?? []) as OfferStatusRow[];

  const credsCache = new Map<string, Credentials | null>();
  let polled = 0, changed = 0, errors = 0, skipped = 0;

  for (const offer of rows) {
    const env = ((offer.grenke_environment as Environment) || "production");
    const cacheKey = `${offer.company_id}:${env}`;
    let creds = credsCache.get(cacheKey);
    if (creds === undefined) {
      creds = await loadCredentials(adminSupabase, offer.company_id, env);
      credsCache.set(cacheKey, creds);
    }
    if (!creds) { skipped++; continue; }
    const res = await fetchAndPersistStatus(adminSupabase, env, creds, offer);
    polled++;
    if (res.error) errors++;
    else if (res.workflowChanged) changed++;
  }

  return jsonResponse({
    success: true,
    candidates: rows.length,
    polled,
    changed,
    errors,
    skipped,
    at: new Date().toISOString(),
  }, 200);
}

// Cron: for every company that has Grenke offers, run the contracts reconcile
// (auto-link newly-accepted contracts + refresh existing contract states). This
// is what flips ApplicationSettled → RunningContract and surfaces freshly
// accepted deals as "financées" without anyone clicking Synchroniser.
async function handlePollGrenkeContracts(
  adminSupabase: ReturnType<typeof createClient>,
): Promise<Response> {
  const { data: companyRows } = await adminSupabase
    .from("offers")
    .select("company_id")
    .eq("leaser_id", GRENKE_LEASER_UUID);
  const companyIds = [...new Set(((companyRows ?? []) as Array<{ company_id: string }>).map((r) => r.company_id))];

  let processed = 0, skipped = 0, errors = 0;
  for (const companyId of companyIds) {
    const creds = await loadCredentials(adminSupabase, companyId, "production");
    if (!creds) { skipped++; continue; }
    try {
      await handleReconcileGrenkeContracts(adminSupabase, companyId, "production", creds, { auto: true });
      processed++;
    } catch (e) {
      console.error("[grenke-api] poll_grenke_contracts error for company", companyId, e instanceof Error ? e.message : String(e));
      errors++;
    }
  }
  return jsonResponse({ success: true, companies: companyIds.length, processed, skipped, errors, at: new Date().toISOString() }, 200);
}

// =====================================================================
// e-signature — get_esignature_config + start_esignature
//
// When Grenke returns ReadyToSign, iTakecare provides the signer details and
// kicks off the DocuSign e-signature. Flow:
//   1. GET /e-signature/configuration → how many customer/partner signees.
//   2. POST /contractdocument → generate the contract PDF (409 if it already
//      exists, which we treat as fine).
//   3. POST /e-signature → start DocuSign with the signer(s).
//
// Server-side document gate: refuses if any offer_documents row is still
// 'pending' or 'rejected' (i.e. a requested document isn't validated). This
// mirrors the business rule — a dossier only reaches "ready" once every
// requested document is approved; existing clients with nothing requested
// pass automatically.
// =====================================================================

const GRENKE_TITLE_ENUM = new Set(["Mr", "Ms", "Miss", "Mrs", "Dr", "Prof"]);

type ESignSigner = {
  title?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
};

function toGrenkeSignee(s: ESignSigner, order: number) {
  const title = s.title && GRENKE_TITLE_ENUM.has(s.title) ? s.title : "Mr";
  return {
    Title: title,
    FirstName: (s.first_name ?? "").trim(),
    LastName: (s.last_name ?? "").trim(),
    Email: (s.email ?? "").trim(),
    Culture: "fr-BE",
    MobileNumber: normalizeBelgianPhone(s.mobile ?? "") ?? "",
    SigningOrder: order,
  };
}

async function loadOfferForESign(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  offerId: string | undefined,
): Promise<{ ok: false; status: number; error: string; message: string } | { ok: true; offer: OfferStatusRow }> {
  if (!offerId) return { ok: false, status: 400, error: "validation_error", message: "offer_id is required" };
  const { data: offer, error } = await adminSupabase
    .from("offers")
    .select("id, company_id, grenke_financing_id, grenke_environment, grenke_state, workflow_status, grenke_request_id, leaser_request_number")
    .eq("id", offerId)
    .maybeSingle();
  if (error) return { ok: false, status: 500, error: "offer_lookup_failed", message: error.message };
  if (!offer) return { ok: false, status: 404, error: "offer_not_found", message: "Offre introuvable" };
  const o = offer as OfferStatusRow;
  if (o.company_id !== companyId) return { ok: false, status: 403, error: "forbidden", message: "Offre d'une autre société" };
  if (!o.grenke_financing_id) return { ok: false, status: 400, error: "not_submitted", message: "Offre pas encore soumise à Grenke" };
  return { ok: true, offer: o };
}

async function handleGetESignatureConfig(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
  offerId: string | undefined,
): Promise<Response> {
  const loaded = await loadOfferForESign(adminSupabase, companyId, offerId);
  if (!loaded.ok) return jsonResponse({ success: false, error: loaded.error, message: loaded.message }, loaded.status);
  const env = (loaded.offer.grenke_environment as Environment) || environment;

  // Document gate status (informational here; enforced in start_esignature)
  const { data: docs } = await adminSupabase
    .from("offer_documents")
    .select("document_type, status")
    .eq("offer_id", offerId);
  const pendingDocs = ((docs ?? []) as Array<{ document_type: string; status: string }>)
    .filter((d) => d.status === "pending" || d.status === "rejected");

  let response: Response;
  try {
    response = await grenkeFetch(
      env,
      `/basic/v1/requests/${loaded.offer.grenke_financing_id}/e-signature/configuration`,
      { method: "GET" },
      creds,
    );
  } catch (e) {
    return jsonResponse({ success: false, error: "network_or_tls_error", message: e instanceof Error ? e.message : String(e) }, 502);
  }
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* */ }
  if (!response.ok) {
    return jsonResponse({ success: false, error: "grenke_error", status: response.status, grenke_response: parsed }, response.status >= 500 ? 502 : response.status);
  }

  const cfg = parsed as { DocuSign?: { MinNumberOfCustomerSignees?: number; MaxNumberOfCustomerSignees?: number; MinNumberOfPartnerSignees?: number; MaxNumberOfPartnerSignees?: number } };
  return jsonResponse({
    success: true,
    config: cfg.DocuSign ?? null,
    documents_pending: pendingDocs,
    can_send: pendingDocs.length === 0,
  }, 200);
}

async function handleStartESignature(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
  offerId: string | undefined,
  payload: Record<string, unknown>,
): Promise<Response> {
  const loaded = await loadOfferForESign(adminSupabase, companyId, offerId);
  if (!loaded.ok) return jsonResponse({ success: false, error: loaded.error, message: loaded.message }, loaded.status);
  const offer = loaded.offer;
  const env = (offer.grenke_environment as Environment) || environment;

  // --- Server-side document gate ---
  const { data: docs } = await adminSupabase
    .from("offer_documents")
    .select("document_type, status")
    .eq("offer_id", offerId);
  const pendingDocs = ((docs ?? []) as Array<{ document_type: string; status: string }>)
    .filter((d) => d.status === "pending" || d.status === "rejected");
  if (pendingDocs.length > 0) {
    return jsonResponse({
      success: false,
      error: "documents_pending",
      message: "Des documents demandés ne sont pas encore validés.",
      documents_pending: pendingDocs,
    }, 422);
  }

  const customer = payload.customer as ESignSigner | undefined;
  if (!customer?.first_name || !customer?.last_name || !customer?.email) {
    return jsonResponse({ success: false, error: "validation_error", message: "Signataire client incomplet (nom/prénom/email requis)." }, 400);
  }
  const partner = payload.partner as ESignSigner | undefined;
  // Grenke's flow is: client signs the contract → iTakecare signs as supplier
  // → client signs the delivery confirmation (bon de livraison). So delivery
  // confirmation is ON by default.
  const useDeliveryConfirmation = (payload.use_delivery_confirmation as boolean) ?? true;

  // --- 1. Generate the contract document (best-effort; 409 = already exists) ---
  try {
    const docResp = await grenkeFetch(
      env,
      `/basic/v1/requests/${offer.grenke_financing_id}/contractdocument`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      creds,
    );
    if (!docResp.ok && docResp.status !== 409) {
      const t = await docResp.text();
      console.warn(`[grenke-api] contractdocument non-OK (${docResp.status}): ${t.slice(0, 200)}`);
    }
  } catch (e) {
    console.warn("[grenke-api] contractdocument call failed (continuing):", e instanceof Error ? e.message : String(e));
  }

  // --- 2. Start the e-signature ---
  const esignBody: Record<string, unknown> = {
    ESignatureType: "DocuSign",
    UseDeliveryConfirmation: useDeliveryConfirmation,
    CustomerContractSignees: [toGrenkeSignee(customer, 0)],
  };
  // iTakecare signs as the supplier between the client's contract signature
  // and the delivery confirmation.
  if (partner?.first_name && partner?.last_name && partner?.email) {
    esignBody.PartnerContractSignees = [toGrenkeSignee(partner, 0)];
  }
  // The client also signs the delivery confirmation (bon de livraison).
  if (useDeliveryConfirmation) {
    esignBody.CustomerDeliveryConfirmationSignees = [toGrenkeSignee(customer, 0)];
  }

  let response: Response;
  try {
    response = await grenkeFetch(
      env,
      `/basic/v1/requests/${offer.grenke_financing_id}/e-signature`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(esignBody) },
      creds,
    );
  } catch (e) {
    return jsonResponse({ success: false, error: "network_or_tls_error", message: e instanceof Error ? e.message : String(e) }, 502);
  }
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* */ }

  if (!response.ok) {
    await adminSupabase.from("offers").update({
      grenke_last_error: { stage: "esignature", status: response.status, body: parsed, at: new Date().toISOString() },
    }).eq("id", offerId);
    return jsonResponse({ success: false, error: "grenke_esign_rejected", status: response.status, grenke_response: parsed, sent: esignBody }, response.status >= 500 ? 502 : response.status);
  }

  // Refresh state immediately so the UI reflects StartingESignature / Awaiting…
  const now = new Date().toISOString();
  await adminSupabase.from("offers").update({
    grenke_state_updated_at: now,
    grenke_last_error: null,
  }).eq("id", offerId);

  return jsonResponse({ success: true, offer_id: offerId, grenke_response: parsed, sent: esignBody }, 200);
}

// =====================================================================
// backfill_product_links — repair offer_equipment.product_id on existing
// offers by matching the line title against the company's catalog.
//
// Historically the admin offer builder dropped product_id during save
// (fixed in CreateOffer.tsx). This backfills the gap on pre-existing
// rows: for every offer_equipment with product_id IS NULL, find the
// catalog product whose name matches the line title and set product_id
// (+ category_id when the line has none).
//
// dry_run=true (default): report what WOULD change, no writes.
// dry_run=false: apply the confident matches.
//
// Matching tiers (most → least confident):
//   1. exact normalized name == title
//   2. one side is a substring of the other
// A match is only applied when there's exactly ONE product at the best
// tier; multiple → ambiguous (reported, skipped).
// =====================================================================

// Normalize a product/equipment title for matching: lowercase, strip accents,
// replace every non-alphanumeric char with a space, collapse whitespace.
// This makes "MacBook Air 13" M1" and "Macbook Air 13 M1" compare equal.
function normalizeTitle(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")        // strip diacritics
    .replace(/[^a-z0-9]+/g, " ")            // non-alphanumeric → space
    .trim()
    .replace(/\s+/g, " ");
}

// Significant tokens of a normalized title (drop 1-char noise tokens).
function titleTokens(norm: string): string[] {
  return norm.split(" ").filter((t) => t.length >= 2);
}

// Is every token of `small` present in `big`'s token set? (order-independent)
function tokensSubset(small: string[], big: Set<string>): boolean {
  return small.length > 0 && small.every((t) => big.has(t));
}

// =====================================================================
// upload_document — attach offer documents (ID card, financials, …) to the
// Grenke financing as base64. Grenke endpoint:
//   POST /basic/v1/calculationSets/{financingId}/documents/base64
// Body: { DocumentName, DocumentContent (base64), DocumentCategory }.
// Verified against the live API: a submitted request's financingId is accepted
// here, and DocumentCategory 300 (generic supporting document) is the valid
// value (other codes are rejected with a 400). Files come from the
// 'offer-documents' storage bucket (offer_documents.file_path).
// =====================================================================
const GRENKE_DOCUMENT_CATEGORY = 300;

async function handleUploadDocuments(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
  offerId: string | undefined,
  payload: Record<string, unknown>,
): Promise<Response> {
  if (!offerId) {
    return jsonResponse({ success: false, error: "validation_error", message: "offer_id is required" }, 400);
  }

  const { data: offer, error: offerErr } = await adminSupabase
    .from("offers")
    .select("id, company_id, grenke_financing_id, grenke_environment")
    .eq("id", offerId)
    .maybeSingle();
  if (offerErr) return jsonResponse({ success: false, error: "offer_lookup_failed", message: offerErr.message }, 500);
  if (!offer) return jsonResponse({ success: false, error: "offer_not_found" }, 404);
  if ((offer as { company_id: string }).company_id !== companyId) {
    return jsonResponse({ success: false, error: "forbidden" }, 403);
  }
  const financingId = (offer as { grenke_financing_id: string | null }).grenke_financing_id;
  if (!financingId) {
    return jsonResponse({ success: false, error: "not_submitted", message: "Cette offre n'a pas encore été soumise à Grenke." }, 400);
  }
  const env = ((offer as { grenke_environment?: string }).grenke_environment as Environment) || environment;

  // Which documents to send? Optional explicit allowlist of ids; else all.
  const docIds = Array.isArray(payload.document_ids) ? (payload.document_ids as string[]) : null;
  let query = adminSupabase
    .from("offer_documents")
    .select("id, file_name, file_path, mime_type, document_type")
    .eq("offer_id", offerId);
  if (docIds && docIds.length > 0) query = query.in("id", docIds);
  const { data: docs, error: docsErr } = await query;
  if (docsErr) return jsonResponse({ success: false, error: "documents_lookup_failed", message: docsErr.message }, 500);
  const documents = (docs ?? []) as Array<{ id: string; file_name: string; file_path: string; mime_type: string | null; document_type: string }>;
  if (documents.length === 0) {
    return jsonResponse({ success: false, error: "no_documents", message: "Aucun document à envoyer." }, 400);
  }

  const results: Array<{ id: string; name: string; ok: boolean; status?: number; error?: string }> = [];
  for (const doc of documents) {
    try {
      const { data: blob, error: dlErr } = await adminSupabase.storage.from("offer-documents").download(doc.file_path);
      if (dlErr || !blob) {
        results.push({ id: doc.id, name: doc.file_name, ok: false, error: "download_failed" });
        continue;
      }
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const content = base64Encode(bytes);

      let resp: Response;
      try {
        resp = await grenkeFetch(
          env,
          `/basic/v1/calculationSets/${financingId}/documents/base64`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              DocumentName: doc.file_name,
              DocumentContent: content,
              DocumentCategory: GRENKE_DOCUMENT_CATEGORY,
            }),
          },
          creds,
        );
      } catch (e) {
        results.push({ id: doc.id, name: doc.file_name, ok: false, error: e instanceof Error ? e.message : String(e) });
        continue;
      }
      const text = await resp.text();
      results.push({ id: doc.id, name: doc.file_name, ok: resp.ok, status: resp.status, error: resp.ok ? undefined : text.slice(0, 200) });
    } catch (e) {
      results.push({ id: doc.id, name: doc.file_name, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  const sent = results.filter((r) => r.ok).length;
  return jsonResponse({ success: sent > 0, offer_id: offerId, sent, total: documents.length, results }, sent > 0 ? 200 : 502);
}

// =====================================================================
// reconcile_grenke_requests / link_grenke_request — match Grenke dossiers
// created directly in the portal (no API submission) to existing Leazr offers,
// by company name + amount + monthly. Confident, unambiguous matches are
// auto-linked when payload.auto === true; the rest are returned for manual
// review. Linking writes the Grenke identifiers/state onto the offer so the
// status poller then tracks it like any API-submitted dossier.
// =====================================================================
const GRENKE_LEASER_UUID = "d60b86d7-a129-4a17-a877-e8e5caa66949";

type GrenkeRequestItem = {
  FinancingId?: string;
  RequestId?: string;
  State?: string;
  FinancingAmount?: number;
  MonthlyTotalInstalment?: number;
  Period?: number;
  Lessee?: { CompanyName?: string };
};

type UnlinkedOffer = {
  id: string;
  client_name: string | null;
  dossier_number: string | null;
  monthly_payment: number | null;
  coefficient: number | null;
  financed_amount: number | null;
  workflow_status: string | null;
  clients: { company: string | null; name: string | null } | null;
};

// Write the Grenke linkage onto a Leazr offer (shared by auto + manual link).
// Record a Grenke dossier as the offer's ACTIVE submission: archive any previous
// submissions (kept in history), upsert this one as active, and mirror it onto
// the offer's grenke_* columns (the "active pointer" used by the workflow/poller).
const GRENKE_TERMINAL_NEGATIVE = new Set(["Declined", "Cancelled"]);
// States that mean the deal was ACCEPTED (a contract exists/existed). Used to set
// the offer to "leaser_approved" (Acceptée). Covers request- and contract-side names.
const GRENKE_ACCEPTED_STATES = new Set([
  "Contracted", "ApplicationSettled", "Paid", "RunningContract",
  "ProlongedContract", "ExpiringSoon", "Expired",
]);

// Post-acceptance REQUEST states: the deal is approved/financed and on its way
// (signature → delivery), but the definitive contract number isn't issued yet
// (that comes once "réglée"/ApplicationSettled). On these we create the Leazr
// contract WITHOUT a number and track the lifecycle.
const GRENKE_REQUEST_ACCEPTED = new Set([
  "ReadyToSign", "ContractPrinted", "ContractPrintedBeforeStatement",
  "AwaitingCustomerSignature", "AwaitingPartnerSignature", "AwaitingSigningAppSignature",
  "AwaitingDeliveryConfirmation", "StartingESignature", "Contracted",
]);

async function recordGrenkeSubmission(
  adminSupabase: ReturnType<typeof createClient>,
  offerId: string,
  item: GrenkeRequestItem & { submitted_at?: string },
  environment: Environment,
  opts?: { advanceWorkflow?: boolean },
): Promise<void> {
  const now = new Date().toISOString();
  const submittedAt = item.submitted_at ?? now;

  const { data: off } = await adminSupabase
    .from("offers").select("company_id, grenke_financing_id").eq("id", offerId).maybeSingle();
  const companyId = (off as { company_id?: string } | null)?.company_id ?? null;
  const prevActiveFid = (off as { grenke_financing_id?: string | null } | null)?.grenke_financing_id ?? null;

  // Upsert this dossier into the history (active flag decided below).
  if (item.FinancingId) {
    await adminSupabase.from("grenke_submissions").upsert({
      offer_id: offerId, company_id: companyId, financing_id: item.FinancingId,
      request_id: item.RequestId ?? null, state: item.State ?? null, environment,
      submitted_at: submittedAt, state_updated_at: now,
    }, { onConflict: "offer_id,financing_id" });
  }

  // The ACTIVE dossier is the live one (not Declined/Cancelled), most recent;
  // if all are terminal, the most recent. So linking an old refused dossier
  // never displaces a newer live one, and a re-submission becomes active.
  const { data: subRows } = await adminSupabase
    .from("grenke_submissions")
    .select("id, financing_id, request_id, state, environment, submitted_at")
    .eq("offer_id", offerId);
  const rows = (subRows ?? []) as Array<{ id: string; financing_id: string | null; request_id: string | null; state: string | null; environment: string | null; submitted_at: string | null }>;
  if (rows.length === 0) return;
  const live = rows.filter((r) => !GRENKE_TERMINAL_NEGATIVE.has(r.state ?? ""));
  const pickFrom = (live.length ? live : rows).slice().sort((a, b) => (b.submitted_at ?? "").localeCompare(a.submitted_at ?? ""));
  const active = pickFrom[0];

  for (const r of rows) {
    await adminSupabase.from("grenke_submissions").update({ is_active: r.id === active.id }).eq("id", r.id);
  }

  const update: Record<string, unknown> = {
    grenke_financing_id: active.financing_id,
    grenke_request_id: active.request_id,
    grenke_state: active.state,
    grenke_environment: active.environment ?? environment,
    grenke_submitted_at: active.submitted_at,
    grenke_state_updated_at: now,
    grenke_last_error: null,
  };
  // The user-facing leaser reference follows the ACTIVE dossier. On a
  // re-submission the active dossier changes: adopt its request number, or — if
  // Grenke hasn't assigned it yet (empty at POST time) — clear the stale number
  // from the previous dossier so the status poller backfills the new one instead
  // of leaving the old "180-…" showing in the header.
  if (active.request_id) update.leaser_request_number = active.request_id;
  else if (active.financing_id !== prevActiveFid) update.leaser_request_number = null;
  // If the active dossier changed, the signature flow restarts from scratch.
  if (active.financing_id !== prevActiveFid) update.grenke_esign_started_at = null;
  // Workflow status reflects the active dossier's Grenke state.
  //   Declined → leaser_rejected (a genuine refusal — reliable).
  // NB: a Grenke "Cancelled" request is AMBIGUOUS — it often means the request
  // was converted into a contract (i.e. ACCEPTED), not abandoned. So we do NOT
  // auto-classify Cancelled here; it stays in progress and is resolved by the
  // contracts sync / manual review.
  if (opts?.advanceWorkflow) {
    if (active.state === "Declined") update.workflow_status = "leaser_rejected";
    // An accepted deal (a contract exists) is the FINAL "financed" status.
    else if (GRENKE_ACCEPTED_STATES.has(active.state ?? "")) update.workflow_status = "financed";
    else if (active.state !== "Cancelled") update.workflow_status = "leaser_introduced";
  }
  await adminSupabase.from("offers").update(update).eq("id", offerId);
}

// Read the Grenke submission history of one offer (newest first).
async function handleGetGrenkeSubmissions(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  offerId: string | undefined,
): Promise<Response> {
  if (!offerId) return jsonResponse({ success: false, error: "validation_error", message: "offer_id is required" }, 400);
  const { data: offer } = await adminSupabase.from("offers").select("company_id").eq("id", offerId).maybeSingle();
  if (!offer) return jsonResponse({ success: false, error: "offer_not_found" }, 404);
  if ((offer as { company_id: string }).company_id !== companyId) return jsonResponse({ success: false, error: "forbidden" }, 403);
  const { data: subs } = await adminSupabase
    .from("grenke_submissions")
    .select("id, financing_id, request_id, state, environment, submitted_at, state_updated_at, is_active, created_at")
    .eq("offer_id", offerId)
    // Newest dossier first (Grenke request numbers are sequential), oldest last.
    .order("request_id", { ascending: false, nullsFirst: false });
  return jsonResponse({ success: true, offer_id: offerId, submissions: subs ?? [] }, 200);
}

async function handleReconcileGrenkeRequests(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
  payload: Record<string, unknown>,
): Promise<Response> {
  const auto = payload.auto === true;

  // 1. Fetch ALL Grenke requests (paginated).
  const items: GrenkeRequestItem[] = [];
  let page = 1;
  for (let guard = 0; guard < 50; guard++) {
    let resp: Response;
    try {
      resp = await grenkeFetch(environment, `/basic/v1/requests?requestListParameter.page=${page}&requestListParameter.pageSize=100`, { method: "GET" }, creds);
    } catch (e) {
      return jsonResponse({ success: false, error: "network_or_tls_error", message: e instanceof Error ? e.message : String(e) }, 502);
    }
    if (!resp.ok) {
      const t = await resp.text();
      return jsonResponse({ success: false, error: "grenke_error", status: resp.status, message: t.slice(0, 200) }, resp.status >= 500 ? 502 : resp.status);
    }
    const body = (await resp.json().catch(() => null)) as { Items?: GrenkeRequestItem[]; PageCount?: number } | null;
    const pageItems = body?.Items ?? [];
    items.push(...pageItems);
    const pageCount = body?.PageCount ?? 1;
    if (page >= pageCount || pageItems.length === 0) break;
    page++;
  }

  // 2. Load this company's Grenke offers.
  const { data: offerRows, error: offerErr } = await adminSupabase
    .from("offers")
    .select("id, client_name, dossier_number, monthly_payment, coefficient, financed_amount, grenke_financing_id, grenke_request_id, leaser_request_number, grenke_state, workflow_status, clients:client_id ( company, name )")
    .eq("company_id", companyId)
    .eq("leaser_id", GRENKE_LEASER_UUID);
  if (offerErr) return jsonResponse({ success: false, error: "offer_lookup_failed", message: offerErr.message }, 500);

  const allOffers = (offerRows ?? []) as unknown as Array<UnlinkedOffer & { grenke_financing_id: string | null; grenke_request_id: string | null; leaser_request_number: string | null; grenke_state: string | null }>;

  // A Grenke dossier is "already linked" when ANY of its identifiers (financing
  // GUID OR human request number 180-XXXXX) is already attached to an offer —
  // either in the submission history (active OR archived) OR directly on the
  // offer row (grenke_financing_id / grenke_request_id / leaser_request_number).
  // Matching only on financing_id missed offers linked by request number
  // (e.g. dossiers consolidated by hand, or requests that became contracts),
  // so they kept reappearing in "à valider".
  const offerIds = allOffers.map((o) => o.id);
  const { data: subRows } = await adminSupabase
    .from("grenke_submissions")
    .select("financing_id, request_id, offer_id")
    .in("offer_id", offerIds.length ? offerIds : ["00000000-0000-0000-0000-000000000000"]);
  const linkedIds = new Set<string>();
  ((subRows ?? []) as Array<{ financing_id: string | null; request_id: string | null }>).forEach((r) => {
    if (r.financing_id) linkedIds.add(String(r.financing_id));
    if (r.request_id) linkedIds.add(String(r.request_id));
  });
  for (const o of allOffers) {
    if (o.grenke_financing_id) linkedIds.add(String(o.grenke_financing_id));
    if (o.grenke_request_id) linkedIds.add(String(o.grenke_request_id));
    if (o.leaser_request_number) linkedIds.add(String(o.leaser_request_number));
  }

  // Map every dossier identifier → the offer it belongs to, so a terminal
  // (Declined/Cancelled) dossier can be traced back to its offer/contract.
  type OfferRow = typeof allOffers[number] & { workflow_status?: string | null };
  const offerById = new Map<string, OfferRow>(allOffers.map((o) => [o.id, o as OfferRow]));
  const offerByDossier = new Map<string, OfferRow>();
  for (const o of allOffers) {
    [o.grenke_financing_id, o.grenke_request_id, o.leaser_request_number].forEach((v) => { if (v) offerByDossier.set(String(v), o as OfferRow); });
  }
  ((subRows ?? []) as Array<{ financing_id: string | null; request_id: string | null; offer_id: string | null }>).forEach((r) => {
    const o = r.offer_id ? offerById.get(r.offer_id) : undefined;
    if (!o) return;
    if (r.financing_id) offerByDossier.set(String(r.financing_id), o);
    if (r.request_id) offerByDossier.set(String(r.request_id), o);
  });

  // Leazr contracts (by offer) so a cancelled/refused dossier moves its contract
  // to the "Annulés" tab.
  const { data: ctrRows } = await adminSupabase
    .from("contracts")
    .select("id, offer_id, status, contract_number")
    .eq("company_id", companyId);
  const contractByOffer = new Map<string, { id: string; status: string | null; contract_number: string | null }>();
  ((ctrRows ?? []) as Array<{ id: string; offer_id: string | null; status: string | null; contract_number: string | null }>).forEach((c) => { if (c.offer_id) contractByOffer.set(c.offer_id, { id: c.id, status: c.status, contract_number: c.contract_number }); });

  const { data: leaserRowReq } = await adminSupabase.from("leasers").select("name, logo_url").eq("id", GRENKE_LEASER_UUID).maybeSingle();
  let createdContractsReq = 0;
  let backfilledNumbers = 0;

  // Backfill the Grenke request number (180-XXXXX) onto the offer — this is what
  // fills the "N° Demande" column for Grenke contracts. Overwrites when the field
  // is empty OR holds a non-Grenke value (e.g. the internal iTakecare dossier
  // number "ITC-…" that was wrongly stored there). Only ever writes a real Grenke
  // number (180-XXXXX) and never clobbers an existing Grenke number.
  const isGrenkeNumber = (v: string | null | undefined) => /^\d{2,4}-\d+/.test(v ?? "");
  const backfillReqNumber = async (offerId: string, requestId: string | null) => {
    if (!requestId || !isGrenkeNumber(requestId)) return;
    const o = offerById.get(offerId) as { leaser_request_number?: string | null } | undefined;
    if (o && !isGrenkeNumber(o.leaser_request_number)) {
      await adminSupabase.from("offers").update({ leaser_request_number: requestId }).eq("id", offerId);
      o.leaser_request_number = requestId;
      backfilledNumbers++;
    }
  };

  // When a request is accepted/financed (post-acceptance, pre-contract-number),
  // resolve the offer: backfill its request number, mark it financed, record the
  // request sub-state, and ensure a Leazr contract exists (created WITHOUT a
  // definitive number — that arrives once "réglée"). Tracks the lifecycle so the
  // contract shows up under "Attente livraison" etc.
  const resolveAcceptedRequest = async (offerId: string, it: GrenkeRequestItem) => {
    await backfillReqNumber(offerId, it.RequestId ?? null);
    const nowTs = new Date().toISOString();
    await adminSupabase.from("offers")
      .update({ workflow_status: "financed", grenke_state: it.State, grenke_state_updated_at: nowTs })
      .eq("id", offerId).neq("workflow_status", "financed");
    // Always refresh the sub-state even if already financed.
    await adminSupabase.from("offers").update({ grenke_state: it.State, grenke_state_updated_at: nowTs }).eq("id", offerId);
    const ex = contractByOffer.get(offerId);
    if (ex) {
      await adminSupabase.from("contracts").update({ grenke_state: it.State, grenke_state_updated_at: nowTs }).eq("id", ex.id);
      return;
    }
    const newId = await createLeazrContractFromOffer(adminSupabase, offerId, { State: it.State }, leaserRowReq as { name?: string | null; logo_url?: string | null } | null);
    if (newId) { contractByOffer.set(offerId, { id: newId, status: "contract_sent", contract_number: null }); createdContractsReq++; }
  };

  // Candidate pool = ALL Grenke offers. An offer that already has an active
  // dossier can still receive a NEW one as a re-analysis (added to history) —
  // but only via manual review, never auto-linked (see `confident` below).
  const pool = allOffers;

  const expectedAmount = (o: UnlinkedOffer): number => {
    const coef = Number(o.coefficient) || 0;
    if (coef > 0 && Number(o.monthly_payment) > 0) return Math.round((Number(o.monthly_payment) * 100 / coef) * 100) / 100;
    return Math.round((o.financed_amount ?? 0) * 100) / 100;
  };

  // Best offer for a request, by name (company OR person) + BOTH amount AND
  // monthly agreeing (high confidence). Used to push the Grenke request number
  // onto every matching offer, whatever the request state — since we already
  // walk all /requests, every demande number can be propagated to its offer.
  const bestOfferForRequest = (it: GrenkeRequestItem): UnlinkedOffer | null => {
    const gName = normalizeTitle(it.Lessee?.CompanyName ?? "");
    if (!gName) return null;
    const gTokens = titleTokens(gName);
    const nameOk = (cand: string) => !!cand && (cand === gName || tokensSubset(gTokens, new Set(titleTokens(cand))) || tokensSubset(titleTokens(cand), new Set(gTokens)));
    let best: UnlinkedOffer | null = null, bestScore = -1;
    for (const o of allOffers) {
      const company = normalizeTitle(o.clients?.company || o.client_name || "");
      const person = normalizeTitle(o.client_name || o.clients?.name || "");
      if (!nameOk(company) && !nameOk(person)) continue;
      const exp = expectedAmount(o);
      const amountClose = !!it.FinancingAmount && Math.abs(exp - it.FinancingAmount) <= Math.max(1, it.FinancingAmount * 0.02);
      const monthlyClose = !!it.MonthlyTotalInstalment && !!o.monthly_payment && Math.abs(Number(o.monthly_payment) - it.MonthlyTotalInstalment) <= Math.max(0.5, it.MonthlyTotalInstalment * 0.02);
      if (!(amountClose && monthlyClose)) continue;
      const score = (company === gName || person === gName) ? 2 : 1;
      if (score > bestScore) { bestScore = score; best = o; }
    }
    return best;
  };

  const results: Array<Record<string, unknown>> = [];
  let autoLinked = 0, needsReview = 0, noMatch = 0, alreadyLinked = 0;

  for (const it of items) {
    // Propagate the demande number to its offer first, for EVERY request —
    // independent of the link/cancel branches below.
    if (it.RequestId) { const mo = bestOfferForRequest(it); if (mo) await backfillReqNumber(mo.id, it.RequestId); }

    const fid = it.FinancingId ?? "";
    const info = {
      financing_id: fid,
      request_id: it.RequestId ?? null,
      state: it.State ?? null,
      company: it.Lessee?.CompanyName ?? null,
      amount: it.FinancingAmount ?? null,
      monthly: it.MonthlyTotalInstalment ?? null,
    };
    const linkedOffer = offerByDossier.get(fid) || (it.RequestId ? offerByDossier.get(String(it.RequestId)) : undefined);
    const isTerminalNeg = it.State === "Declined" || it.State === "Cancelled";

    // Terminal-negative dossier (Declined/refused, or genuinely Cancelled) tied
    // to a known offer → reject the offer and move its contract to "Annulés".
    // Guarded: never touch a financed offer or one whose current Grenke state is
    // an accepted one (the contracts pass, which runs first, protects accepted
    // deals whose request merely *shows* as Cancelled).
    if (isTerminalNeg && linkedOffer) {
      const wf = linkedOffer.workflow_status ?? null;
      const ctNow = contractByOffer.get(linkedOffer.id);
      // A linked contract carrying a real Grenke contract number is an accepted
      // deal (its request merely shows as Cancelled) — never cancel it.
      const hasRealContract = !!(ctNow?.contract_number && ctNow.status !== "cancelled");
      const accepted = wf === "financed" || GRENKE_ACCEPTED_STATES.has(linkedOffer.grenke_state ?? "") || hasRealContract;
      if (!accepted) {
        const nowTs = new Date().toISOString();
        await adminSupabase.from("offers")
          .update({ workflow_status: "leaser_rejected", grenke_state: it.State, grenke_state_updated_at: nowTs })
          .eq("id", linkedOffer.id).neq("workflow_status", "financed");
        const ct = contractByOffer.get(linkedOffer.id);
        if (ct && ct.status !== "cancelled" && ct.status !== "completed") {
          // status only — keep this independent of the (maybe-unmigrated)
          // grenke_state column so the move to "Annulés" always lands.
          await adminSupabase.from("contracts").update({ status: "cancelled" }).eq("id", ct.id);
          await adminSupabase.from("contracts").update({ grenke_state: it.State, grenke_state_updated_at: new Date().toISOString() }).eq("id", ct.id);
        }
        results.push({ ...info, status: "already_linked", offer_id: linkedOffer.id });
        alreadyLinked++;
        continue;
      }
    }

    if ((fid && linkedIds.has(fid)) || (it.RequestId && linkedIds.has(String(it.RequestId)))) {
      // Accepted/financed request → keep the offer financed, track the sub-state,
      // create the contract if it doesn't exist yet (no number until "réglée").
      if (linkedOffer && GRENKE_REQUEST_ACCEPTED.has(it.State ?? "")) {
        await resolveAcceptedRequest(linkedOffer.id, it);
      } else if (linkedOffer) {
        await backfillReqNumber(linkedOffer.id, it.RequestId ?? null);
      }
      results.push({ ...info, status: "already_linked", offer_id: linkedOffer?.id });
      alreadyLinked++;
      continue;
    }

    const grenkeName = normalizeTitle(it.Lessee?.CompanyName ?? "");
    const grenkeTokens = titleTokens(grenkeName);
    const candidates = pool.map((o) => {
      // Match on the company name OR the contact/person name — Grenke often
      // registers an individual dossier under the person ("DANNEELS, ARNAUD")
      // while the Leazr offer's client.company is the SRL.
      const offerName = normalizeTitle(o.clients?.company || o.client_name || "");
      const personName = normalizeTitle(o.client_name || o.clients?.name || "");
      const nameMatches = (cand: string): boolean => {
        if (!cand || !grenkeName) return false;
        const candTokens = titleTokens(cand);
        return cand === grenkeName || tokensSubset(grenkeTokens, new Set(candTokens)) || tokensSubset(candTokens, new Set(grenkeTokens));
      };
      const nameMatch = nameMatches(offerName) || nameMatches(personName);
      if (!nameMatch) return null;
      const exp = expectedAmount(o);
      const amountClose = !!it.FinancingAmount && Math.abs(exp - it.FinancingAmount) <= Math.max(1, it.FinancingAmount * 0.01);
      const monthlyClose = !!it.MonthlyTotalInstalment && !!o.monthly_payment && Math.abs(Number(o.monthly_payment) - it.MonthlyTotalInstalment) <= Math.max(0.5, it.MonthlyTotalInstalment * 0.01);
      const score = 1 + (amountClose ? 2 : 0) + (monthlyClose ? 2 : 0);
      const oo = o as { grenke_financing_id?: string | null; grenke_state?: string | null; workflow_status?: string | null };
      const hasActive = !!oo.grenke_financing_id;
      // An offer whose active dossier is refused/cancelled can be auto-relinked
      // to a fresh live dossier (the re-analysis case).
      const activeTerminal = !hasActive || oo.grenke_state === "Declined" || oo.grenke_state === "Cancelled";
      // "Resolved" = the deal is already settled in Leazr: the offer is financed
      // or carries a real Grenke contract. A terminal dossier matching a resolved
      // offer is just an old/duplicate dossier (portal deals never submitted via
      // the API have no grenke_financing_id, so has_active alone missed them).
      const resolved = oo.workflow_status === "financed" || !!(contractByOffer.get(o.id)?.contract_number);
      return { offer_id: o.id, dossier_number: o.dossier_number, client_name: o.client_name || o.clients?.name || null, company: o.clients?.company || null, amount_close: amountClose, monthly_close: monthlyClose, has_active: hasActive, active_terminal: activeTerminal, resolved, score };
    }).filter(Boolean) as Array<{ offer_id: string; dossier_number: string | null; client_name: string | null; company: string | null; amount_close: boolean; monthly_close: boolean; has_active: boolean; active_terminal: boolean; resolved: boolean; score: number }>;
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      results.push({ ...info, status: "no_match" });
      noMatch++;
      continue;
    }

    const top = candidates[0];

    // A terminal dossier (Declined/Cancelled) is NEVER something to "link"
    // manually — linking a refused dossier achieves nothing. So it must never
    // land in "à valider". Two outcomes:
    //   - matches an already-resolved/active offer (amount or monthly agree) →
    //     archive into that offer's history (e.g. DANNEELS' cancelled 180-32688
    //     while the offer is already financed with a contract);
    //   - otherwise → informational "sans correspondance", not a to-do
    //     (e.g. GIURIATO's 180-29454 whose amount doesn't match any offer).
    if (isTerminalNeg) {
      if ((top.has_active || top.resolved) && (top.amount_close || top.monthly_close)) {
        // This Cancelled request is the accepted deal's original demande →
        // backfill its number onto the offer (fills the "N° Demande" column,
        // replacing any internal ITC number).
        await backfillReqNumber(top.offer_id, it.RequestId ?? null);
        if (auto) { try { await recordGrenkeSubmission(adminSupabase, top.offer_id, it, environment, {}); } catch { /* archive is best-effort */ } }
        results.push({ ...info, status: "already_linked", offer_id: top.offer_id, dossier_number: top.dossier_number, client_name: top.client_name });
        alreadyLinked++;
      } else {
        results.push({ ...info, status: "no_match" });
        noMatch++;
      }
      continue;
    }

    // Auto-link a single, amount/monthly-agreeing match when the candidate offer
    // has no active dossier OR its active dossier is refused/cancelled (the new
    // live dossier is clearly the re-analysis). An offer with a still-LIVE dossier
    // is left to manual review so the user knowingly adds it to the history.
    const newLive = it.State !== "Declined" && it.State !== "Cancelled";
    const confident = candidates.length === 1 && (top.amount_close || top.monthly_close) && top.active_terminal && newLive;
    if (confident && auto) {
      await recordGrenkeSubmission(adminSupabase, top.offer_id, it, environment, { advanceWorkflow: true });
      await backfillReqNumber(top.offer_id, it.RequestId ?? null);
      // Accepted/financed request → ensure the Leazr contract exists (no number
      // yet) and track the sub-state.
      if (GRENKE_REQUEST_ACCEPTED.has(it.State ?? "")) await resolveAcceptedRequest(top.offer_id, it);
      // Remove from the pool so it can't be matched again.
      const idx = pool.findIndex((p) => p.id === top.offer_id);
      if (idx >= 0) pool.splice(idx, 1);
      results.push({ ...info, status: "auto_linked", offer_id: top.offer_id, dossier_number: top.dossier_number, client_name: top.client_name });
      autoLinked++;
    } else {
      results.push({
        ...info,
        status: "needs_review",
        candidates: candidates.slice(0, 5).map((c) => ({ offer_id: c.offer_id, dossier_number: c.dossier_number, client_name: c.client_name, company: c.company, amount_close: c.amount_close, monthly_close: c.monthly_close })),
      });
      needsReview++;
    }
  }

  return jsonResponse({
    success: true,
    summary: { total: items.length, already_linked: alreadyLinked, auto_linked: autoLinked, needs_review: needsReview, no_match: noMatch, created_contracts: createdContractsReq, backfilled_numbers: backfilledNumbers },
    results,
  }, 200);
}

// Accepted-deal contract states to pull from Grenke /contracts (a deal that was
// approved → a contract exists/existed). Rescinded/Cancelled are excluded.
const GRENKE_CONTRACT_FETCH_STATES = [
  "ApplicationSettled", "Paid", "RunningContract", "ProlongedContract", "ExpiringSoon", "Expired",
];

type GrenkeContractItem = {
  ContractId?: string;
  State?: string;
  TotalInstalment?: number;
  NetAcquisitionValue?: number;
  Period?: number;
  StartDate?: string;
  EndDate?: string;
  Lessee?: { CompanyName?: string };
};

// Diagnostic: return the RAW Grenke contracts + requests matching a query
// (company name contains, or ContractId/RequestId equals). Lets us see the
// authoritative StartDate/EndDate/Period straight from Grenke for any deal.
async function handleDebugGrenkeLookup(environment: Environment, creds: Credentials, query: string): Promise<Response> {
  const q = query.trim().toLowerCase();
  const contracts: Array<Record<string, unknown>> = [];
  const requests: Array<Record<string, unknown>> = [];
  const match = (name: string | undefined, id: string | undefined) =>
    !!q && ((name ?? "").toLowerCase().includes(q) || String(id ?? "").toLowerCase().includes(q));

  for (const st of GRENKE_CONTRACT_FETCH_STATES) {
    let page = 1;
    for (let g = 0; g < 30; g++) {
      let resp: Response;
      try { resp = await grenkeFetch(environment, `/basic/v1/contracts?contractListParameter.page=${page}&contractListParameter.pageSize=100&contractListParameter.state=${st}`, { method: "GET" }, creds); } catch { break; }
      if (!resp.ok) break;
      const body = (await resp.json().catch(() => null)) as { Items?: GrenkeContractItem[]; PageCount?: number } | null;
      const items = body?.Items ?? [];
      for (const c of items) if (match(c.Lessee?.CompanyName, c.ContractId)) contracts.push({ ContractId: c.ContractId, State: c.State, StartDate: c.StartDate, EndDate: c.EndDate, Period: c.Period, NetAcquisitionValue: c.NetAcquisitionValue, TotalInstalment: c.TotalInstalment, Company: c.Lessee?.CompanyName });
      const pc = body?.PageCount ?? 1; if (page >= pc || items.length === 0) break; page++;
    }
  }
  let page = 1;
  for (let g = 0; g < 30; g++) {
    let resp: Response;
    try { resp = await grenkeFetch(environment, `/basic/v1/requests?requestListParameter.page=${page}&requestListParameter.pageSize=100`, { method: "GET" }, creds); } catch { break; }
    if (!resp.ok) break;
    const body = (await resp.json().catch(() => null)) as { Items?: GrenkeRequestItem[]; PageCount?: number } | null;
    const items = body?.Items ?? [];
    for (const r of items) if (match(r.Lessee?.CompanyName, r.RequestId)) requests.push({ RequestId: r.RequestId, FinancingId: r.FinancingId, State: r.State, FinancingAmount: r.FinancingAmount, MonthlyTotalInstalment: r.MonthlyTotalInstalment, Company: r.Lessee?.CompanyName });
    const pc = body?.PageCount ?? 1; if (page >= pc || items.length === 0) break; page++;
  }
  return jsonResponse({ success: true, query, contracts, requests }, 200);
}

// Create a Leazr contract from an accepted Grenke contract when the matched
// offer has none yet — server-side mirror of createContractFromOffer: inserts
// the contract row (with the Grenke number + start/end dates + state) and copies
// the offer's equipment (with attributes/specifications). Returns the new id.
async function createLeazrContractFromOffer(
  admin: ReturnType<typeof createClient>,
  offerId: string,
  c: GrenkeContractItem,
  leaser: { name?: string | null; logo_url?: string | null } | null,
): Promise<string | null> {
  const { data: offer } = await admin
    .from("offers")
    .select("id, client_name, client_id, monthly_payment, equipment_description, user_id, company_id, leaser_id, converted_to_contract")
    .eq("id", offerId).maybeSingle();
  if (!offer) return null;
  const o = offer as Record<string, unknown>;
  // Already converted once — if no contract row exists now it was deleted on
  // purpose; don't resurrect it. Just keep the offer financed.
  if (o.converted_to_contract === true) {
    await admin.from("offers").update({ workflow_status: "financed", grenke_state: c.State, grenke_state_updated_at: new Date().toISOString() }).eq("id", offerId).neq("workflow_status", "financed");
    return null;
  }
  const nowTs = new Date().toISOString();
  const { data: created, error } = await admin.from("contracts").insert({
    offer_id: offerId,
    client_name: o.client_name ?? null,
    client_id: o.client_id ?? null,
    monthly_payment: o.monthly_payment ?? null,
    equipment_description: o.equipment_description ?? null,
    leaser_id: o.leaser_id ?? GRENKE_LEASER_UUID,
    leaser_name: leaser?.name ?? "Grenke Lease",
    leaser_logo: leaser?.logo_url ?? null,
    status: "contract_sent",
    user_id: o.user_id ?? null,
    company_id: o.company_id ?? null,
    is_self_leasing: false,
    contract_number: c.ContractId ?? null,
    contract_start_date: c.StartDate ?? null,
    contract_end_date: c.EndDate ?? null,
    grenke_state: c.State ?? null,
    grenke_state_updated_at: nowTs,
  }).select("id").single();
  if (error || !created) { console.error("[grenke] create contract failed:", error?.message); return null; }
  const contractId = (created as { id: string }).id;

  // Copy equipment + attributes + specifications from the offer.
  const { data: eqRows } = await admin
    .from("offer_equipment")
    .select("id, title, purchase_price, quantity, margin, monthly_payment, serial_number, is_gifted, category_id, base_purchase_price, offer_equipment_attributes(key,value), offer_equipment_specifications(key,value)")
    .eq("offer_id", offerId);
  for (const eq of ((eqRows ?? []) as Array<Record<string, unknown>>)) {
    const { data: ceq } = await admin.from("contract_equipment").insert({
      contract_id: contractId,
      title: eq.title ?? "Équipement",
      purchase_price: eq.purchase_price ?? 0,
      quantity: eq.quantity ?? 1,
      margin: eq.margin ?? 0,
      monthly_payment: eq.monthly_payment ?? null,
      serial_number: eq.serial_number ?? null,
      is_gifted: (eq.is_gifted as boolean) ?? false,
      category_id: eq.category_id ?? null,
      base_purchase_price: eq.base_purchase_price ?? eq.purchase_price ?? 0,
    }).select("id").single();
    if (!ceq) continue;
    const ceqId = (ceq as { id: string }).id;
    const attrs = ((eq.offer_equipment_attributes ?? []) as Array<{ key: string; value: string }>).map((a) => ({ equipment_id: ceqId, key: a.key, value: a.value }));
    if (attrs.length) await admin.from("contract_equipment_attributes").insert(attrs);
    const specs = ((eq.offer_equipment_specifications ?? []) as Array<{ key: string; value: string }>).map((sp) => ({ equipment_id: ceqId, key: sp.key, value: sp.value }));
    if (specs.length) await admin.from("contract_equipment_specifications").insert(specs);
  }

  await admin.from("offers").update({ converted_to_contract: true, workflow_status: "financed", grenke_state: c.State, grenke_state_updated_at: nowTs }).eq("id", offerId);
  return contractId;
}

// Reconcile Grenke CONTRACTS (accepted deals) with Leazr offers. A request that
// was accepted disappears from /requests (shows as Cancelled) and becomes a
// contract in /contracts — so without this, accepted offers look annulé/refusé.
// Matching: company name + NetAcquisitionValue (≈ financed) + TotalInstalment
// (≈ monthly). Confident single matches are marked Accepté (leaser_approved).
async function handleReconcileGrenkeContracts(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  creds: Credentials,
  payload: Record<string, unknown>,
): Promise<Response> {
  const auto = payload.auto === true;

  // 1. Fetch contracts across every accepted state (paginated).
  const contracts: GrenkeContractItem[] = [];
  for (const st of GRENKE_CONTRACT_FETCH_STATES) {
    let page = 1;
    for (let guard = 0; guard < 50; guard++) {
      let resp: Response;
      try {
        resp = await grenkeFetch(environment, `/basic/v1/contracts?contractListParameter.page=${page}&contractListParameter.pageSize=100&contractListParameter.state=${st}`, { method: "GET" }, creds);
      } catch (e) {
        return jsonResponse({ success: false, error: "network_or_tls_error", message: e instanceof Error ? e.message : String(e) }, 502);
      }
      if (!resp.ok) break;
      const body = (await resp.json().catch(() => null)) as { Items?: GrenkeContractItem[]; PageCount?: number } | null;
      const items = body?.Items ?? [];
      contracts.push(...items);
      const pc = body?.PageCount ?? 1;
      if (page >= pc || items.length === 0) break;
      page++;
    }
  }

  // 2. Load this company's Grenke offers.
  const { data: offerRows, error: offerErr } = await adminSupabase
    .from("offers")
    .select("id, client_name, dossier_number, monthly_payment, coefficient, financed_amount, grenke_financing_id, grenke_request_id, leaser_request_number, grenke_state, workflow_status, clients:client_id ( company, name )")
    .eq("company_id", companyId)
    .eq("leaser_id", GRENKE_LEASER_UUID);
  if (offerErr) return jsonResponse({ success: false, error: "offer_lookup_failed", message: offerErr.message }, 500);
  const allOffers = (offerRows ?? []) as unknown as Array<UnlinkedOffer & { grenke_financing_id: string | null; grenke_request_id: string | null; leaser_request_number: string | null; grenke_state: string | null }>;

  // A contract is "already linked" when its ContractId is anywhere in the
  // submission history OR on an offer row. We index every known identifier
  // (contract id, financing GUID, request number) so a contract isn't
  // re-proposed just because the offer was linked by its request number.
  const offerIds = allOffers.map((o) => o.id);
  const { data: subRows } = await adminSupabase
    .from("grenke_submissions")
    .select("financing_id, request_id, offer_id")
    .in("offer_id", offerIds.length ? offerIds : ["00000000-0000-0000-0000-000000000000"]);
  const linkedContractIds = new Set<string>();
  ((subRows ?? []) as Array<{ financing_id: string | null; request_id: string | null }>).forEach((r) => {
    if (r.financing_id) linkedContractIds.add(String(r.financing_id));
    if (r.request_id) linkedContractIds.add(String(r.request_id));
  });
  for (const o of allOffers) {
    if (o.grenke_financing_id) linkedContractIds.add(String(o.grenke_financing_id));
    if (o.grenke_request_id) linkedContractIds.add(String(o.grenke_request_id));
    if (o.leaser_request_number) linkedContractIds.add(String(o.leaser_request_number));
  }

  // Many Grenke contracts already exist as Leazr CONTRACT rows (imported with
  // contract_number = the Grenke contract id 180-XXXXX) without going through an
  // offer. Index them so they're recognised as "already there" instead of being
  // reported as "sans correspondance". Keyed by contract_number and by a
  // company+amount fingerprint as a fallback.
  const { data: contractRows } = await adminSupabase
    .from("contracts")
    .select("id, offer_id, contract_number, client_name, monthly_payment, status, grenke_state, clients:client_id ( company )")
    .eq("company_id", companyId);
  type LeazrContract = { id: string; offer_id: string | null; contract_number: string | null; client_name: string | null; monthly_payment: number | null; status: string | null; grenke_state: string | null; clients?: { company?: string | null } | null };
  const existingContracts = (contractRows ?? []) as unknown as LeazrContract[];
  const contractByNumber = new Map<string, LeazrContract>();
  const contractByOffer = new Map<string, LeazrContract>();
  for (const cc of existingContracts) {
    if (cc.contract_number) contractByNumber.set(String(cc.contract_number), cc);
    if (cc.offer_id) contractByOffer.set(cc.offer_id, cc);
  }

  // Apply the authoritative Grenke contract data (number + start/end dates) onto
  // a Leazr contract row so everything stays in sync. Number is only filled when
  // empty (never clobbers a self-leasing LOC-ITC-… number); dates are refreshed
  // from Grenke when present. Also mutates the in-memory row so the financed
  // safety-net below sees the freshly-stamped number/state.
  const stampLeazrContract = async (cc: LeazrContract | undefined, c: GrenkeContractItem) => {
    if (!cc) return;
    const upd: Record<string, unknown> = {};
    if (!cc.contract_number && c.ContractId) { upd.contract_number = c.ContractId; cc.contract_number = c.ContractId; }
    if (c.StartDate) upd.contract_start_date = c.StartDate;
    if (c.EndDate) upd.contract_end_date = c.EndDate;
    // Keep the Statut column EXACTLY in sync with the Grenke contract state.
    if (c.State && cc.grenke_state !== c.State) {
      upd.grenke_state = c.State;
      upd.grenke_state_updated_at = new Date().toISOString();
      cc.grenke_state = c.State;
    }
    if (Object.keys(upd).length === 0) return;
    await adminSupabase.from("contracts").update(upd).eq("id", cc.id);
  };

  // Grenke leaser identity (for newly-created contracts).
  const { data: leaserRow } = await adminSupabase.from("leasers").select("name, logo_url").eq("id", GRENKE_LEASER_UUID).maybeSingle();
  let createdContracts = 0;
  // Ensure the matched offer has a Leazr contract: stamp the existing one, or
  // CREATE it from the offer when the deal is accepted at Grenke but was never
  // finalised into a contract in Leazr.
  const ensureContract = async (offerId: string, c: GrenkeContractItem): Promise<void> => {
    const ex = contractByOffer.get(offerId);
    if (ex) { await stampLeazrContract(ex, c); return; }
    const newId = await createLeazrContractFromOffer(adminSupabase, offerId, c, leaserRow as { name?: string | null; logo_url?: string | null } | null);
    if (newId) {
      const cc: LeazrContract = { id: newId, offer_id: offerId, contract_number: c.ContractId ?? null, client_name: null, monthly_payment: null, status: "contract_sent", grenke_state: c.State ?? null };
      contractByOffer.set(offerId, cc);
      existingContracts.push(cc);
      if (c.ContractId) contractByNumber.set(String(c.ContractId), cc);
      createdContracts++;
    }
  };
  const findExistingContract = (cid: string, companyName: string | null, monthly: number | null): LeazrContract | undefined => {
    const direct = cid ? contractByNumber.get(cid) : undefined;
    if (direct) return direct;
    // Fallback: same client (company OR person name) + monthly within 2%.
    const gName = normalizeTitle(companyName ?? "");
    if (!gName || monthly == null) return undefined;
    return existingContracts.find((cc) => {
      const cCompany = normalizeTitle(cc.clients?.company || "");
      const cPerson = normalizeTitle(cc.client_name || "");
      const nameOk = (cCompany && cCompany === gName) || (cPerson && cPerson === gName);
      if (!nameOk) return false;
      const m = Number(cc.monthly_payment) || 0;
      return m > 0 && Math.abs(m - monthly) <= Math.max(0.5, monthly * 0.02);
    });
  };

  const expectedAmount = (o: UnlinkedOffer): number => {
    const coef = Number(o.coefficient) || 0;
    if (coef > 0 && Number(o.monthly_payment) > 0) return Math.round((Number(o.monthly_payment) * 100 / coef) * 100) / 100;
    return Math.round((o.financed_amount ?? 0) * 100) / 100;
  };

  const results: Array<Record<string, unknown>> = [];
  let autoLinked = 0, needsReview = 0, noMatch = 0, alreadyLinked = 0;

  for (const c of contracts) {
    const cid = c.ContractId ?? "";
    const info = { financing_id: cid, request_id: cid, state: c.State ?? null, company: c.Lessee?.CompanyName ?? null, amount: c.NetAcquisitionValue ?? null, monthly: c.TotalInstalment ?? null };
    if (cid && linkedContractIds.has(cid)) {
      // Keep the contract sub-state fresh: ApplicationSettled ("demande réglée")
      // → RunningContract ("actif") once the next quarter starts.
      const nowTs = new Date().toISOString();
      await adminSupabase.from("grenke_submissions").update({ state: c.State, state_updated_at: nowTs }).eq("request_id", cid);
      await adminSupabase.from("offers").update({ grenke_state: c.State, grenke_state_updated_at: nowTs }).eq("grenke_request_id", cid);
      await stampLeazrContract(contractByNumber.get(cid), c);
      results.push({ ...info, status: "already_linked" }); alreadyLinked++; continue;
    }

    // Already present as a Leazr contract row. Refresh its Grenke sub-state on
    // the contract itself, AND — crucially — finance the linked offer: an
    // accepted Grenke contract exists, so the offer must be "financée" even if
    // it was never submitted through the API (portal-created dossier).
    const existing = findExistingContract(cid, c.Lessee?.CompanyName ?? null, c.TotalInstalment ?? null);
    if (existing) {
      const nowTs = new Date().toISOString();
      await stampLeazrContract(existing, c);
      if (existing.offer_id && GRENKE_ACCEPTED_STATES.has(c.State ?? "")) {
        await adminSupabase.from("offers")
          .update({ workflow_status: "financed", grenke_state: c.State, grenke_state_updated_at: nowTs })
          .eq("id", existing.offer_id)
          .neq("workflow_status", "financed");
      }
      results.push({ ...info, status: "already_linked", offer_id: existing.offer_id ?? undefined, dossier_number: existing.contract_number ?? null, client_name: existing.client_name ?? null });
      alreadyLinked++;
      continue;
    }

    const grenkeName = normalizeTitle(c.Lessee?.CompanyName ?? "");
    const grenkeTokens = titleTokens(grenkeName);
    const candidates = allOffers.map((o) => {
      // Match on company name OR contact/person name (Grenke registers many
      // individual contracts under the person while the Leazr offer's client is
      // the SRL) — same logic as the requests pass, so request↔contract align.
      const offerCompany = normalizeTitle(o.clients?.company || o.client_name || "");
      const offerPerson = normalizeTitle(o.client_name || o.clients?.name || "");
      const nameMatches = (cand: string): boolean => {
        if (!cand || !grenkeName) return false;
        const candTokens = titleTokens(cand);
        return cand === grenkeName || tokensSubset(grenkeTokens, new Set(candTokens)) || tokensSubset(candTokens, new Set(grenkeTokens));
      };
      const nameMatch = nameMatches(offerCompany) || nameMatches(offerPerson);
      if (!nameMatch) return null;
      const exp = expectedAmount(o);
      const amountClose = !!c.NetAcquisitionValue && Math.abs(exp - c.NetAcquisitionValue) <= Math.max(1, c.NetAcquisitionValue * 0.02);
      const monthlyClose = !!c.TotalInstalment && !!o.monthly_payment && Math.abs(Number(o.monthly_payment) - c.TotalInstalment) <= Math.max(0.5, c.TotalInstalment * 0.02);
      const oo = o as { grenke_request_id?: string | null; grenke_financing_id?: string | null };
      // The matched offer is already tied to a Grenke dossier (its request
      // became this contract) when it carries any dossier identifier.
      const offerLinked = !!(oo.grenke_request_id || oo.grenke_financing_id);
      return { offer_id: o.id, dossier_number: o.dossier_number, client_name: o.client_name || o.clients?.name || null, company: o.clients?.company || null, amount_close: amountClose, monthly_close: monthlyClose, offer_linked: offerLinked, score: 1 + (amountClose ? 2 : 0) + (monthlyClose ? 2 : 0) };
    }).filter(Boolean) as Array<{ offer_id: string; dossier_number: string | null; client_name: string | null; company: string | null; amount_close: boolean; monthly_close: boolean; offer_linked: boolean; score: number }>;
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 0) { results.push({ ...info, status: "no_match" }); noMatch++; continue; }
    const top = candidates[0];

    // If the best match is an offer ALREADY linked to a Grenke dossier, this
    // contract is that offer's accepted outcome (request → contract), not a new
    // dossier to link. Just refresh the offer's sub-state (ApplicationSettled
    // "demande réglée" → RunningContract "actif") and don't propose re-linking.
    if (top.offer_linked && (top.amount_close || top.monthly_close)) {
      const nowTs = new Date().toISOString();
      // Accepted contract → offer must be "financée"; otherwise just refresh state.
      const offerUpdate: Record<string, unknown> = { grenke_state: c.State, grenke_state_updated_at: nowTs };
      if (GRENKE_ACCEPTED_STATES.has(c.State ?? "")) offerUpdate.workflow_status = "financed";
      await adminSupabase.from("offers").update(offerUpdate).eq("id", top.offer_id);
      await adminSupabase.from("grenke_submissions").update({ state: c.State, state_updated_at: nowTs }).eq("offer_id", top.offer_id).eq("is_active", true);
      if (GRENKE_ACCEPTED_STATES.has(c.State ?? "")) await ensureContract(top.offer_id, c); else await stampLeazrContract(contractByOffer.get(top.offer_id), c);
      results.push({ ...info, status: "already_linked", offer_id: top.offer_id, dossier_number: top.dossier_number, client_name: top.client_name });
      alreadyLinked++;
      continue;
    }

    // Auto-link (and finance) when we're confident: either a single name match
    // that agrees on amount OR monthly, OR — when several offers share the
    // company name — the top candidate agrees on BOTH amount AND monthly and is
    // strictly the best (no tie). "À partir du moment où tout correspond."
    const second = candidates[1];
    const uniqueBest = !second || second.score < top.score;
    const confident =
      (candidates.length === 1 && (top.amount_close || top.monthly_close)) ||
      (top.amount_close && top.monthly_close && uniqueBest);
    if (confident && auto) {
      await recordGrenkeSubmission(adminSupabase, top.offer_id, { FinancingId: cid, RequestId: cid, State: c.State, submitted_at: new Date().toISOString() }, environment, { advanceWorkflow: true });
      await ensureContract(top.offer_id, c);
      results.push({ ...info, status: "auto_linked", offer_id: top.offer_id, dossier_number: top.dossier_number, client_name: top.client_name });
      autoLinked++;
    } else {
      results.push({ ...info, status: "needs_review", candidates: candidates.slice(0, 5).map((c2) => ({ offer_id: c2.offer_id, dossier_number: c2.dossier_number, client_name: c2.client_name, company: c2.company, amount_close: c2.amount_close, monthly_close: c2.monthly_close })) });
      needsReview++;
    }
  }

  // GLOBAL SAFETY NET — a Grenke offer whose linked Leazr contract is backed by
  // a REAL Grenke contract (it has a Grenke contract number, or the offer/contract
  // carries an accepted Grenke state) is financed, regardless of whether the
  // number matched the /contracts feed above (formatting, missing entry, etc.).
  // createContractFromOffer leaves such offers at workflow_status='accepted'.
  // IMPORTANT: we do NOT finance on the mere existence of a contract row — some
  // contracts were created prematurely while the Grenke dossier was ultimately
  // refused (e.g. Helene), and those must stay eligible for cancellation.
  let financedFromContracts = 0;
  const offerByIdC = new Map(allOffers.map((o) => [o.id, o as UnlinkedOffer & { workflow_status?: string | null; grenke_state?: string | null }]));
  for (const cc of existingContracts) {
    if (!cc.offer_id) continue;
    const o = offerByIdC.get(cc.offer_id);
    if (!o) continue; // not a Grenke offer (filtered by leaser above)
    if (cc.status === "cancelled" || cc.status === "completed") continue;
    if ((o.workflow_status ?? null) === "financed") continue;
    const backed = !!cc.contract_number || GRENKE_ACCEPTED_STATES.has(cc.grenke_state ?? "") || GRENKE_ACCEPTED_STATES.has(o.grenke_state ?? "");
    if (!backed) continue;
    await adminSupabase.from("offers").update({ workflow_status: "financed" }).eq("id", cc.offer_id).neq("workflow_status", "financed");
    financedFromContracts++;
  }

  return jsonResponse({
    success: true,
    summary: { total: contracts.length, already_linked: alreadyLinked, auto_linked: autoLinked, needs_review: needsReview, no_match: noMatch, financed_from_contracts: financedFromContracts, created_contracts: createdContracts },
    results,
  }, 200);
}

async function handleLinkGrenkeRequest(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  payload: Record<string, unknown>,
): Promise<Response> {
  const offerId = payload.offer_id as string | undefined;
  const financingId = payload.financing_id as string | undefined;
  if (!offerId || !financingId) {
    return jsonResponse({ success: false, error: "validation_error", message: "offer_id et financing_id requis" }, 400);
  }
  // Verify the offer belongs to the company and isn't already linked elsewhere.
  const { data: offer, error } = await adminSupabase
    .from("offers")
    .select("id, company_id, grenke_financing_id")
    .eq("id", offerId)
    .maybeSingle();
  if (error) return jsonResponse({ success: false, error: "offer_lookup_failed", message: error.message }, 500);
  if (!offer) return jsonResponse({ success: false, error: "offer_not_found" }, 404);
  if ((offer as { company_id: string }).company_id !== companyId) return jsonResponse({ success: false, error: "forbidden" }, 403);

  // Guard: don't attach a financingId that's already part of ANOTHER offer's
  // history. (Re-attaching it to the SAME offer is fine — it just refreshes it.)
  const { data: clash } = await adminSupabase
    .from("grenke_submissions")
    .select("offer_id")
    .eq("financing_id", financingId)
    .neq("offer_id", offerId)
    .maybeSingle();
  if (clash) return jsonResponse({ success: false, error: "already_linked_elsewhere", message: "Ce dossier Grenke est déjà lié à une autre offre." }, 409);

  // Adds to this offer's history and makes it the active dossier (archives any
  // previous one — that's exactly the re-analysis case).
  await recordGrenkeSubmission(adminSupabase, offerId, {
    FinancingId: financingId,
    RequestId: payload.request_id as string | undefined,
    State: payload.state as string | undefined,
  }, environment, { advanceWorkflow: true });

  return jsonResponse({ success: true, offer_id: offerId, financing_id: financingId }, 200);
}

async function handleBackfillProductLinks(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  dryRun: boolean,
): Promise<Response> {
  // 1. All catalog products for the company
  const { data: productsRaw, error: prodErr } = await adminSupabase
    .from("products")
    .select("id, name, category_id")
    .eq("company_id", companyId);
  if (prodErr) {
    return jsonResponse({ success: false, error: "products_lookup_failed", message: prodErr.message }, 500);
  }
  const products = (productsRaw ?? []) as Array<{ id: string; name: string; category_id: string | null }>;
  const normProducts = products.map((p) => {
    const norm = normalizeTitle(p.name ?? "");
    return { ...p, norm, tokens: new Set(titleTokens(norm)) };
  });

  // 2. All offer_equipment rows with no product link, scoped to the company
  //    (join offers to get company_id).
  const { data: equipRaw, error: equipErr } = await adminSupabase
    .from("offer_equipment")
    .select("id, title, category_id, product_id, offers!inner(company_id)")
    .is("product_id", null)
    .eq("offers.company_id", companyId);
  if (equipErr) {
    return jsonResponse({ success: false, error: "equipment_lookup_failed", message: equipErr.message }, 500);
  }
  const equipment = (equipRaw ?? []) as unknown as Array<{
    id: string;
    title: string;
    category_id: string | null;
  }>;

  const report = {
    total_unlinked: equipment.length,
    matched: 0,
    matched_with_category_set: 0,
    category_only: 0, // ambiguous product but unanimous category → set category only
    ambiguous: 0,
    no_match: 0,
    skipped_short: 0,
    samples: {
      matched: [] as Array<{ title: string; product_name: string }>,
      ambiguous: [] as Array<{ title: string; candidates: string[] }>,
      no_match: [] as string[],
    },
  };

  const updates: Array<{ id: string; product_id?: string; category_id?: string }> = [];

  for (const eq of equipment) {
    const nt = normalizeTitle(eq.title ?? "");
    if (nt.length < 4) {
      report.skipped_short++;
      continue;
    }
    const ntTokens = titleTokens(nt);
    const ntTokenSet = new Set(ntTokens);

    // Collect candidates with a tier (lower = more confident):
    //   1 exact normalized match
    //   2 substring either direction
    //   3 token-subset either direction (order-independent), ≥2 shared tokens
    const candidates: Array<{ p: typeof normProducts[number]; tier: number }> = [];
    for (const p of normProducts) {
      if (!p.norm) continue;
      if (p.norm === nt) { candidates.push({ p, tier: 1 }); continue; }
      if (p.norm.includes(nt) || nt.includes(p.norm)) { candidates.push({ p, tier: 2 }); continue; }
      // token-subset: all tokens of the shorter side present in the longer side
      const pTokensArr = [...p.tokens];
      if (pTokensArr.length >= 2 && ntTokens.length >= 2) {
        if (tokensSubset(pTokensArr, ntTokenSet) || tokensSubset(ntTokens, p.tokens)) {
          candidates.push({ p, tier: 3 });
        }
      }
    }

    if (candidates.length === 0) {
      report.no_match++;
      if (report.samples.no_match.length < 15) report.samples.no_match.push(eq.title);
      continue;
    }

    const bestTier = Math.min(...candidates.map((c) => c.tier));
    const best = candidates.filter((c) => c.tier === bestTier);

    if (best.length === 1) {
      // Exactly one confident match → link product_id + fill category if empty.
      const matched = best[0].p;
      const update: { id: string; product_id?: string; category_id?: string } = {
        id: eq.id,
        product_id: matched.id,
      };
      if (!eq.category_id && matched.category_id) {
        update.category_id = matched.category_id;
        report.matched_with_category_set++;
      }
      updates.push(update);
      report.matched++;
      if (report.samples.matched.length < 15) {
        report.samples.matched.push({ title: eq.title, product_name: matched.name });
      }
      continue;
    }

    // Multiple best-tier candidates. If they ALL share the same category and
    // the line has no category yet, we can at least set the category (which
    // drives the Grenke ObjectType) even though the exact product is unclear.
    const distinctCats = new Set(best.map((c) => c.p.category_id).filter(Boolean));
    if (!eq.category_id && distinctCats.size === 1) {
      const onlyCat = [...distinctCats][0] as string;
      updates.push({ id: eq.id, category_id: onlyCat });
      report.category_only++;
      continue;
    }

    report.ambiguous++;
    if (report.samples.ambiguous.length < 15) {
      report.samples.ambiguous.push({
        title: eq.title,
        candidates: best.slice(0, 5).map((c) => c.p.name),
      });
    }
  }

  // 3. Apply (unless dry run).
  let applied = 0;
  if (!dryRun) {
    for (const u of updates) {
      const patch: Record<string, string> = {};
      if (u.product_id) patch.product_id = u.product_id;
      if (u.category_id) patch.category_id = u.category_id;
      if (Object.keys(patch).length === 0) continue;
      const { error } = await adminSupabase
        .from("offer_equipment")
        .update(patch)
        .eq("id", u.id);
      if (!error) applied++;
      else console.error("[grenke-api] backfill update failed for", u.id, error.message);
    }
  }

  return jsonResponse({
    success: true,
    dry_run: dryRun,
    applied,
    report,
  }, 200);
}


