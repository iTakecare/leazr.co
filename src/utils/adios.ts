import { supabase } from "@/integrations/supabase/client";

/**
 * AdiOS — Meta Ads conversion attribution.
 *
 * The actual webhook delivery, source detection, and payload construction
 * happen server-side in the `adios-proxy` edge function. These helpers are
 * thin wrappers used by the settings UI and the public signing page.
 */

export interface AdiOSTestResult {
  success: boolean;
  message: string;
  status?: number;
}

/**
 * Test an AdiOS webhook URL from the settings page. The user must be
 * authenticated.
 */
export async function testAdiOSWebhook(
  webhookUrl: string,
): Promise<AdiOSTestResult> {
  try {
    const { data, error } = await supabase.functions.invoke("adios-proxy", {
      body: {
        action: "test",
        webhook_url: webhookUrl,
        payload: {
          external_id: `leazr-test-${Date.now()}`,
          email: "test@leazr.co",
          status: "won",
          value_eur: 0,
          occurred_at: new Date().toISOString(),
          notes: "Test de connexion AdiOS depuis Leazr",
        },
      },
    });

    if (error) {
      console.error("[AdiOS] Edge function error:", error);
      return { success: false, message: error.message || "Erreur de connexion" };
    }
    return {
      success: data?.success === true,
      message: data?.message || data?.error || "Réponse inattendue",
      status: data?.status,
    };
  } catch (err) {
    console.error("[AdiOS] Test error:", err);
    return { success: false, message: "Erreur inattendue lors du test" };
  }
}

export interface AdiOSBackfillResult {
  success: boolean;
  dry_run?: boolean;
  total_candidates: number;
  sent: number;
  skipped_not_meta: number;
  skipped_too_early?: number;
  skipped_already_synced: number;
  errors: number;
  by_status?: { won: number; qualified: number; lost: number; rejected: number };
  total_value_eur?: number;
  error_details: Array<{ offer_id?: string; contract_id?: string; error: string }>;
  details: Array<{
    offer_id: string;
    contract_id?: string;
    platform: string;
    value_eur: number;
    status?: string;
    workflow_status?: string;
  }>;
  error?: string;
}

/**
 * Backfill historical Meta-attributed signed contracts to AdiOS.
 *
 * Idempotent — uses offers.adios_synced_at as the watermark, so re-running
 * this only picks up rows that haven't been pushed yet. Throttled server-side
 * to avoid bombarding AdiOS.
 *
 * Pass dry_run=true to preview without actually sending.
 */
export async function backfillAdiOSHistorical(opts?: {
  dry_run?: boolean;
  max_to_send?: number;
  delay_between_ms?: number;
}): Promise<AdiOSBackfillResult> {
  try {
    const { data, error } = await supabase.functions.invoke("adios-proxy", {
      body: {
        action: "backfill",
        dry_run: opts?.dry_run === true,
        max_to_send: opts?.max_to_send,
        delay_between_ms: opts?.delay_between_ms,
      },
    });

    if (error) {
      console.error("[AdiOS] Backfill edge error:", error);
      return {
        success: false,
        total_candidates: 0,
        sent: 0,
        skipped_not_meta: 0,
        skipped_already_synced: 0,
        errors: 0,
        error_details: [],
        details: [],
        error: error.message || "Erreur du backfill",
      };
    }

    return data as AdiOSBackfillResult;
  } catch (err) {
    console.error("[AdiOS] Backfill threw:", err);
    return {
      success: false,
      total_candidates: 0,
      sent: 0,
      skipped_not_meta: 0,
      skipped_already_synced: 0,
      errors: 0,
      error_details: [],
      details: [],
      error: err instanceof Error ? err.message : "Erreur inattendue",
    };
  }
}

/**
 * Fire the AdiOS conversion webhook from the public contract signing flow.
 *
 * Anonymous-safe: the edge function authenticates via the signature_token,
 * loads the contract / offer / client server-side, detects whether the lead
 * came from Meta, and only sends to AdiOS if it did. Fully best-effort —
 * NEVER awaits / throws into the signing UX.
 */
export async function notifyAdiOSContractSigned(signatureToken: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke("adios-proxy", {
      body: {
        action: "sign_contract",
        signature_token: signatureToken,
      },
    });
    if (error) {
      console.warn("[AdiOS] notifyContractSigned edge error:", error.message);
      return;
    }
    if (data?.success) {
      console.log("[AdiOS] Conversion sent successfully");
    } else if (data?.skipped) {
      // Not Meta-attributed, not configured, or event disabled — nothing to do.
      console.log("[AdiOS] Skipped:", data?.reason || data?.error);
    } else {
      console.warn("[AdiOS] Conversion failed:", data?.error);
    }
  } catch (err) {
    console.warn("[AdiOS] notifyContractSigned threw:", err);
  }
}
