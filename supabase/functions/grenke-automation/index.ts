// Grenke deal-lifecycle automation — Stage A: ID-card collection on score A.
//
// Cron-driven (X-Cron-Secret). For each Grenke offer that has reached internal
// score A, hasn't been submitted yet, and hasn't had ID collection handled:
//   - existing client (has an active contract) with a validated ID on file
//     → mark id_collection_status='valid' (nothing to ask).
//   - otherwise → create a secure upload link + send the ID-card request email
//     (reusing send-document-request via its cron bypass) → 'requested'.
//
// Opt-in per company via grenke_automation_settings.auto_id_collection.
// Every action is written to offer_automation_log + an admin_notification.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const GRENKE_LEASER_UUID = "d60b86d7-a129-4a17-a877-e8e5caa66949";
const ACTIVE_CONTRACT_STATUSES = ["contract_sent", "contract_signed", "equipment_ordered", "delivered", "active", "extended"];
const ID_DOC_TYPES = ["id_card", "id_card_front", "id_card_back"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("GRENKE_CRON_SECRET");
  if (!cronSecret || req.headers.get("X-Cron-Secret") !== cronSecret) {
    return json({ success: false, error: "unauthorized_cron" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Companies that opted into ID-collection automation.
  const { data: settings } = await admin
    .from("grenke_automation_settings")
    .select("company_id")
    .eq("auto_id_collection", true);
  const enabledCompanies = new Set((settings ?? []).map((s: { company_id: string }) => s.company_id));
  if (enabledCompanies.size === 0) {
    return json({ success: true, message: "no company has auto_id_collection enabled", handled: 0 });
  }

  // Candidate offers: Grenke leaser, internal score A, not submitted, ID not handled.
  const { data: offers, error } = await admin
    .from("offers")
    .select("id, company_id, client_id, client_name, internal_score, grenke_financing_id, id_collection_status")
    .eq("leaser_id", GRENKE_LEASER_UUID)
    .eq("internal_score", "A")
    .is("grenke_financing_id", null)
    .is("id_collection_status", null)
    .limit(100);
  if (error) return json({ success: false, error: "offer_lookup_failed", message: error.message }, 500);

  const candidates = (offers ?? []).filter((o: { company_id: string }) => enabledCompanies.has(o.company_id));

  let requested = 0, valid = 0, skipped = 0, errors = 0;

  for (const offer of candidates as Array<{ id: string; company_id: string; client_id: string; client_name: string }>) {
    try {
      // Load client signer info.
      const { data: client } = await admin
        .from("clients")
        .select("id, first_name, last_name, name, email")
        .eq("id", offer.client_id)
        .maybeSingle();
      const c = client as { first_name?: string; last_name?: string; name?: string; email?: string } | null;
      if (!c?.email) { skipped++; continue; }
      const clientName = c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Client";

      // Existing client? (has an active contract)
      const { data: activeContracts } = await admin
        .from("contracts")
        .select("id")
        .eq("client_id", offer.client_id)
        .in("status", ACTIVE_CONTRACT_STATUSES)
        .limit(1);
      const isExisting = (activeContracts ?? []).length > 0;

      // Does the client already have a validated ID document on any offer?
      let hasValidId = false;
      if (isExisting) {
        const { data: clientOffers } = await admin.from("offers").select("id").eq("client_id", offer.client_id);
        const offerIds = (clientOffers ?? []).map((o: { id: string }) => o.id);
        if (offerIds.length > 0) {
          const { data: idDocs } = await admin
            .from("offer_documents")
            .select("id")
            .in("offer_id", offerIds)
            .in("document_type", ID_DOC_TYPES)
            .eq("status", "approved")
            .limit(1);
          hasValidId = (idDocs ?? []).length > 0;
        }
      }

      if (isExisting && hasValidId) {
        // TODO A.2: AI-check the ID expiry date; for now an approved ID = valid.
        await admin.from("offers").update({ id_collection_status: "valid" }).eq("id", offer.id);
        await admin.from("offer_automation_log").insert({
          company_id: offer.company_id, offer_id: offer.id, stage: "id_collection",
          action: "skipped_valid_id", detail: { reason: "existing client with approved ID on file" },
        });
        valid++;
        continue;
      }

      // Need to request the ID card. Create a secure upload link.
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const requestedDocs = ["id_card_front", "id_card_back"];
      const customMessage = isExisting
        ? "Votre carte d'identité enregistrée chez nous est arrivée à échéance. Merci de nous transmettre une copie de votre carte d'identité en cours de validité."
        : undefined;

      const { error: linkErr } = await admin.from("offer_upload_links").insert({
        offer_id: offer.id, token, requested_documents: requestedDocs,
        custom_message: customMessage ?? null, expires_at: expiresAt, created_by: null,
      });
      if (linkErr) { errors++; continue; }

      // Send the email via send-document-request (cron bypass).
      const resp = await fetch(`${supabaseUrl}/functions/v1/send-document-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Cron-Secret": cronSecret },
        body: JSON.stringify({
          offerId: offer.id, clientEmail: c.email, clientName,
          requestedDocs, uploadToken: token,
          customMessage, templateType: "document_request",
        }),
      });
      const ok = resp.ok;

      await admin.from("offers").update({ id_collection_status: "requested" }).eq("id", offer.id);
      await admin.from("offer_automation_log").insert({
        company_id: offer.company_id, offer_id: offer.id, stage: "id_collection",
        action: ok ? "id_request_sent" : "id_request_email_failed",
        detail: { existing_client: isExisting, email_status: resp.status },
      });
      await admin.from("admin_notifications").insert({
        company_id: offer.company_id, offer_id: offer.id, type: "automation",
        title: isExisting ? "CI demandée (carte expirée)" : "Carte d'identité demandée",
        message: `Demande de carte d'identité envoyée automatiquement à ${clientName}.`,
        metadata: { stage: "id_collection", existing_client: isExisting },
      });
      requested++;
    } catch (e) {
      console.error("[grenke-automation] error on offer", offer.id, e instanceof Error ? e.message : String(e));
      errors++;
    }
  }

  return json({ success: true, candidates: candidates.length, requested, valid, skipped, errors, at: new Date().toISOString() });
});
