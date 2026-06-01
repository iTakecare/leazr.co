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
    | "refresh_reference_data"
    | "build_offer_payload";
  environment?: Environment;
  // future fields (calculate, submit_offer, …) live under `payload`
  payload?: Record<string, unknown>;
  financing_id?: string;
  offer_id?: string;
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

      case "refresh_reference_data":
        return await handleRefreshReferenceData(adminSupabase, companyId, environment, creds);

      case "build_offer_payload":
        return await handleBuildOfferPayload(adminSupabase, companyId, environment, body.offer_id);

      case "submit_offer":
      case "get_status":
      case "get_contract_doc":
      case "upload_document":
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
  Name: string;
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

async function handleBuildOfferPayload(
  adminSupabase: ReturnType<typeof createClient>,
  companyId: string,
  environment: Environment,
  offerId: string | undefined,
): Promise<Response> {
  if (!offerId || typeof offerId !== "string") {
    return jsonResponse({
      success: false,
      error: "validation_error",
      message: "offer_id is required",
    }, 400);
  }

  // ---------- 1. Load offer + verify ownership ----------
  const { data: offer, error: offerErr } = await adminSupabase
    .from("offers")
    .select("id, company_id, client_id, financed_amount, duration, leaser_id, monthly_payment")
    .eq("id", offerId)
    .maybeSingle();

  if (offerErr) {
    console.error("[grenke-api] build_offer_payload: offer fetch failed", offerErr);
    return jsonResponse({ success: false, error: "offer_lookup_failed", message: offerErr.message }, 500);
  }
  if (!offer) {
    return jsonResponse({ success: false, error: "offer_not_found", message: `Offer ${offerId} not found` }, 404);
  }
  if (offer.company_id !== companyId) {
    return jsonResponse({ success: false, error: "forbidden", message: "Offer belongs to a different company" }, 403);
  }

  // ---------- 2. Load client ----------
  const { data: client, error: clientErr } = await adminSupabase
    .from("clients")
    .select(
      "id, company, name, vat_number, entity_type, company_creation_date, email, phone, address, city, postal_code, country",
    )
    .eq("id", offer.client_id)
    .maybeSingle();

  if (clientErr) {
    return jsonResponse({ success: false, error: "client_lookup_failed", message: clientErr.message }, 500);
  }
  if (!client) {
    return jsonResponse({ success: false, error: "client_not_found", message: `Client ${offer.client_id} not found` }, 404);
  }

  // ---------- 3. Load equipment + products + brands ----------
  const { data: equipment, error: equipErr } = await adminSupabase
    .from("offer_equipment")
    .select(`
      id, title, quantity, purchase_price, category_id, serial_number, order_notes,
      product_id,
      products:product_id (
        id, brand_name, brand_id
      )
    `)
    .eq("offer_id", offerId)
    .order("created_at");

  if (equipErr) {
    return jsonResponse({ success: false, error: "equipment_lookup_failed", message: equipErr.message }, 500);
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

  const addressLine1 = (client.address ?? "").trim();
  if (!addressLine1) {
    warnings.push({
      field: "Lessee.Addresses[0].Line1",
      message: "L'adresse du client est vide.",
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
      PostCode: (client.postal_code ?? "").trim(),
      City: (client.city ?? "").trim(),
      Country: (client.country ?? "BE").toUpperCase(),
      Type: "Main",
    }],
  };

  // --- FinancingObjects ---
  type EquipmentRow = {
    id: string;
    title: string;
    quantity: number;
    purchase_price: number;
    category_id: string | null;
    serial_number: string | null;
    order_notes: string | null;
    product_id: string | null;
    products: { id: string; brand_name: string | null; brand_id: string | null } | null;
  };

  const financingObjects: GrenkeFinancingObject[] = [];
  let computedTotal = 0;

  for (const [idx, raw] of ((equipment ?? []) as unknown as EquipmentRow[]).entries()) {
    const eq = raw;
    // ObjectTypeId
    const objectTypeRaw = mappings.object_type[eq.category_id ?? ""];
    let objectTypeId: number | undefined;
    if (objectTypeRaw) {
      const parsed = Number(objectTypeRaw);
      if (Number.isFinite(parsed)) objectTypeId = parsed;
    } else if (!eq.category_id) {
      warnings.push({
        field: `FinancingObjects[${idx}].ObjectTypeId`,
        message: `L'équipement "${eq.title}" n'a pas de catégorie Leazr. Renseignez-la sur le produit ou directement sur la ligne d'équipement.`,
      });
    } else {
      warnings.push({
        field: `FinancingObjects[${idx}].ObjectTypeId`,
        message: `La catégorie de "${eq.title}" n'est pas mappée. Voir Settings → Intégrations → Grenke → Mappings.`,
      });
    }

    // Manufacturer (pass-through unless override)
    let manufacturer = "Other";
    const brandId = eq.products?.brand_id ?? null;
    if (brandId && mappings.manufacturer[brandId]) {
      manufacturer = mappings.manufacturer[brandId];
    } else if (eq.products?.brand_name) {
      manufacturer = eq.products.brand_name;
    } else {
      warnings.push({
        field: `FinancingObjects[${idx}].Manufacturer`,
        message: `Aucune marque trouvée pour "${eq.title}" — envoi de "Other" comme fallback.`,
      });
    }

    const obj: GrenkeFinancingObject = {
      Quantity: eq.quantity,
      ObjectTypeId: objectTypeId,
      Manufacturer: manufacturer,
      NetPricePerObject: eq.purchase_price,
      Name: eq.title,
    };
    if (eq.serial_number) obj.SerialNumber = eq.serial_number;
    if (eq.order_notes) obj.Details = eq.order_notes;

    financingObjects.push(obj);
    computedTotal += eq.quantity * eq.purchase_price;
  }

  if (financingObjects.length === 0) {
    warnings.push({
      field: "FinancingObjects",
      message: "Aucun équipement sur cette offre.",
    });
  }

  // Sanity check: Grenke requires FinancingAmount === Σ(Quantity * NetPricePerObject)
  computedTotal = Math.round(computedTotal * 100) / 100;
  const declaredAmount = Math.round((offer.financed_amount ?? 0) * 100) / 100;
  if (computedTotal !== declaredAmount) {
    warnings.push({
      field: "FinancingAmount",
      message: `Incohérence: FinancingAmount=${declaredAmount} mais Σ(quantity × purchase_price)=${computedTotal}. Grenke rejettera ce déséquilibre.`,
    });
  }

  // --- Final payload ---
  const payload: GrenkeFinancingRequest = {
    FinancingAmount: declaredAmount,
    Period: offer.duration ?? 36,
    PaymentFrequency: "Quarterly",
    PaymentMethod: "Invoice",
    Currency: "EUR",
    ProductType: "Rent",
    Lessee: lessee,
    FinancingObjects: financingObjects,
  };

  return jsonResponse({
    success: warnings.length === 0,
    environment,
    offer_id: offerId,
    payload,
    warnings,
    sums: {
      computed_total: computedTotal,
      declared_financing_amount: declaredAmount,
    },
  }, 200);
}


