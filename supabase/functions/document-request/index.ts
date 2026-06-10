// =====================================================================
// document-request — demande de documents MULTI-CANAL (mail / WhatsApp / SMS).
//
// 1. crée un lien d'upload (offer_upload_links, token)
// 2. envoie la demande sur les canaux choisis :
//      - email   → send-document-request (template email existant)
//      - whatsapp/sms → messaging-send (template approuvé 'document_request')
// 3. trace la demande dans document_requests (affichée dans la demande +
//    relance auto si pas de retour).
//
// Auth : JWT utilisateur (transmis aux fonctions appelées).
// =====================================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

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

function docLabel(code: string): string {
  if (code.startsWith("custom:")) return code.slice(7);
  return DOC_LABELS[code] ?? code;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: authErr } = await userSupabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !claims?.user) return jsonResponse({ success: false, error: "unauthorized" }, 401);
    const { data: profile } = await userSupabase.from("profiles").select("company_id").eq("id", claims.user.id).single();
    const companyId: string | null = profile?.company_id ?? null;
    if (!companyId) return jsonResponse({ success: false, error: "no_company" }, 403);

    const body = await req.json().catch(() => null) as {
      offer_id?: string;
      documents?: string[];
      custom_message?: string;
      channels?: Array<"email" | "whatsapp" | "sms">;
    } | null;
    if (!body?.offer_id || !body.documents?.length || !body.channels?.length) {
      return jsonResponse({ success: false, error: "missing_params", message: "offer_id, documents et channels sont requis" }, 400);
    }

    // ---------- offre + client ----------
    const { data: offer } = await admin
      .from("offers").select("id, company_id, client_id, client_name, client_email").eq("id", body.offer_id).maybeSingle();
    if (!offer || offer.company_id !== companyId) return jsonResponse({ success: false, error: "offer_not_found" }, 404);

    let clientEmail = offer.client_email as string | null;
    let clientPhone: string | null = null;
    const clientName = (offer.client_name as string) || "Client";
    if (offer.client_id) {
      const { data: client } = await admin.from("clients").select("email, phone").eq("id", offer.client_id).maybeSingle();
      clientEmail = clientEmail || (client as { email?: string } | null)?.email || null;
      clientPhone = (client as { phone?: string } | null)?.phone ?? null;
    }

    // ---------- lien d'upload ----------
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    await admin.from("offer_upload_links").insert({
      offer_id: body.offer_id,
      token,
      requested_documents: body.documents,
      custom_message: body.custom_message ?? null,
      expires_at: expiresAt,
      created_by: claims.user.id,
    });
    const appUrl = Deno.env.get("APP_URL") || "https://leazr.co";
    const uploadUrl = `${appUrl}/r/${token}`;
    const docsList = body.documents.map(docLabel).join(", ");

    // ---------- envoi par canal ----------
    const channels = [...new Set(body.channels)];
    const results: Record<string, unknown> = {};
    let emailStatus: string | null = null, whatsappStatus: string | null = null, smsStatus: string | null = null;

    const callFn = async (name: string, payload: unknown) => {
      const r = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null);
      return { ok: r.ok, status: r.status, data };
    };

    // EMAIL
    if (channels.includes("email")) {
      if (!clientEmail) { emailStatus = "failed"; results.email = { error: "no_email" }; }
      else {
        const r = await callFn("send-document-request", {
          offerId: body.offer_id, clientEmail, clientName,
          requestedDocs: body.documents, customMessage: body.custom_message, uploadToken: token,
        });
        emailStatus = r.ok && (r.data as { success?: boolean })?.success ? "sent" : "failed";
        results.email = r.data;
      }
    }

    // WHATSAPP / SMS (template approuvé 'document_request' : {1}=nom {2}=docs {3}=lien)
    const sendChannel = async (channel: "whatsapp" | "sms") => {
      if (!offer.client_id) return { status: "failed", data: { error: "no_client" } };
      if (!clientPhone) return { status: "failed", data: { error: "no_phone" } };
      const r = await callFn("messaging-send", {
        action: "send_message", client_id: offer.client_id, channel,
        template_key: "document_request", offer_id: body.offer_id,
        variables: { "1": clientName, "2": docsList, "3": uploadUrl },
      });
      const ok = r.ok && (r.data as { success?: boolean })?.success;
      return { status: ok ? "sent" : "failed", data: r.data };
    };
    if (channels.includes("whatsapp")) { const r = await sendChannel("whatsapp"); whatsappStatus = r.status; results.whatsapp = r.data; }
    if (channels.includes("sms")) { const r = await sendChannel("sms"); smsStatus = r.status; results.sms = r.data; }

    // ---------- trace ----------
    const { data: docReq } = await admin.from("document_requests").insert({
      company_id: companyId,
      offer_id: body.offer_id,
      client_id: offer.client_id,
      upload_token: token,
      upload_url: uploadUrl,
      documents: body.documents,
      custom_message: body.custom_message ?? null,
      channels,
      email_status: emailStatus,
      whatsapp_status: whatsappStatus,
      sms_status: smsStatus,
      results,
      created_by: claims.user.id,
    }).select("id").single();

    const anySuccess = [emailStatus, whatsappStatus, smsStatus].includes("sent");
    return jsonResponse({
      success: anySuccess,
      document_request_id: docReq?.id,
      upload_url: uploadUrl,
      email_status: emailStatus,
      whatsapp_status: whatsappStatus,
      sms_status: smsStatus,
      results,
    }, anySuccess ? 200 : 502);
  } catch (e) {
    console.error("[document-request]", e);
    return jsonResponse({ success: false, error: "internal_error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
