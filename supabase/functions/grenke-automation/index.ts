// Grenke deal-lifecycle automation orchestrator (cron-driven, X-Cron-Secret).
//
// Runs the downstream pipeline so that, once a client is OK on iTakecare's side
// (internal score A), everything moves forward on its own. Each stage is opt-in
// per company via grenke_automation_settings (all default OFF):
//
//   Stage A — auto_id_collection : ask the client for their ID card.
//   Stage B — auto_submit        : submit the score-A offer to Grenke (== the
//                                  "introduit leaser" workflow step), no click.
//   Stage C — auto_esignature    : when Grenke is ReadyToSign, start the
//                                  DocuSign e-signature (client + supplier +
//                                  delivery confirmation) automatically.
//
// Stages B and C touch real Grenke submissions / real DocuSign envelopes, so the
// per-company toggle IS the human consent. Every action is written to
// offer_automation_log + an admin_notification so the team keeps full visibility.
//
// Stage D (Grenke Contracted → create the Leazr contract) intentionally stays a
// one-click action in the UI ("Finaliser → créer le contrat"): contract creation
// is non-trivial and we deliberately keep a human in that loop.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const GRENKE_LEASER_UUID = "d60b86d7-a129-4a17-a877-e8e5caa66949";
const ACTIVE_CONTRACT_STATUSES = ["contract_sent", "contract_signed", "equipment_ordered", "delivered", "active", "extended"];
const ID_DOC_TYPES = ["id_card", "id_card_front", "id_card_back"];

type Admin = ReturnType<typeof createClient>;

interface Signer {
  title?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
}

interface AutomationSettings {
  company_id: string;
  auto_id_collection: boolean;
  auto_submit: boolean;
  auto_esignature: boolean;
  esign_partner_title: string | null;
  esign_partner_first_name: string | null;
  esign_partner_last_name: string | null;
  esign_partner_email: string | null;
  esign_partner_mobile: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// Call grenke-api server-to-server for a single offer (cron-authenticated).
async function callGrenkeApi(
  supabaseUrl: string,
  cronSecret: string,
  payload: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> | null }> {
  const resp = await fetch(`${supabaseUrl}/functions/v1/grenke-api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Cron-Secret": cronSecret },
    body: JSON.stringify({ cron: true, environment: "production", ...payload }),
  });
  let body: Record<string, unknown> | null = null;
  try { body = await resp.json() as Record<string, unknown>; } catch { /* keep null */ }
  return { status: resp.status, body };
}

async function logAndNotify(
  admin: Admin,
  args: {
    companyId: string; offerId: string; stage: string; action: string;
    detail?: Record<string, unknown>; notify?: { title: string; message: string };
  },
): Promise<void> {
  try {
    await admin.from("offer_automation_log").insert({
      company_id: args.companyId, offer_id: args.offerId, stage: args.stage,
      action: args.action, detail: args.detail ?? {},
    });
  } catch (e) { console.warn("[grenke-automation] log insert failed:", e instanceof Error ? e.message : String(e)); }
  if (args.notify) {
    try {
      await admin.from("admin_notifications").insert({
        company_id: args.companyId, offer_id: args.offerId, type: "automation",
        title: args.notify.title, message: args.notify.message,
        metadata: { stage: args.stage, action: args.action },
      });
    } catch (e) { console.warn("[grenke-automation] notification insert failed:", e instanceof Error ? e.message : String(e)); }
  }
}

// =====================================================================
// Stage A — ID-card collection on score A.
// =====================================================================
async function runStageA(
  admin: Admin, supabaseUrl: string, cronSecret: string, companies: Set<string>,
): Promise<{ requested: number; valid: number; skipped: number; errors: number }> {
  let requested = 0, valid = 0, skipped = 0, errors = 0;
  if (companies.size === 0) return { requested, valid, skipped, errors };

  const { data: offers } = await admin
    .from("offers")
    .select("id, company_id, client_id, client_name, internal_score, grenke_financing_id, id_collection_status")
    .eq("leaser_id", GRENKE_LEASER_UUID)
    .eq("internal_score", "A")
    .is("grenke_financing_id", null)
    .is("id_collection_status", null)
    .in("company_id", [...companies])
    .limit(100);

  for (const offer of (offers ?? []) as Array<{ id: string; company_id: string; client_id: string; client_name: string }>) {
    try {
      const { data: client } = await admin
        .from("clients").select("id, first_name, last_name, name, email").eq("id", offer.client_id).maybeSingle();
      const c = client as { first_name?: string; last_name?: string; name?: string; email?: string } | null;
      if (!c?.email) { skipped++; continue; }
      const clientName = c.name || [c.first_name, c.last_name].filter(Boolean).join(" ") || "Client";

      const { data: activeContracts } = await admin
        .from("contracts").select("id").eq("client_id", offer.client_id).in("status", ACTIVE_CONTRACT_STATUSES).limit(1);
      const isExisting = (activeContracts ?? []).length > 0;

      let hasValidId = false;
      if (isExisting) {
        const { data: clientOffers } = await admin.from("offers").select("id").eq("client_id", offer.client_id);
        const offerIds = (clientOffers ?? []).map((o: { id: string }) => o.id);
        if (offerIds.length > 0) {
          const { data: idDocs } = await admin
            .from("offer_documents").select("id").in("offer_id", offerIds).in("document_type", ID_DOC_TYPES).eq("status", "approved").limit(1);
          hasValidId = (idDocs ?? []).length > 0;
        }
      }

      if (isExisting && hasValidId) {
        await admin.from("offers").update({ id_collection_status: "valid" }).eq("id", offer.id);
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "id_collection",
          action: "skipped_valid_id", detail: { reason: "existing client with approved ID on file" },
        });
        valid++;
        continue;
      }

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

      const resp = await fetch(`${supabaseUrl}/functions/v1/send-document-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Cron-Secret": cronSecret },
        body: JSON.stringify({
          offerId: offer.id, clientEmail: c.email, clientName,
          requestedDocs, uploadToken: token, customMessage, templateType: "document_request",
        }),
      });
      const ok = resp.ok;

      await admin.from("offers").update({ id_collection_status: "requested" }).eq("id", offer.id);
      await logAndNotify(admin, {
        companyId: offer.company_id, offerId: offer.id, stage: "id_collection",
        action: ok ? "id_request_sent" : "id_request_email_failed",
        detail: { existing_client: isExisting, email_status: resp.status },
        notify: {
          title: isExisting ? "CI demandée (carte expirée)" : "Carte d'identité demandée",
          message: `Demande de carte d'identité envoyée automatiquement à ${clientName}.`,
        },
      });
      requested++;
    } catch (e) {
      console.error("[grenke-automation][A] error on offer", offer.id, e instanceof Error ? e.message : String(e));
      errors++;
    }
  }
  return { requested, valid, skipped, errors };
}

// =====================================================================
// Stage B — auto-submit a score-A Grenke offer to Grenke.
// =====================================================================
async function runStageB(
  admin: Admin, supabaseUrl: string, cronSecret: string, companies: Set<string>,
): Promise<{ submitted: number; blocked: number; errors: number }> {
  let submitted = 0, blocked = 0, errors = 0;
  if (companies.size === 0) return { submitted, blocked, errors };

  const { data: offers } = await admin
    .from("offers")
    .select("id, company_id, client_name, workflow_status")
    .eq("leaser_id", GRENKE_LEASER_UUID)
    .eq("internal_score", "A")
    .is("grenke_financing_id", null)
    .in("company_id", [...companies])
    .limit(50);

  for (const offer of (offers ?? []) as Array<{ id: string; company_id: string; client_name: string }>) {
    try {
      const { status, body } = await callGrenkeApi(supabaseUrl, cronSecret, { action: "submit_offer", offer_id: offer.id });

      if (body?.success) {
        // Submitting to Grenke IS introducing the dossier to the leaser.
        await admin.from("offers").update({ workflow_status: "leaser_introduced" }).eq("id", offer.id);
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "submit", action: "submitted",
          detail: { grenke_financing_id: body.grenke_financing_id ?? null, grenke_state: body.grenke_state ?? null },
          notify: { title: "Dossier soumis à Grenke ✅", message: `Le dossier de ${offer.client_name ?? "ce client"} a été soumis automatiquement à Grenke.` },
        });
        submitted++;
      } else if (status === 422 && body?.error === "payload_has_warnings") {
        // Mapping / data issue — a human must fix it. Log quietly, retry next tick.
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "submit", action: "blocked_warnings",
          detail: { warnings: body.warnings ?? [] },
        });
        blocked++;
      } else if (status === 409 && body?.error === "already_submitted") {
        // Raced with a manual submit — nothing to do.
        blocked++;
      } else {
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "submit", action: "failed",
          detail: { status, error: body?.error ?? null, message: body?.message ?? null, grenke_response: body?.grenke_response ?? null },
          notify: { title: "Soumission Grenke échouée ⚠️", message: `La soumission automatique du dossier de ${offer.client_name ?? "ce client"} a échoué. Vérifiez le dossier.` },
        });
        errors++;
      }
    } catch (e) {
      console.error("[grenke-automation][B] error on offer", offer.id, e instanceof Error ? e.message : String(e));
      errors++;
    }
  }
  return { submitted, blocked, errors };
}

// Resolve the iTakecare (supplier) signer for the automatic e-signature:
// configured esign_partner_* if present, else a company admin profile.
async function resolvePartnerSigner(admin: Admin, settings: AutomationSettings): Promise<Signer | null> {
  if (settings.esign_partner_email && settings.esign_partner_first_name && settings.esign_partner_last_name) {
    return {
      title: settings.esign_partner_title ?? "Mr",
      first_name: settings.esign_partner_first_name,
      last_name: settings.esign_partner_last_name,
      email: settings.esign_partner_email,
      mobile: settings.esign_partner_mobile ?? "",
    };
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("company_id", settings.company_id)
    .in("role", ["admin", "super_admin"])
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();
  const p = profile as { first_name?: string; last_name?: string; email?: string } | null;
  if (!p?.email) return null;
  return { title: "Mr", first_name: p.first_name ?? "", last_name: p.last_name ?? "", email: p.email, mobile: "" };
}

// =====================================================================
// Stage C — auto-start the DocuSign e-signature when Grenke is ReadyToSign.
// =====================================================================
async function runStageC(
  admin: Admin, supabaseUrl: string, cronSecret: string, settingsByCompany: Map<string, AutomationSettings>,
): Promise<{ started: number; blocked: number; errors: number }> {
  let started = 0, blocked = 0, errors = 0;
  const companies = [...settingsByCompany.values()].filter((s) => s.auto_esignature).map((s) => s.company_id);
  if (companies.length === 0) return { started, blocked, errors };

  const { data: offers } = await admin
    .from("offers")
    .select("id, company_id, client_id, client_name")
    .eq("leaser_id", GRENKE_LEASER_UUID)
    .eq("grenke_state", "ReadyToSign")
    .not("grenke_financing_id", "is", null)
    .is("grenke_esign_started_at", null)
    .in("company_id", companies)
    .limit(50);

  for (const offer of (offers ?? []) as Array<{ id: string; company_id: string; client_id: string; client_name: string }>) {
    try {
      const settings = settingsByCompany.get(offer.company_id)!;

      const { data: client } = await admin
        .from("clients").select("first_name, last_name, name, email, phone").eq("id", offer.client_id).maybeSingle();
      const c = client as { first_name?: string; last_name?: string; name?: string; email?: string; phone?: string } | null;
      if (!c?.email) {
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "esignature", action: "skipped_no_client_email",
          detail: {}, notify: { title: "E-signature en attente", message: `Impossible de lancer la signature : le client de ${offer.client_name ?? "ce dossier"} n'a pas d'email.` },
        });
        blocked++; continue;
      }
      const customer: Signer = {
        title: "Mr",
        first_name: c.first_name || (c.name?.split(" ")[0] ?? ""),
        last_name: c.last_name || (c.name?.split(" ").slice(1).join(" ") ?? ""),
        email: c.email, mobile: c.phone ?? "",
      };

      const partner = await resolvePartnerSigner(admin, settings);
      if (!partner) {
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "esignature", action: "skipped_no_partner_signer",
          detail: {}, notify: { title: "E-signature en attente", message: "Aucun signataire fournisseur (iTakecare) configuré. Renseignez-le dans les réglages Grenke." },
        });
        blocked++; continue;
      }

      const { status, body } = await callGrenkeApi(supabaseUrl, cronSecret, {
        action: "start_esignature", offer_id: offer.id,
        payload: { customer, partner, use_delivery_confirmation: true },
      });

      if (body?.success) {
        await admin.from("offers").update({ grenke_esign_started_at: new Date().toISOString() }).eq("id", offer.id);
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "esignature", action: "esign_started",
          detail: { signer: customer.email },
          notify: { title: "Signature DocuSign envoyée ✍️", message: `Le contrat de ${offer.client_name ?? "ce client"} a été envoyé automatiquement pour signature DocuSign.` },
        });
        started++;
      } else if (status === 422 && body?.error === "documents_pending") {
        // Wait for documents to be validated — do NOT mark started; retry next tick.
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "esignature", action: "blocked_documents_pending",
          detail: { documents_pending: body.documents_pending ?? [] },
        });
        blocked++;
      } else {
        await logAndNotify(admin, {
          companyId: offer.company_id, offerId: offer.id, stage: "esignature", action: "failed",
          detail: { status, error: body?.error ?? null, message: body?.message ?? null, grenke_response: body?.grenke_response ?? null },
          notify: { title: "E-signature échouée ⚠️", message: `Le lancement automatique de la signature pour ${offer.client_name ?? "ce client"} a échoué.` },
        });
        errors++;
      }
    } catch (e) {
      console.error("[grenke-automation][C] error on offer", offer.id, e instanceof Error ? e.message : String(e));
      errors++;
    }
  }
  return { started, blocked, errors };
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

  // Load every company's automation settings once.
  const { data: settingsRows } = await admin
    .from("grenke_automation_settings")
    .select("company_id, auto_id_collection, auto_submit, auto_esignature, esign_partner_title, esign_partner_first_name, esign_partner_last_name, esign_partner_email, esign_partner_mobile");
  const settings = (settingsRows ?? []) as AutomationSettings[];

  const settingsByCompany = new Map<string, AutomationSettings>(settings.map((s) => [s.company_id, s]));
  const idCompanies = new Set(settings.filter((s) => s.auto_id_collection).map((s) => s.company_id));
  const submitCompanies = new Set(settings.filter((s) => s.auto_submit).map((s) => s.company_id));

  const a = await runStageA(admin, supabaseUrl, cronSecret, idCompanies);
  const b = await runStageB(admin, supabaseUrl, cronSecret, submitCompanies);
  const c = await runStageC(admin, supabaseUrl, cronSecret, settingsByCompany);

  return json({
    success: true,
    stage_a: a,
    stage_b: b,
    stage_c: c,
    at: new Date().toISOString(),
  });
});
