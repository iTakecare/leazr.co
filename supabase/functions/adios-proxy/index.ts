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

    if (!action || !["test", "trigger", "sign_contract", "backfill"].includes(action)) {
      return jsonResponse(
        { success: false, error: "Action invalide (test | trigger | sign_contract | backfill)" },
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
// Scope: every Meta-attributed offer in any terminal-or-progressing
// state. Status resolution priority:
//   1. If a non-cancelled contract exists for the offer → "won"
//      (the deal is closed regardless of where offers.workflow_status
//      stands — workflow tracking lags reality in practice).
//   2. Otherwise map offers.workflow_status (see `mapOfferStatusToAdios`).
// Early stages (draft / sent / info_requested / …) with no contract are
// skipped — there's nothing useful to attribute yet.
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
  const maxToSend = Math.max(1, Math.min(body.max_to_send ?? 100, 500));
  const delayMs = Math.max(0, Math.min(body.delay_between_ms ?? 250, 5000));

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

  // Find candidates: Meta-attributed offers that haven't been synced yet.
  // The OR pre-filter is broad on purpose — we re-confirm with detectMetaSource
  // inside the loop (which also scans remarks / notes for legacy leads).
  const { data: candidates, error: candidatesError } = await adminSupabase
    .from("offers")
    .select(`
      id, client_id, client_name, client_email,
      source, meta_platform, remarks,
      utm_source, utm_medium, utm_campaign, fbclid, landing_referrer,
      workflow_status, amount, monthly_payment, financed_amount,
      created_at, updated_at, adios_synced_at
    `)
    .eq("company_id", companyId)
    .or("source.eq.meta,meta_platform.not.is.null,fbclid.not.is.null,utm_source.not.is.null")
    .is("adios_synced_at", null)
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

  // Pre-load all client emails + notes in one query (avoid N+1)
  const clientIds = Array.from(new Set((candidates || [])
    .map((c: any) => c.client_id)
    .filter(Boolean))) as string[];
  const clientByIdMap = new Map<string, { email: string | null; notes: string | null }>();
  if (clientIds.length > 0) {
    const { data: clients } = await adminSupabase
      .from("clients")
      .select("id, email, notes")
      .in("id", clientIds);
    for (const c of (clients || [])) {
      clientByIdMap.set(c.id, { email: c.email, notes: c.notes });
    }
  }

  // Pre-load contracts for ALL candidate offers — not just the ones whose
  // workflow_status already says "signed". Reason: the offer's workflow can
  // sit at e.g. `validated` / `financed` / `contract_sent` for a long while
  // (admin/back-office not updating it) even though a contract row already
  // exists in Leazr. From AdiOS' standpoint the conversion is acquired the
  // moment a contract is generated. So: any non-cancelled contract = won.
  const allOfferIds = (candidates || []).map((o: any) => o.id);
  const contractByOfferIdMap = new Map<string, {
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
      // Multiple contracts per offer (renewals) → keep the most recent one;
      // ordering above is `created_at DESC`, so the first hit wins.
      if (!contractByOfferIdMap.has(c.offer_id)) {
        contractByOfferIdMap.set(c.offer_id, c);
      }
    }
  }

  const stats = {
    total_candidates: candidates?.length || 0,
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

  for (const offer of (candidates || []) as any[]) {
    if (stats.sent >= maxToSend) break;

    if (offer.adios_synced_at) {
      stats.skipped_already_synced++;
      continue;
    }

    const clientInfo = offer.client_id ? clientByIdMap.get(offer.client_id) : null;

    const meta = detectMetaSource({
      meta_platform: offer.meta_platform,
      utm_source: offer.utm_source,
      utm_medium: offer.utm_medium,
      fbclid: offer.fbclid,
      offer_source: offer.source,
      offer_remarks: offer.remarks,
      client_notes: clientInfo?.notes ?? null,
    });
    if (!meta.isMeta) {
      stats.skipped_not_meta++;
      continue;
    }

    // Status resolution:
    //   1. If a non-cancelled contract exists → "won" (deal closed, even if
    //      the offer's workflow_status hasn't been updated yet).
    //   2. Otherwise fall back to mapping the offer's workflow_status.
    const contract = contractByOfferIdMap.get(offer.id);
    const adiosStatus = contract
      ? "won"
      : mapOfferStatusToAdios(offer.workflow_status);

    if (!adiosStatus) {
      // Too early in the funnel (draft / sent / info_*); nothing to attribute.
      stats.skipped_too_early++;
      continue;
    }

    // Compute value_eur:
    //   won → margin = offer.financed_amount − offer.amount
    //   others → 0 (AdiOS computes ROI on actual revenue only)
    let valueEur = 0;
    let occurredAt: string = offer.updated_at || offer.created_at;
    let signerName: string | null = null;
    let leaserName: string | null = null;

    if (adiosStatus === "won") {
      // Margin = selling price to the leaser − purchase price from supplier.
      // Both stored on the offer; clamp negative results to 0 so we never
      // ship a nonsense negative number to AdiOS.
      const sellingPrice = Number(offer.financed_amount) || 0;
      const purchasePrice = Number(offer.amount) || 0;
      const margin = sellingPrice - purchasePrice;
      valueEur = Math.round((margin > 0 ? margin : 0) * 100) / 100;

      // Contract details (when present) → use the actual signed date /
      // contract creation date as the conversion timestamp, plus signer
      // and leaser names for the AdiOS event notes.
      if (contract) {
        if (contract.contract_signed_at) {
          occurredAt = contract.contract_signed_at;
        } else if (contract.created_at) {
          occurredAt = contract.created_at;
        }
        signerName = contract.contract_signer_name;
        leaserName = contract.leaser_name;
      }
    }

    const notesParts = [
      `Source: ${meta.platform}`,
      `Detection: ${meta.detectionMethod}`,
      `Workflow: ${offer.workflow_status}`,
      "Backfill historique",
      signerName ? `Signé par: ${signerName}` : null,
      leaserName ? `Bailleur: ${leaserName}` : null,
    ].filter(Boolean);

    const adiosPayload = {
      external_id: offer.id,
      email: clientInfo?.email || offer.client_email || "",
      status: adiosStatus,
      value_eur: valueEur,
      occurred_at: occurredAt,
      notes: notesParts.join(" | "),
    };

    const recordSentDetail = () => {
      stats.sent++;
      stats.by_status[adiosStatus]++;
      stats.total_value_eur = Math.round((stats.total_value_eur + valueEur) * 100) / 100;
      stats.details.push({
        offer_id: offer.id,
        status: adiosStatus,
        platform: meta.platform || "Meta",
        value_eur: valueEur,
        workflow_status: offer.workflow_status,
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
        await adminSupabase
          .from("offers")
          .update({ adios_synced_at: new Date().toISOString() })
          .eq("id", offer.id);
        recordSentDetail();
      } else {
        const errText = await adiosResponse.text().catch(() => "");
        stats.errors++;
        stats.error_details.push({
          offer_id: offer.id,
          error: `HTTP ${adiosResponse.status}: ${errText.substring(0, 200)}`,
        });
      }
    } catch (err) {
      stats.errors++;
      stats.error_details.push({
        offer_id: offer.id,
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
// Returns null for early-stage statuses where there's nothing to attribute.
function mapOfferStatusToAdios(
  workflowStatus: string | null | undefined,
): "won" | "qualified" | "lost" | "rejected" | null {
  if (!workflowStatus) return null;
  const s = workflowStatus.toLowerCase().trim();

  // Won — terminal positive (contract signed, invoiced)
  if (["signed", "contract_signed", "invoicing"].includes(s)) return "won";

  // Qualified — accepted at some level, in progress towards won
  if (
    [
      "accepted",
      "validated",
      "financed",
      "contract_sent",
      "leaser_review",
      "leaser_introduced",
      "approved",
    ].includes(s)
  ) {
    return "qualified";
  }

  // Rejected — explicit refusal, terminal negative
  if (
    ["internal_rejected", "leaser_rejected", "client_rejected", "rejected"].includes(s)
  ) {
    return "rejected";
  }

  // Lost — abandoned without explicit refusal
  if (s === "without_follow_up") return "lost";

  // Too early to attribute: draft / sent / offer_send / info_requested /
  // info_received / internal_docs_requested / internal_approved
  return null;
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
