// Lance une campagne d'appels groupés Alex (ElevenLabs). Admin-only.
// Crée une voice_campaigns + une voice_calls 'queued' par client retenu.
// Les appels sont ensuite passés UN PAR UN par le cron voice-campaign-dispatch
// (gate de concurrence : un seul appel Alex à la fois sur le numéro partagé).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireElevatedAccess } from "../_shared/security.ts";
import { normalizeBelgianPhone } from "../_shared/elevenlabs.ts";

const requestSchema = z.object({
  client_ids: z.array(z.string().uuid()).min(1).max(500),
  name: z.string().min(1).max(120),
  objective: z.string().max(500).optional(),
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

  // Charge les clients sélectionnés.
  const { data: clients, error: clientsErr } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, name, phone, company_id, voice_consent_given_at")
    .in("id", parsed.client_ids);

  if (clientsErr) {
    console.error("[voice-campaign-start] clients lookup error", clientsErr);
    return jsonErr(500, "Clients lookup failed");
  }

  const retained: Array<{ id: string; firstName: string; e164: string; company_id: string; consent: string }> = [];
  const skipped: Array<{ id: string; name: string; reason: string }> = [];

  for (const id of parsed.client_ids) {
    const c = (clients ?? []).find((x: any) => x.id === id);
    const label = c ? (c.name || `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || id) : id;
    if (!c) { skipped.push({ id, name: id, reason: "introuvable" }); continue; }
    if (companyId && c.company_id !== companyId) {
      skipped.push({ id, name: label, reason: "autre société" }); continue;
    }
    if (!c.voice_consent_given_at) {
      skipped.push({ id, name: label, reason: "pas de consentement appels IA (RGPD)" }); continue;
    }
    const e164 = normalizeBelgianPhone(c.phone);
    if (!e164) { skipped.push({ id, name: label, reason: "numéro invalide" }); continue; }
    retained.push({
      id: c.id,
      firstName: c.first_name || (c.name?.split(" ")[0] ?? ""),
      e164,
      company_id: c.company_id,
      consent: c.voice_consent_given_at,
    });
  }

  if (retained.length === 0) {
    return jsonErr(422, "Aucun client appelable (consentement / numéro manquant)", { skipped });
  }

  // Tous les clients retenus doivent partager une même société (campagne mono-tenant).
  const campaignCompany = companyId ?? retained[0].company_id;
  if (retained.some((r) => r.company_id !== campaignCompany)) {
    return jsonErr(400, "Les clients sélectionnés appartiennent à plusieurs sociétés");
  }

  // Email destinataire du rapport (figé au lancement).
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
      objective: parsed.objective ?? null,
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
    client_id: r.id,
    company_id: r.company_id,
    campaign_id: campaign.id,
    provider: "elevenlabs",
    status: "queued",
    direction: "outbound",
    initiated_by: userId,
    to_phone: r.e164,
    language: parsed.language,
    consent_snapshot_at: r.consent,
    metadata: { missing_docs: parsed.objective || "", first_name: r.firstName },
  }));

  const { error: callsErr } = await supabaseAdmin.from("voice_calls").insert(rows);
  if (callsErr) {
    console.error("[voice-campaign-start] calls insert failed", callsErr);
    // Annule la campagne pour éviter une coquille vide.
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
