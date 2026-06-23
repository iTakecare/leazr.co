// Lance une campagne d'appels groupés Alex À PARTIR DE DEMANDES (offers) dont
// des documents KYC sont en attente. Admin-only. Pour chaque demande cochée,
// Alex rappelle le client pour redemander SES documents manquants (calculés :
// dernière document_requests non remplie − documents déjà déposés).
// Les appels sont passés UN PAR UN par le cron voice-campaign-dispatch.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import { normalizeBelgianPhone } from "../_shared/elevenlabs.ts";

// Mêmes libellés que document-request / voice-tool-send-document-link.
const DOC_LABELS: Record<string, string> = {
  balance_sheet: "Bilan financier",
  provisional_balance: "Bilan financier provisoire",
  tax_notice: "Avertissement extrait de rôle",
  tax_return: "Liasse fiscale",
  id_card_front: "Carte d'identité (recto)",
  id_card_back: "Carte d'identité (verso)",
  id_card: "Carte d'identité",
  company_register: "Extrait de registre d'entreprise",
  vat_certificate: "Attestation TVA",
  bank_statement: "Relevé bancaire",
  proof_of_address: "Justificatif de domicile",
  company_statutes: "Statuts de l'entreprise",
  custom: "Autre document",
};
const docLabel = (code: string) => DOC_LABELS[code] ?? code;

const requestSchema = z.object({
  offer_ids: z.array(z.string().uuid()).min(1).max(500),
  name: z.string().min(1).max(120),
  language: z.enum(["fr", "nl", "en"]).default("fr"),
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const security = await requireElevatedAccess(req, corsHeaders, {
    rateLimit: { endpoint: "voice-campaign-start", maxRequests: 20, windowSeconds: 86400, identifierPrefix: "voice" },
  });
  if (!security.ok) return security.response;
  const { supabaseAdmin, userId, companyId } = security.context;

  let parsed;
  try {
    parsed = requestSchema.parse(await req.json());
  } catch (e) {
    return jsonErr(400, "Invalid request body", e instanceof z.ZodError ? e.errors : undefined);
  }

  // Demandes sélectionnées.
  const { data: offers, error: offersErr } = await supabaseAdmin
    .from("offers")
    .select("id, client_id, client_name, company_id")
    .in("id", parsed.offer_ids);
  if (offersErr) {
    console.error("[voice-campaign-start] offers lookup error", offersErr);
    return jsonErr(500, "Offers lookup failed");
  }

  // Documents demandés (dernière demande non remplie par offre) + déposés.
  const { data: docReqs } = await supabaseAdmin
    .from("document_requests")
    .select("offer_id, documents, created_at")
    .in("offer_id", parsed.offer_ids)
    .is("fulfilled_at", null)
    .order("created_at", { ascending: false });
  const latestReqByOffer = new Map<string, string[]>();
  for (const r of docReqs ?? []) {
    if (!latestReqByOffer.has(r.offer_id)) latestReqByOffer.set(r.offer_id, (r.documents as string[]) ?? []);
  }

  const { data: uploaded } = await supabaseAdmin
    .from("offer_documents")
    .select("offer_id, document_type, status")
    .in("offer_id", parsed.offer_ids)
    .in("status", ["approved", "pending"]); // déposés (rejected = à redemander)
  const providedByOffer = new Map<string, Set<string>>();
  for (const d of uploaded ?? []) {
    if (!providedByOffer.has(d.offer_id)) providedByOffer.set(d.offer_id, new Set());
    providedByOffer.get(d.offer_id)!.add(d.document_type);
  }

  const missingDocsFor = (offerId: string): string => {
    const requested = latestReqByOffer.get(offerId) ?? [];
    const provided = providedByOffer.get(offerId) ?? new Set<string>();
    const missing = requested.filter((c) => !provided.has(c));
    return missing.length ? missing.map(docLabel).join(", ") : "vos documents administratifs";
  };

  // Clients liés aux demandes.
  const clientIds = [...new Set((offers ?? []).map((o: any) => o.client_id).filter(Boolean))] as string[];
  const { data: clients } = clientIds.length
    ? await supabaseAdmin.from("clients")
        .select("id, first_name, last_name, name, phone, company_id, voice_consent_given_at")
        .in("id", clientIds)
    : { data: [] };
  const clientById = new Map<string, any>((clients ?? []).map((c: any) => [c.id, c]));

  const retained: Array<{ offer_id: string; client_id: string; firstName: string; e164: string; company_id: string; consent: string; missingDocs: string }> = [];
  const skipped: Array<{ offer_id: string; name: string; reason: string }> = [];

  for (const id of parsed.offer_ids) {
    const o = (offers ?? []).find((x: any) => x.id === id);
    const label = o?.client_name || id;
    if (!o) { skipped.push({ offer_id: id, name: id, reason: "demande introuvable" }); continue; }
    if (companyId && o.company_id !== companyId) { skipped.push({ offer_id: id, name: label, reason: "autre société" }); continue; }
    if (!o.client_id) { skipped.push({ offer_id: id, name: label, reason: "aucun client lié" }); continue; }
    const c = clientById.get(o.client_id);
    if (!c) { skipped.push({ offer_id: id, name: label, reason: "client introuvable" }); continue; }
    if (!c.voice_consent_given_at) { skipped.push({ offer_id: id, name: label, reason: "pas de consentement appels IA (RGPD)" }); continue; }
    const e164 = normalizeBelgianPhone(c.phone);
    if (!e164) { skipped.push({ offer_id: id, name: label, reason: "numéro invalide" }); continue; }
    retained.push({
      offer_id: id,
      client_id: o.client_id,
      firstName: c.first_name || (c.name?.split(" ")[0] ?? ""),
      e164,
      company_id: o.company_id,
      consent: c.voice_consent_given_at,
      missingDocs: missingDocsFor(id),
    });
  }

  if (retained.length === 0) {
    return jsonErr(422, "Aucune demande appelable (consentement / numéro / client manquant)", { skipped });
  }

  const campaignCompany = companyId ?? retained[0].company_id;
  if (retained.some((r) => r.company_id !== campaignCompany)) {
    return jsonErr(400, "Les demandes sélectionnées appartiennent à plusieurs sociétés");
  }

  let reportEmail: string | null = null;
  if (userId) {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    reportEmail = u?.user?.email ?? null;
  }

  const { data: campaign, error: campErr } = await supabaseAdmin
    .from("voice_campaigns")
    .insert({
      company_id: campaignCompany,
      name: parsed.name,
      objective: "Relance documents KYC",
      language: parsed.language,
      status: "running",
      created_by: userId,
      report_email: reportEmail,
      total_calls: retained.length,
    })
    .select("id")
    .single();
  if (campErr || !campaign) {
    console.error("[voice-campaign-start] campaign insert failed", campErr);
    return jsonErr(500, "Failed to create campaign");
  }

  const rows = retained.map((r) => ({
    client_id: r.client_id,
    company_id: r.company_id,
    offer_id: r.offer_id,
    campaign_id: campaign.id,
    provider: "elevenlabs",
    status: "queued",
    direction: "outbound",
    initiated_by: userId,
    to_phone: r.e164,
    language: parsed.language,
    consent_snapshot_at: r.consent,
    metadata: { missing_docs: r.missingDocs, first_name: r.firstName },
  }));

  const { error: callsErr } = await supabaseAdmin.from("voice_calls").insert(rows);
  if (callsErr) {
    console.error("[voice-campaign-start] calls insert failed", callsErr);
    await supabaseAdmin.from("voice_campaigns").update({ status: "canceled" }).eq("id", campaign.id);
    return jsonErr(500, "Failed to queue calls");
  }

  return new Response(
    JSON.stringify({ ok: true, campaign_id: campaign.id, queued: retained.length, skipped }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

function jsonErr(status: number, message: string, details?: unknown) {
  return new Response(
    JSON.stringify({ error: message, ...(details ? { details } : {}) }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
