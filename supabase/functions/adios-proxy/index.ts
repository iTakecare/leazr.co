// AdiOS proxy — sends Meta Ads conversion events from Leazr to AdiOS.
//
// Four actions:
//   - "test"           : webhook_url provided directly, sends a test payload.
//                        Requires an authenticated user (called from settings).
//   - "trigger"        : called from authenticated app code (e.g. internal status
//                        change). Reads adios_integrations row for company_id.
//   - "sign_contract"  : called from the public contract signing page (anonymous).
//                        Authenticates via the signature_token. The function
//                        loads the contract / offer / client server-side and
//                        builds the AdiOS payload itself — clients cannot spoof
//                        amount, email, or company_id.
//   - "backfill"       : one-shot historical sync. Finds all signed contracts
//                        whose offer is Meta-attributed and not yet synced,
//                        and pushes each as a "won" conversion. Idempotent
//                        via offers.adios_synced_at — safe to re-run.
//
// AdiOS expected JSON shape:
//   { external_id, email, status, value_eur, occurred_at, notes }
// Endpoint: https://app.adios.pub/api/webhooks/conversions/<token>

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdiOSProxyRequest {
  action: "test" | "trigger" | "sign_contract" | "backfill";
  // For "test"
  webhook_url?: string;
  // For "trigger" (server-built payload by the caller)
  company_id?: string;
  event_type?: string;
  payload?: Record<string, unknown>;
  // For "sign_contract" (anonymous, public)
  signature_token?: string;
  // For "backfill"
  dry_run?: boolean;
  max_to_send?: number;       // Hard cap per call, default 100
  delay_between_ms?: number;  // Throttle, default 250ms
  // Re-process even clients/offers that were already synced. Use this to
  // re-emit a fixed status after the mapping logic has changed (the previous
  // run sent a wrong "Perdu" / "Refusé" that is now correctly "Won").
  // WARNING: existing AdiOS events keyed by old per-offer external_ids stay
  // in AdiOS — the new client-level events appear alongside them.
  force_resync?: boolean;
  // Optional ISO date (e.g. "2026-01-01") — only consider Meta-tagged offers
  // created on or after this date. The follow-up "all offers per client"
  // lookup is NOT filtered: a contract that closes a 2025 lead still counts
  // as won when the client also has a 2026 Meta offer in the candidate set.
  since_date?: string;
}

const ADIOS_HOST_HINT = "adios.pub";
const TEST_PAYLOAD_KEYS = ["external_id", "email", "status", "value_eur", "occurred_at", "notes"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const body: AdiOSProxyRequest = await req.json();
    const { action } = body;

    if (!action || !["test", "trigger", "sign_contract", "backfill", "list_meta_leads"].includes(action)) {
      return jsonResponse(
        { success: false, error: "Action invalide (test | trigger | sign_contract | backfill | list_meta_leads)" },
        400,
      );
    }

    // ---------- sign_contract: anonymous, token-authenticated ----------
    if (action === "sign_contract") {
      const { signature_token } = body;
      if (!signature_token) {
        return jsonResponse({ success: false, error: "signature_token manquant" }, 400);
      }
      return await handleSignContract(adminSupabase, signature_token);
    }

    // ---------- test / trigger: require authenticated user ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ success: false, error: "Non autorisé" }, 401);
    }

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userSupabase.auth.getUser(token);
    if (claimsError || !claims?.user) {
      return jsonResponse({ success: false, error: "Token invalide" }, 401);
    }
    const userId = claims.user.id;

    if (action === "test") {
      return await handleTest(userSupabase, adminSupabase, userId, body);
    }
    if (action === "backfill") {
      return await handleBackfill(userSupabase, adminSupabase, userId, body);
    }
    if (action === "list_meta_leads") {
      return await handleListMetaLeads(userSupabase, adminSupabase, userId, body);
    }
    return await handleTrigger(userSupabase, adminSupabase, userId, body);
  } catch (error) {
    console.error("[AdiOS Proxy] Unexpected error:", error);
    return jsonResponse({ success: false, error: "Erreur interne du serveur" }, 500);
  }
});

// =====================================================================
// sign_contract — anonymous, token-authenticated (public signing page)
// =====================================================================
async function handleSignContract(adminSupabase: any, signatureToken: string) {
  // Load contract by token. We accept tokens that produced a signature in the
  // last 30 minutes — that's our anti-replay window.
  const { data: contract, error: contractError } = await adminSupabase
    .from("contracts")
    .select(`
      id, offer_id, client_id, company_id, client_email, client_name,
      monthly_payment, contract_duration, contract_signed_at,
      contract_signer_name, signature_status, leaser_name
    `)
    .eq("contract_signature_token", signatureToken)
    .maybeSingle();

  if (contractError || !contract) {
    console.warn("[AdiOS sign_contract] Contract not found for token");
    return jsonResponse({ success: false, skipped: true, error: "Contrat introuvable" }, 200);
  }

  if (contract.signature_status !== "signed" || !contract.contract_signed_at) {
    return jsonResponse(
      { success: false, skipped: true, error: "Contrat non signé" },
      200,
    );
  }

  const signedAt = new Date(contract.contract_signed_at).getTime();
  if (Number.isFinite(signedAt) && Date.now() - signedAt > 30 * 60 * 1000) {
    // Token still valid but signing happened > 30 min ago — refuse (anti-replay).
    return jsonResponse(
      { success: false, skipped: true, error: "Fenêtre de déclenchement expirée" },
      200,
    );
  }

  // Load AdiOS config for the company
  const { data: config } = await adminSupabase
    .from("adios_integrations")
    .select("webhook_url, enabled_events, is_active")
    .eq("company_id", contract.company_id)
    .maybeSingle();

  if (!config || !config.is_active || !config.webhook_url) {
    return jsonResponse(
      { success: false, skipped: true, error: "AdiOS non configuré pour cette compagnie" },
      200,
    );
  }
  if (!Array.isArray(config.enabled_events) || !config.enabled_events.includes("contract_signed")) {
    return jsonResponse(
      { success: false, skipped: true, error: "Événement contract_signed désactivé" },
      200,
    );
  }

  // Load offer (for source / meta_platform / UTMs / remarks) and client (for notes)
  const [offerRes, clientRes] = await Promise.all([
    contract.offer_id
      ? adminSupabase
          .from("offers")
          .select("id, source, meta_platform, remarks, utm_source, utm_medium, utm_campaign, fbclid, landing_referrer, adios_synced_at")
          .eq("id", contract.offer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contract.client_id
      ? adminSupabase
          .from("clients")
          .select("id, email, notes")
          .eq("id", contract.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const offer = offerRes.data;
  const client = clientRes.data;

  // Idempotency: if this offer was already pushed to AdiOS (runtime trigger ran
  // earlier, or backfill caught it first), don't double-send.
  if (offer?.adios_synced_at) {
    return jsonResponse(
      { success: false, skipped: true, reason: "already_synced", error: "Conversion déjà envoyée à AdiOS" },
      200,
    );
  }

  // Detect Meta source. Skip the webhook entirely if not Meta — AdiOS only
  // cares about Meta-attributed conversions.
  const meta = detectMetaSource({
    meta_platform: offer?.meta_platform,
    utm_source: offer?.utm_source,
    utm_medium: offer?.utm_medium,
    fbclid: offer?.fbclid,
    offer_source: offer?.source,
    offer_remarks: offer?.remarks,
    client_notes: client?.notes,
  });

  if (!meta.isMeta) {
    return jsonResponse(
      { success: false, skipped: true, reason: "not_meta", error: "Lead non attribué à Meta" },
      200,
    );
  }

  const monthly = Number(contract.monthly_payment) || 0;
  const duration = Number(contract.contract_duration) || 0;
  const valueEur = Math.round(monthly * duration * 100) / 100;

  const notesParts = [
    `Source: ${meta.platform}`, // Facebook | Instagram | Meta
    meta.detectionMethod ? `Detection: ${meta.detectionMethod}` : null,
    contract.contract_signer_name ? `Signé par: ${contract.contract_signer_name}` : null,
    contract.leaser_name ? `Bailleur: ${contract.leaser_name}` : null,
  ].filter(Boolean);

  const adiosPayload = {
    external_id: contract.offer_id || contract.id,
    email: client?.email || contract.client_email || "",
    status: "won",
    value_eur: valueEur,
    occurred_at: contract.contract_signed_at,
    notes: notesParts.join(" | "),
  };

  return await sendToAdiOS({
    adminSupabase,
    targetUrl: config.webhook_url,
    targetCompanyId: contract.company_id,
    payload: adiosPayload,
    logTag: `sign_contract platform=${meta.platform}`,
    markOfferIdOnSuccess: offer?.id || null,
  });
}

// =====================================================================
// test — settings UI
// =====================================================================
async function handleTest(
  userSupabase: any,
  adminSupabase: any,
  userId: string,
  body: AdiOSProxyRequest,
) {
  const { webhook_url, payload } = body;
  if (!webhook_url) {
    return jsonResponse({ success: false, error: "URL du webhook manquante" }, 400);
  }
  const validation = validateAdiOSUrl(webhook_url);
  if (!validation.ok) return jsonResponse({ success: false, error: validation.error }, 400);

  const testPayload = isValidAdiOSPayload(payload) ? payload : {
    external_id: `test-${Date.now()}`,
    email: "test@leazr.co",
    status: "won",
    value_eur: 0,
    occurred_at: new Date().toISOString(),
    notes: "Test de connexion AdiOS depuis Leazr",
  };

  const { data: profile } = await userSupabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();
  const targetCompanyId = profile?.company_id || null;

  return await sendToAdiOS({
    adminSupabase,
    targetUrl: webhook_url,
    targetCompanyId,
    payload: testPayload,
    logTag: "test",
    skipDbUpdate: true,
  });
}

// =====================================================================
// trigger — server-built payload from authenticated app code
// =====================================================================
async function handleTrigger(
  userSupabase: any,
  adminSupabase: any,
  userId: string,
  body: AdiOSProxyRequest,
) {
  const { company_id, event_type, payload } = body;
  if (!company_id) return jsonResponse({ success: false, error: "company_id manquant" }, 400);
  if (!isValidAdiOSPayload(payload)) {
    return jsonResponse({ success: false, error: "Payload AdiOS invalide" }, 400);
  }

  const { data: profile } = await userSupabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();
  if (profile?.company_id && profile.company_id !== company_id) {
    return jsonResponse({ success: false, error: "Compagnie incorrecte" }, 403);
  }

  const { data: config } = await adminSupabase
    .from("adios_integrations")
    .select("webhook_url, enabled_events, is_active")
    .eq("company_id", company_id)
    .maybeSingle();

  if (!config || !config.is_active || !config.webhook_url) {
    return jsonResponse(
      { success: false, skipped: true, error: "AdiOS non configuré ou inactif" },
      200,
    );
  }

  const eventToCheck = event_type || "contract_signed";
  const enabledEvents = (config.enabled_events as string[]) || [];
  if (!enabledEvents.includes(eventToCheck)) {
    return jsonResponse(
      { success: false, skipped: true, error: `Événement '${eventToCheck}' non activé` },
      200,
    );
  }

  const validation = validateAdiOSUrl(config.webhook_url);
  if (!validation.ok) return jsonResponse({ success: false, error: validation.error }, 400);

  return await sendToAdiOS({
    adminSupabase,
    targetUrl: config.webhook_url,
    targetCompanyId: company_id,
    payload: payload!,
    logTag: `trigger ${eventToCheck}`,
  });
}

// =====================================================================
// backfill — push historical Meta-attributed offers (any status) to AdiOS
// =====================================================================
//
// Ran from the settings UI ("Importer l'historique" button). Idempotent:
// each successful send stamps offers.adios_synced_at, so re-running the
// backfill only picks up rows that haven't been synced yet.
//
// Scope: one AdiOS event per Meta-attributed CLIENT — not per offer. A
// single Leazr client typically accumulates several offers (initial Meta
// lead + edits/duplicates) and the contract that closes the deal often
// lives on a non-Meta-tagged offer (the form-edit flow rebuilds the row
// with source='client_request'). Deduplicating at the client level fixes
// both "missed wins" and "same lead sent multiple times".
//
// Status resolution per client = best status across all their offers:
//   won (contract exists, any offer) > qualified > rejected > lost
//
// External_id = the earliest Meta-tagged offer.id of the client. Stable
// across runs (as long as the original Meta offer isn't deleted).
//
// Every Meta lead is sent to AdiOS — no skipping. Even draft/sent/info_*
// statuses count as `qualified` because the lead is real and in the
// pipeline. Only explicit terminal states map to won/rejected/lost.
//
// Value:
//   - won           → offer.financed_amount − offer.amount
//                     (i.e. the gross margin: selling price to the leaser
//                      minus purchase price from the supplier).
//   - qualified/lost/rejected → 0  (AdiOS computes ROI on won values only)
//
// Throttled with a configurable delay between sends to avoid overloading
// AdiOS. Hard cap configurable per call (default 100, max 500).
async function handleBackfill(
  userSupabase: any,
  adminSupabase: any,
  userId: string,
  body: AdiOSProxyRequest,
) {
  const dryRun = body.dry_run === true;
  const forceResync = body.force_resync === true;
  const maxToSend = Math.max(1, Math.min(body.max_to_send ?? 100, 500));
  const delayMs = Math.max(0, Math.min(body.delay_between_ms ?? 250, 5000));

  // Optional "leads since X" filter. Validate the input shape so a malformed
  // string doesn't blow up the SQL.
  let sinceDateIso: string | null = null;
  if (typeof body.since_date === "string" && body.since_date.trim()) {
    const parsed = new Date(body.since_date.trim());
    if (Number.isNaN(parsed.getTime())) {
      return jsonResponse(
        { success: false, error: `since_date invalide: ${body.since_date}` },
        400,
      );
    }
    sinceDateIso = parsed.toISOString();
  }

  // Resolve caller's company.
  const { data: profile } = await userSupabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", userId)
    .single();

  const companyId = profile?.company_id;
  if (!companyId) {
    return jsonResponse({ success: false, error: "Compagnie introuvable" }, 403);
  }

  // Load AdiOS config for this company.
  const { data: config } = await adminSupabase
    .from("adios_integrations")
    .select("webhook_url, enabled_events, is_active")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!config || !config.is_active || !config.webhook_url) {
    return jsonResponse(
      { success: false, error: "AdiOS non configuré ou inactif pour cette compagnie" },
      400,
    );
  }
  const validation = validateAdiOSUrl(config.webhook_url);
  if (!validation.ok) return jsonResponse({ success: false, error: validation.error }, 400);

  // Step A: pull the set of client IDs that have a Meta marker in their notes.
  // This recovers leads whose offer was edited in the back-office and lost
  // its source='meta' / meta_platform tags — the client-level history line
  // ("Plateforme: Facebook" / "Plateforme: Instagram", written by
  // import-meta-leads) is rarely overwritten.
  const metaClientIds = new Set<string>();
  {
    const { data: metaClients } = await adminSupabase
      .from("clients")
      .select("id")
      .eq("company_id", companyId)
      .ilike("notes", "%Plateforme:%");
    for (const c of (metaClients || [])) {
      if (c.id) metaClientIds.add(c.id as string);
    }
  }
  console.log(`[AdiOS Backfill] ${metaClientIds.size} clients with Meta marker in notes`);

  // Step B: find candidate offers via a permissive OR filter:
  //   - source='meta' (set by import-meta-leads at creation)
  //   - meta_platform set (same)
  //   - fbclid / utm_source captured at landing
  //   - remarks contains "Plateforme:" (legacy free-text marker — survives
  //     most offer-edit flows that wipe source/meta_platform)
  //   - client_id ∈ Meta-tagged clients (recovers leads where the offer
  //     was rebuilt from scratch under a known Meta client)
  // The in-loop detectMetaSource re-verifies, so over-broad filters are safe.
  const orFilter = [
    "source.eq.meta",
    "meta_platform.not.is.null",
    "fbclid.not.is.null",
    "utm_source.not.is.null",
    "remarks.ilike.*Plateforme:*",
  ];
  if (metaClientIds.size > 0) {
    orFilter.push(`client_id.in.(${Array.from(metaClientIds).join(",")})`);
  }

  let candidatesQuery = adminSupabase
    .from("offers")
    .select(`
      id, client_id, client_name, client_email,
      source, meta_platform, remarks,
      utm_source, utm_medium, utm_campaign, fbclid, landing_referrer,
      workflow_status, amount, monthly_payment, financed_amount,
      created_at, updated_at, adios_synced_at
    `)
    .eq("company_id", companyId)
    .or(orFilter.join(","));
  if (!forceResync) {
    // Normal mode: only unsynced offers.
    candidatesQuery = candidatesQuery.is("adios_synced_at", null);
  }
  if (sinceDateIso) {
    candidatesQuery = candidatesQuery.gte("created_at", sinceDateIso);
  }
  const { data: candidates, error: candidatesError } = await candidatesQuery
    .order("created_at", { ascending: true })
    .limit(maxToSend * 5); // generous because we filter further in JS

  if (candidatesError) {
    console.error("[AdiOS Backfill] Error fetching candidates:", candidatesError);
    return jsonResponse(
      { success: false, error: `Erreur de récupération: ${candidatesError.message}` },
      500,
    );
  }

  console.log(`[AdiOS Backfill] Found ${candidates?.length || 0} unsynced Meta-tagged offers (pre-filter)`);

  // ===== Step C: group Meta-tagged offers by client =====
  // AdiOS attribution is per-lead = per-client. A single Leazr client can
  // accumulate multiple offers (initial Meta lead + edits/duplicates) — we
  // must not send N events for the same person.
  const metaOffersByClient = new Map<string, any[]>();
  for (const o of (candidates || []) as any[]) {
    if (!o.client_id) continue;
    const list = metaOffersByClient.get(o.client_id) ?? [];
    list.push(o);
    metaOffersByClient.set(o.client_id, list);
  }
  const candidateClientIds = Array.from(metaOffersByClient.keys());
  console.log(`[AdiOS Backfill] ${candidateClientIds.length} unique Meta-attributed clients`);

  // ===== Step D: load clients (email, notes) =====
  const clientByIdMap = new Map<string, { email: string | null; notes: string | null }>();
  if (candidateClientIds.length > 0) {
    const { data: clients } = await adminSupabase
      .from("clients")
      .select("id, email, notes")
      .in("id", candidateClientIds);
    for (const c of (clients || [])) {
      clientByIdMap.set(c.id, { email: c.email, notes: c.notes });
    }
  }

  // ===== Step E: load ALL offers for these clients =====
  // The contract that closes a Meta lead may live on a NON-Meta-tagged
  // offer (typical pattern: original Meta offer → edited/duplicated to a
  // fresh "demande client" offer → contract signed on the new one).
  // So look at every offer the client has, not just the Meta-tagged ones.
  const offersByClientMap = new Map<string, any[]>();
  if (candidateClientIds.length > 0) {
    const { data: allOffers } = await adminSupabase
      .from("offers")
      .select(`
        id, client_id, client_email, source, meta_platform, remarks,
        utm_source, utm_medium, fbclid,
        workflow_status, amount, monthly_payment, financed_amount,
        created_at, updated_at, adios_synced_at
      `)
      .eq("company_id", companyId)
      .in("client_id", candidateClientIds);
    for (const o of (allOffers || [])) {
      const list = offersByClientMap.get(o.client_id) ?? [];
      list.push(o);
      offersByClientMap.set(o.client_id, list);
    }
  }

  // ===== Step F: load all contracts for those offers =====
  const allOfferIds = Array.from(offersByClientMap.values()).flat().map((o: any) => o.id);
  const contractByOfferIdMap = new Map<string, {
    offer_id: string;
    monthly_payment: number | null;
    contract_duration: number | null;
    contract_signed_at: string | null;
    contract_signer_name: string | null;
    leaser_name: string | null;
    status: string | null;
    signature_status: string | null;
    created_at: string | null;
  }>();
  if (allOfferIds.length > 0) {
    const { data: contracts } = await adminSupabase
      .from("contracts")
      .select(
        "offer_id, monthly_payment, contract_duration, contract_signed_at, " +
          "contract_signer_name, leaser_name, signature_status, status, created_at",
      )
      .in("offer_id", allOfferIds)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });
    for (const c of (contracts || [])) {
      if (!contractByOfferIdMap.has(c.offer_id)) {
        contractByOfferIdMap.set(c.offer_id, c);
      }
    }
  }

  // ===== Stats =====
  const stats = {
    total_candidates: candidateClientIds.length, // count is now CLIENTS, not offers
    sent: 0,
    skipped_not_meta: 0,
    skipped_too_early: 0,
    skipped_already_synced: 0,
    errors: 0,
    by_status: { won: 0, qualified: 0, lost: 0, rejected: 0 },
    total_value_eur: 0,
    error_details: [] as Array<{ offer_id: string; error: string }>,
    details: [] as Array<{
      offer_id: string;
      status: string;
      platform: string;
      value_eur: number;
      workflow_status: string;
    }>,
  };

  // Status priority — bigger number wins when consolidating per client.
  const statusPriority: Record<"won" | "qualified" | "rejected" | "lost", number> = {
    won: 4,
    qualified: 3,
    rejected: 2,
    lost: 1,
  };

  // ===== Step G: loop over CLIENTS, not offers =====
  for (const clientId of candidateClientIds) {
    if (stats.sent >= maxToSend) break;

    const metaOffers = metaOffersByClient.get(clientId) ?? [];
    const allOffers = offersByClientMap.get(clientId) ?? metaOffers;
    const clientInfo = clientByIdMap.get(clientId) ?? null;

    // Idempotency: skip the client if every Meta-tagged offer is already
    // synced. Bypassed in force-resync mode (used after the mapping logic
    // has changed and we need to re-emit fixed statuses).
    if (!forceResync) {
      const anyUnsynced = metaOffers.some((o: any) => !o.adios_synced_at);
      if (!anyUnsynced) {
        stats.skipped_already_synced++;
        continue;
      }
    }

    // Re-confirm the client is genuinely Meta — must pass on at least one
    // of their Meta-tagged offers (the in-loop check handles legacy leads
    // detected by free-text scanning of remarks/notes).
    let meta: DetectResult | null = null;
    for (const o of metaOffers) {
      const r = detectMetaSource({
        meta_platform: o.meta_platform,
        utm_source: o.utm_source,
        utm_medium: o.utm_medium,
        fbclid: o.fbclid,
        offer_source: o.source,
        offer_remarks: o.remarks,
        client_notes: clientInfo?.notes ?? null,
      });
      if (r.isMeta) { meta = r; break; }
    }
    if (!meta || !meta.isMeta) {
      stats.skipped_not_meta++;
      continue;
    }

    // Pick the BEST status across all the client's offers (Meta-tagged or
    // not) — the contract may live on a non-Meta-tagged offer.
    type AdiosStatus = "won" | "qualified" | "rejected" | "lost";
    let bestStatus: AdiosStatus | null = null;
    let bestOffer: any = null;
    let bestContract: typeof contractByOfferIdMap extends Map<any, infer V> ? V | null : null = null;

    for (const o of allOffers) {
      const contract = contractByOfferIdMap.get(o.id) ?? null;
      const offerStatus: AdiosStatus = contract
        ? "won"
        : mapOfferStatusToAdios(o.workflow_status);
      if (!bestStatus || statusPriority[offerStatus] > statusPriority[bestStatus]) {
        bestStatus = offerStatus;
        bestOffer = o;
        bestContract = contract;
      }
    }

    if (!bestStatus || !bestOffer) {
      // Defensive: should never happen now (every status maps to one of the
      // four), but skip silently if the client somehow has no offer at all.
      stats.skipped_too_early++;
      continue;
    }

    // Stable external_id per client = the EARLIEST Meta-tagged offer.id.
    // (Stable across runs as long as we don't delete the earliest offer.)
    const sortedMeta = [...metaOffers].sort((a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const earliestMetaOffer = sortedMeta[0];

    // Value: margin = financed_amount − amount. The offer with the contract
    // is *not* always the one carrying the financial data — the typical
    // edit-flow rebuilds a "demande client" offer with financed_amount=0
    // while the original Meta offer kept the real numbers. So we scan the
    // client's offers in priority order (contract offer first, then siblings)
    // and pick the FIRST one with a positive margin. If none has data we
    // ship 0 and log it so the caller can spot the data-quality issue.
    let valueEur = 0;
    let marginSourceOfferId: string | null = null;
    if (bestStatus === "won") {
      const orderedForMargin = [
        bestOffer,
        ...allOffers.filter((o: any) => o.id !== bestOffer.id),
      ];
      for (const o of orderedForMargin) {
        const sell = Number(o?.financed_amount) || 0;
        const buy = Number(o?.amount) || 0;
        const m = sell - buy;
        if (m > 0) {
          valueEur = Math.round(m * 100) / 100;
          marginSourceOfferId = o.id;
          break;
        }
      }
      if (valueEur === 0) {
        console.warn(
          `[AdiOS Backfill] won client ${clientId} has no positive margin ` +
            `across ${allOffers.length} offers (financed_amount or amount missing/zero)`,
        );
      }
    }

    // Conversion timestamp: prefer contract.contract_signed_at, fall back
    // to contract.created_at, then offer.updated_at / created_at.
    let occurredAt: string = bestOffer.updated_at || bestOffer.created_at;
    if (bestContract) {
      if (bestContract.contract_signed_at) occurredAt = bestContract.contract_signed_at;
      else if (bestContract.created_at) occurredAt = bestContract.created_at;
    }

    const notesParts = [
      `Source: ${meta.platform}`,
      `Detection: ${meta.detectionMethod}`,
      `Workflow: ${bestOffer.workflow_status}`,
      bestOffer.id !== earliestMetaOffer.id ? `Best offer: ${bestOffer.id}` : null,
      marginSourceOfferId && marginSourceOfferId !== bestOffer.id
        ? `Margin from: ${marginSourceOfferId}`
        : null,
      "Backfill historique",
      bestContract?.contract_signer_name ? `Signé par: ${bestContract.contract_signer_name}` : null,
      bestContract?.leaser_name ? `Bailleur: ${bestContract.leaser_name}` : null,
    ].filter(Boolean);

    const adiosPayload = {
      external_id: earliestMetaOffer.id,
      email: clientInfo?.email || earliestMetaOffer.client_email || "",
      status: bestStatus,
      value_eur: valueEur,
      occurred_at: occurredAt,
      notes: notesParts.join(" | "),
    };

    const recordSentDetail = () => {
      stats.sent++;
      stats.by_status[bestStatus!]++;
      stats.total_value_eur = Math.round((stats.total_value_eur + valueEur) * 100) / 100;
      stats.details.push({
        offer_id: earliestMetaOffer.id,
        status: bestStatus!,
        platform: meta!.platform || "Meta",
        value_eur: valueEur,
        workflow_status: bestOffer.workflow_status,
      });
    };

    if (dryRun) {
      recordSentDetail();
      continue;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const adiosResponse = await fetch(config.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adiosPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (adiosResponse.status >= 200 && adiosResponse.status < 300) {
        // Stamp ALL Meta-tagged offers of this client so the next run
        // doesn't re-process the same person.
        await adminSupabase
          .from("offers")
          .update({ adios_synced_at: new Date().toISOString() })
          .in("id", metaOffers.map((o: any) => o.id));
        recordSentDetail();
      } else {
        const errText = await adiosResponse.text().catch(() => "");
        stats.errors++;
        stats.error_details.push({
          offer_id: earliestMetaOffer.id,
          error: `HTTP ${adiosResponse.status}: ${errText.substring(0, 200)}`,
        });
      }
    } catch (err) {
      stats.errors++;
      stats.error_details.push({
        offer_id: earliestMetaOffer.id,
        error: err instanceof Error ? err.message : "Erreur réseau",
      });
    }

    if (delayMs > 0 && stats.sent < maxToSend) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  // Stamp the integration row so the UI shows "last activity"
  if (!dryRun && stats.sent > 0) {
    await adminSupabase
      .from("adios_integrations")
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status: stats.errors === 0 ? "success" : "error",
        last_error: stats.errors === 0
          ? null
          : `Backfill: ${stats.errors} erreurs sur ${stats.sent + stats.errors} envois`,
      })
      .eq("company_id", companyId);
  }

  console.log(
    `[AdiOS Backfill] Done — sent=${stats.sent} ` +
    `(won=${stats.by_status.won}, qualified=${stats.by_status.qualified}, ` +
    `rejected=${stats.by_status.rejected}, lost=${stats.by_status.lost}), ` +
    `not_meta=${stats.skipped_not_meta}, too_early=${stats.skipped_too_early}, ` +
    `errors=${stats.errors}, dry_run=${dryRun}`,
  );

  return jsonResponse({
    success: true,
    dry_run: dryRun,
    ...stats,
  }, 200);
}

// =====================================================================
// list_meta_leads — diagnostic: dump emails + meta_lead_ids of every
// Meta-attributed offer the company has, optionally filtered by date.
// Used to compare with the source-of-truth Meta export and find leads
// the import-meta-leads function may have missed or mis-attributed.
// =====================================================================
async function handleListMetaLeads(
  userSupabase: any,
  adminSupabase: any,
  userId: string,
  body: AdiOSProxyRequest,
) {
  const { data: profile } = await userSupabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();
  const companyId = profile?.company_id;
  if (!companyId) {
    return jsonResponse({ success: false, error: "Compagnie introuvable" }, 403);
  }

  let sinceIso: string | null = null;
  if (typeof body.since_date === "string" && body.since_date.trim()) {
    const d = new Date(body.since_date.trim());
    if (Number.isNaN(d.getTime())) {
      return jsonResponse({ success: false, error: "since_date invalide" }, 400);
    }
    sinceIso = d.toISOString();
  }

  // Pre-fetch clients with Meta marker in notes (same trick as backfill).
  const metaClientIds = new Set<string>();
  {
    const { data: metaClients } = await adminSupabase
      .from("clients")
      .select("id")
      .eq("company_id", companyId)
      .ilike("notes", "%Plateforme:%");
    for (const c of (metaClients || [])) {
      if (c.id) metaClientIds.add(c.id as string);
    }
  }

  const orFilter = [
    "source.eq.meta",
    "meta_platform.not.is.null",
    "fbclid.not.is.null",
    "utm_source.not.is.null",
    "remarks.ilike.*Plateforme:*",
    "remarks.ilike.*Meta Lead ID*",
  ];
  if (metaClientIds.size > 0) {
    orFilter.push(`client_id.in.(${Array.from(metaClientIds).join(",")})`);
  }

  let q = adminSupabase
    .from("offers")
    .select(`
      id, client_id, client_email, source, meta_platform, remarks,
      workflow_status, created_at, adios_synced_at,
      amount, monthly_payment, financed_amount, margin, commission, coefficient
    `)
    .eq("company_id", companyId)
    .or(orFilter.join(","));
  if (sinceIso) q = q.gte("created_at", sinceIso);
  const { data: offers, error } = await q.order("created_at", { ascending: true });
  if (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }

  // Pull client emails
  const clientIds = Array.from(new Set(
    (offers || []).map((o: any) => o.client_id).filter(Boolean),
  )) as string[];
  const clientByIdMap = new Map<string, string | null>();
  if (clientIds.length > 0) {
    const { data: clients } = await adminSupabase
      .from("clients")
      .select("id, email")
      .in("id", clientIds);
    for (const c of (clients || [])) {
      clientByIdMap.set(c.id, c.email);
    }
  }

  // Extract Meta Lead ID from remarks if present.
  const metaLeadIdRegex = /Meta Lead ID:\s*([^\s\n,;]+)/i;
  const out = (offers || []).map((o: any) => {
    const m = typeof o.remarks === "string" ? o.remarks.match(metaLeadIdRegex) : null;
    const email =
      (clientByIdMap.get(o.client_id) || o.client_email || "").toString().trim().toLowerCase();
    return {
      offer_id: o.id,
      email,
      meta_lead_id: m ? m[1] : null,
      meta_platform: o.meta_platform,
      source: o.source,
      workflow_status: o.workflow_status,
      created_at: o.created_at,
      synced: !!o.adios_synced_at,
      // Financial fields — for diagnosing margin discrepancies.
      amount: o.amount,
      monthly_payment: o.monthly_payment,
      financed_amount: o.financed_amount,
      margin: o.margin,
      commission: o.commission,
      coefficient: o.coefficient,
    };
  });

  // Per-client dedup view (same key the backfill uses for AdiOS events).
  const byClient = new Map<string, any>();
  for (const r of out) {
    const key = r.email || `noemail-${r.offer_id}`;
    if (!byClient.has(key)) byClient.set(key, r);
  }

  return jsonResponse({
    success: true,
    company_id: companyId,
    since_date: sinceIso,
    total_offers: out.length,
    unique_emails: byClient.size,
    offers: out,
    unique_emails_list: Array.from(byClient.keys()).filter((e) => !e.startsWith("noemail-")).sort(),
  }, 200);
}

// =====================================================================
// shared HTTP send + DB update
// =====================================================================
interface SendArgs {
  adminSupabase: any;
  targetUrl: string;
  targetCompanyId: string | null;
  payload: Record<string, unknown>;
  logTag: string;
  skipDbUpdate?: boolean;
  // If set, the offer's adios_synced_at gets stamped on success so future
  // calls (runtime or backfill) skip it.
  markOfferIdOnSuccess?: string | null;
}

async function sendToAdiOS({
  adminSupabase, targetUrl, targetCompanyId, payload, logTag, skipDbUpdate, markOfferIdOnSuccess,
}: SendArgs) {
  console.log(`[AdiOS Proxy] ${logTag} → ${redactUrl(targetUrl)} (company=${targetCompanyId ?? "unknown"})`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let adiosResponse: Response;
  try {
    adiosResponse = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (fetchError) {
    clearTimeout(timeoutId);
    const errorMessage = fetchError instanceof Error
      ? (fetchError.name === "AbortError"
          ? "Timeout: AdiOS n'a pas répondu dans les 15 secondes"
          : `Erreur réseau: ${fetchError.message}`)
      : "Impossible de contacter AdiOS";
    console.error("[AdiOS Proxy] Fetch error:", errorMessage);

    if (!skipDbUpdate && targetCompanyId) {
      await adminSupabase
        .from("adios_integrations")
        .update({
          last_triggered_at: new Date().toISOString(),
          last_status: "error",
          last_error: errorMessage.substring(0, 500),
        })
        .eq("company_id", targetCompanyId);
    }
    return jsonResponse({ success: false, error: errorMessage }, 502);
  }

  const status = adiosResponse.status;
  let responseText = "";
  try { responseText = await adiosResponse.text(); } catch { /* noop */ }
  const ok = status >= 200 && status < 300;

  console.log(`[AdiOS Proxy] AdiOS responded ${status} (${ok ? "ok" : "error"})`);

  if (!skipDbUpdate && targetCompanyId) {
    await adminSupabase
      .from("adios_integrations")
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status: ok ? "success" : "error",
        last_error: ok ? null : `HTTP ${status}: ${responseText.substring(0, 300)}`,
      })
      .eq("company_id", targetCompanyId);
  }

  // Stamp the offer as synced so we don't re-send on future runs.
  if (ok && markOfferIdOnSuccess) {
    await adminSupabase
      .from("offers")
      .update({ adios_synced_at: new Date().toISOString() })
      .eq("id", markOfferIdOnSuccess);
  }

  if (ok) {
    return jsonResponse({
      success: true,
      status,
      message: "AdiOS a bien reçu la conversion",
      response: responseText.substring(0, 200),
    }, 200);
  }
  return jsonResponse({
    success: false,
    status,
    error: `AdiOS a répondu avec le code ${status}`,
    details: responseText.substring(0, 200),
  }, 200);
}

// =====================================================================
// Meta source detection — multi-tier, structured fields first
// =====================================================================
//
// Priority order (highest signal first):
//   1. offers.meta_platform — set by import-meta-leads from lead.platform.
//      Most reliable: deterministic, machine-set, never lies.
//   2. fbclid — Meta auto-appends this to outbound ad clicks. Strong signal.
//   3. UTM params — utm_source / utm_medium captured on landing.
//   4. offers.source = 'meta' — generic Meta attribution without platform info.
//      Used for legacy meta-imported offers where meta_platform is NULL.
//   5. Free-text scan of remarks + notes, anchored on the "Plateforme: X" line
//      written by import-meta-leads. Anchored to avoid false positives from
//      the generic "Facebook/Instagram" header line.
//
interface DetectInput {
  meta_platform?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  fbclid?: string | null;
  offer_source?: string | null;
  offer_remarks?: string | null;
  client_notes?: string | null;
}
interface DetectResult {
  isMeta: boolean;
  platform: "Facebook" | "Instagram" | "Meta" | null;
  detectionMethod: "meta_platform" | "fbclid" | "utm" | "source_meta" | "free_text" | null;
}

// Map a Leazr offer.workflow_status to one of the four AdiOS event statuses.
//
// A Meta lead exists from the moment it lands in the system — even at
// `draft` status, the form was filled and a real human is in the funnel.
// So the rule is simple: only the explicit terminal states ("rejected"
// flavors and `without_follow_up`) are negative; `signed/contract_signed/
// invoicing` is won; EVERYTHING ELSE (draft / sent / info_* / accepted /
// validated / financed / contract_sent / leaser_* / approved …) counts
// as `qualified` — the lead is real and still in the pipeline.
function mapOfferStatusToAdios(
  workflowStatus: string | null | undefined,
): "won" | "qualified" | "lost" | "rejected" {
  const s = (workflowStatus || "").toLowerCase().trim();

  // Terminal positive — contract signed, invoiced.
  if (["signed", "contract_signed", "invoicing"].includes(s)) return "won";

  // Terminal negative — explicit refusal at any level.
  if (
    ["internal_rejected", "leaser_rejected", "client_rejected", "rejected"].includes(s)
  ) {
    return "rejected";
  }

  // Lost — lead went cold / no follow-up.
  if (s === "without_follow_up") return "lost";

  // Everything else (including empty/unknown statuses) = an active lead
  // that hasn't reached a terminal state yet.
  return "qualified";
}

function detectMetaSource(input: DetectInput): DetectResult {
  // 1) Structured column from import-meta-leads
  const metaPlatform = (input.meta_platform || "").toLowerCase().trim();
  if (metaPlatform === "facebook") {
    return { isMeta: true, platform: "Facebook", detectionMethod: "meta_platform" };
  }
  if (metaPlatform === "instagram") {
    return { isMeta: true, platform: "Instagram", detectionMethod: "meta_platform" };
  }

  const utmSource = (input.utm_source || "").toLowerCase().trim();
  const utmMedium = (input.utm_medium || "").toLowerCase().trim();
  const offerSource = (input.offer_source || "").toLowerCase().trim();
  const fbclid = (input.fbclid || "").trim();

  // 2) fbclid — Meta-attributed traffic
  if (fbclid) {
    if (utmSource.includes("instagram") || utmSource === "ig") {
      return { isMeta: true, platform: "Instagram", detectionMethod: "fbclid" };
    }
    if (utmSource.includes("facebook") || utmSource === "fb") {
      return { isMeta: true, platform: "Facebook", detectionMethod: "fbclid" };
    }
    return { isMeta: true, platform: "Meta", detectionMethod: "fbclid" };
  }

  // 3) UTM-based detection
  for (const c of [utmSource, utmMedium]) {
    if (!c) continue;
    if (c.includes("instagram") || c === "ig") {
      return { isMeta: true, platform: "Instagram", detectionMethod: "utm" };
    }
    if (c.includes("facebook") || c === "fb") {
      return { isMeta: true, platform: "Facebook", detectionMethod: "utm" };
    }
    if (c.includes("meta")) {
      return { isMeta: true, platform: "Meta", detectionMethod: "utm" };
    }
  }

  // 4) source = 'meta' — generic Meta attribution (legacy meta-imported leads)
  if (offerSource === "meta") {
    // Try to recover platform from remarks/notes; otherwise fall through to
    // the free-text scanner below which anchors on "Plateforme:".
    const platformFromText = scanPlateformeLine([input.offer_remarks, input.client_notes]);
    if (platformFromText) {
      return { isMeta: true, platform: platformFromText, detectionMethod: "source_meta" };
    }
    return { isMeta: true, platform: "Meta", detectionMethod: "source_meta" };
  }

  // 5) Free-text fallback — only fires on /Plateforme:/ to avoid matching the
  //    generic "META (Facebook/Instagram)" header that lists both platforms.
  const platformFromText = scanPlateformeLine([input.offer_remarks, input.client_notes]);
  if (platformFromText) {
    return { isMeta: true, platform: platformFromText, detectionMethod: "free_text" };
  }

  return { isMeta: false, platform: null, detectionMethod: null };
}

/**
 * Scans free-text fields for a "Plateforme: Facebook" / "Plateforme: Instagram"
 * line, written by import-meta-leads in clients.notes and offers.remarks.
 * Anchored on "plateforme:" so the generic "(Facebook/Instagram)" header
 * doesn't trigger false positives.
 */
function scanPlateformeLine(fields: (string | null | undefined)[]): "Facebook" | "Instagram" | null {
  const text = fields.filter(Boolean).join("\n");
  if (!text) return null;
  const match = text.match(/plateforme\s*:\s*(facebook|instagram)/i);
  if (!match) return null;
  const platform = match[1].toLowerCase();
  if (platform === "facebook") return "Facebook";
  if (platform === "instagram") return "Instagram";
  return null;
}

// =====================================================================
// utils
// =====================================================================
function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validateAdiOSUrl(url: string): { ok: true } | { ok: false; error: string } {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, error: "URL invalide" }; }
  if (parsed.protocol !== "https:") return { ok: false, error: "L'URL doit être HTTPS" };
  if (!parsed.hostname.includes(ADIOS_HOST_HINT)) {
    console.warn("[AdiOS Proxy] URL doesn't look like an AdiOS webhook:", url);
  }
  return { ok: true };
}

function isValidAdiOSPayload(p: unknown): p is Record<string, unknown> {
  if (!p || typeof p !== "object") return false;
  // We only require external_id + status; everything else is best-effort.
  const obj = p as Record<string, unknown>;
  return typeof obj.external_id === "string" && typeof obj.status === "string";
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() || "";
    return `${u.host}${u.pathname.replace(last, last.substring(0, 8) + "…")}`;
  } catch {
    return "[invalid url]";
  }
}
