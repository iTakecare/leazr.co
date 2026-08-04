// Livraison de l'offre signée : archivage du PDF + envoi au client et à l'équipe.
//
// Deux actions, appelées à la suite par la page de signature :
//
//   1. `prepare` → renvoie une URL d'upload signée. Le navigateur y dépose le
//      PDF qu'il vient de générer. On passe par une URL signée plutôt que par
//      un envoi du PDF en base64 dans le corps de la requête : un PDF d'offre
//      pèse plusieurs mégaoctets, et le signataire est anonyme — lui ouvrir le
//      bucket en écriture serait un trou béant.
//
//   2. `send` → archive la référence du document, envoie les emails, trace
//      l'activité. `pdf_path` est facultatif : si la génération du PDF a
//      échoué côté navigateur, les emails partent quand même avec le lien vers
//      l'offre en ligne. Une signature doit toujours déclencher une
//      notification, même sans pièce jointe.
//
// Idempotent : `offers.signed_pdf_sent_at` verrouille le second envoi.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getAppUrl } from "../_shared/url-utils.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("LEAZR_RESEND_API") || Deno.env.get("RESEND_API_KEY");
const BUCKET = "offer-documents";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type Lang = "fr" | "nl" | "en" | "de";

const CLIENT_EMAIL: Record<Lang, (v: Vars) => { subject: string; html: string }> = {
  fr: (v) => ({
    subject: `Votre offre ${v.reference} est signée`,
    html: `
      <p>Bonjour ${v.clientName},</p>
      <p>Nous avons bien reçu votre signature pour l'offre <strong>${v.reference}</strong>${
        v.monthly ? ` (${v.monthly} € / mois)` : ""
      }.</p>
      <p>${
        v.hasPdf
          ? "Vous trouverez en pièce jointe votre offre signée, accompagnée du certificat de signature électronique (date, heure et empreinte du document)."
          : `Vous pouvez consulter votre offre signée à tout moment : <a href="${v.publicUrl}">${v.publicUrl}</a>`
      }</p>
      <p>Nous revenons vers vous très rapidement pour la suite.</p>
      <p>L'équipe ${v.companyName}</p>`,
  }),
  nl: (v) => ({
    subject: `Uw offerte ${v.reference} is ondertekend`,
    html: `
      <p>Beste ${v.clientName},</p>
      <p>We hebben uw handtekening voor offerte <strong>${v.reference}</strong> goed ontvangen.</p>
      <p>${
        v.hasPdf
          ? "In bijlage vindt u uw ondertekende offerte met het certificaat van elektronische handtekening."
          : `U kunt uw ondertekende offerte hier raadplegen: <a href="${v.publicUrl}">${v.publicUrl}</a>`
      }</p>
      <p>Het team van ${v.companyName}</p>`,
  }),
  en: (v) => ({
    subject: `Your offer ${v.reference} has been signed`,
    html: `
      <p>Hello ${v.clientName},</p>
      <p>We have received your signature for offer <strong>${v.reference}</strong>.</p>
      <p>${
        v.hasPdf
          ? "Please find your signed offer attached, together with the electronic signature certificate."
          : `You can view your signed offer here: <a href="${v.publicUrl}">${v.publicUrl}</a>`
      }</p>
      <p>The ${v.companyName} team</p>`,
  }),
  de: (v) => ({
    subject: `Ihr Angebot ${v.reference} wurde unterschrieben`,
    html: `
      <p>Guten Tag ${v.clientName},</p>
      <p>Wir haben Ihre Unterschrift für das Angebot <strong>${v.reference}</strong> erhalten.</p>
      <p>${
        v.hasPdf
          ? "Im Anhang finden Sie Ihr unterschriebenes Angebot mit dem Zertifikat der elektronischen Signatur."
          : `Sie können Ihr Angebot hier einsehen: <a href="${v.publicUrl}">${v.publicUrl}</a>`
      }</p>
      <p>Ihr ${v.companyName}-Team</p>`,
  }),
};

interface Vars {
  clientName: string;
  reference: string;
  monthly: string;
  companyName: string;
  publicUrl: string;
  hasPdf: boolean;
}

const sendEmail = async (
  to: string[],
  subject: string,
  html: string,
  from: string,
  attachment?: { filename: string; content: string }
) => {
  if (!RESEND_KEY || to.length === 0) return { ok: false, error: "no_recipient_or_key" };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      ...(attachment ? { attachments: [attachment] } : {}),
    }),
  });
  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const body = await req.json().catch(() => null);
    const action = body?.action as string | undefined;
    const offerId = body?.offer_id as string | undefined;
    if (!offerId) return json({ error: "missing_offer_id" }, 400);

    const { data: offer } = await sb
      .from("offers")
      .select(
        "id, company_id, client_id, client_name, client_email, dossier_number, monthly_payment, user_id, signed_at, signer_name, signed_pdf_path, signed_pdf_sent_at"
      )
      .eq("id", offerId)
      .maybeSingle();

    if (!offer) return json({ error: "offer_not_found" }, 404);
    // On ne livre que ce qui a réellement été signé : sans cette garde, la
    // fonction serait un envoyeur d'emails ouvert à quiconque connaît un id.
    if (!offer.signed_at) return json({ error: "offer_not_signed" }, 409);

    const reference = offer.dossier_number || offerId.slice(0, 8);
    const safeReference = reference.replace(/[^\w.-]/g, "_");
    const path = `${offerId}/signed/Offre_${safeReference}_signee.pdf`;

    // ── 1) URL d'upload signée ────────────────────────────────────────────
    if (action === "prepare") {
      // Un chemin déjà occupé bloque createSignedUploadUrl : on nettoie pour
      // qu'une nouvelle génération remplace la précédente.
      await sb.storage.from(BUCKET).remove([path]).catch(() => null);

      const { data, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
      if (error) {
        console.error("createSignedUploadUrl:", error);
        return json({ error: error.message }, 500);
      }
      return json({ success: true, path, token: data.token, signed_url: data.signedUrl });
    }

    // ── 2) Archivage + envois ─────────────────────────────────────────────
    if (action !== "send") return json({ error: "invalid_action" }, 400);

    if (offer.signed_pdf_sent_at) {
      return json({ success: true, already_sent: true });
    }

    const pdfPath = (body?.pdf_path as string | undefined) ?? null;

    // Branding et destinataires internes
    const { data: company } = await sb
      .from("companies")
      .select("name, contact_email")
      .eq("id", offer.company_id)
      .maybeSingle();

    const { data: smtp } = await sb
      .from("smtp_settings")
      .select("from_email, from_name")
      .eq("company_id", offer.company_id)
      .maybeSingle();

    const companyName = company?.name || "Leazr";
    const fromEmail = smtp?.from_email || "noreply@leazr.co";
    const from = `${smtp?.from_name || companyName} <${fromEmail}>`;
    const appUrl = getAppUrl(req);
    const publicUrl = `${appUrl}/offer/${offerId}/sign`;

    // Langue de communication du client (même règle que le reste des emails)
    let lang: Lang = "fr";
    if (offer.client_id) {
      const { data: client } = await sb
        .from("clients")
        .select("communication_language, email")
        .eq("id", offer.client_id)
        .maybeSingle();
      const value = client?.communication_language;
      if (value && ["fr", "nl", "en", "de"].includes(value)) lang = value as Lang;
    }

    // Pièce jointe : téléchargée depuis le bucket, jamais reçue du navigateur
    let attachment: { filename: string; content: string } | undefined;
    let archivedSize = 0;
    if (pdfPath) {
      const { data: file, error: dlError } = await sb.storage.from(BUCKET).download(pdfPath);
      if (dlError || !file) {
        console.warn("PDF introuvable dans le bucket, envoi sans pièce jointe:", dlError?.message);
      } else {
        const buffer = new Uint8Array(await file.arrayBuffer());
        archivedSize = buffer.byteLength;
        let binary = "";
        for (let i = 0; i < buffer.length; i += 8192) {
          binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
        }
        attachment = {
          filename: `Offre_${safeReference}_signee.pdf`,
          content: btoa(binary),
        };
      }
    }

    const vars: Vars = {
      clientName: offer.signer_name || offer.client_name || "",
      reference,
      monthly: offer.monthly_payment
        ? Number(offer.monthly_payment).toLocaleString("fr-BE", { maximumFractionDigits: 2 })
        : "",
      companyName,
      publicUrl,
      hasPdf: !!attachment,
    };

    // Client
    const clientEmail = offer.client_email;
    const clientTemplate = CLIENT_EMAIL[lang](vars);
    const clientResult = clientEmail
      ? await sendEmail([clientEmail], clientTemplate.subject, clientTemplate.html, from, attachment)
      : { ok: false, error: "no_client_email" };

    // Équipe : le commercial du dossier, à défaut l'email de contact société
    const internalRecipients = new Set<string>();
    if (offer.user_id) {
      const { data: authUser } = await sb.auth.admin.getUserById(offer.user_id);
      if (authUser?.user?.email) internalRecipients.add(authUser.user.email);
    }
    if (company?.contact_email) internalRecipients.add(company.contact_email);

    const internalResult = await sendEmail(
      [...internalRecipients],
      `✍️ Offre signée — ${reference} · ${offer.client_name ?? ""}`,
      `
        <p><strong>${offer.signer_name || offer.client_name}</strong> vient de signer l'offre
        <strong>${reference}</strong>${vars.monthly ? ` (${vars.monthly} € / mois)` : ""}.</p>
        <p>Signature enregistrée le ${new Date(offer.signed_at).toLocaleString("fr-BE", {
          timeZone: "Europe/Brussels",
        })} (heure de Bruxelles).</p>
        <p>${
          attachment
            ? "L'offre signée et son certificat sont en pièce jointe, et archivés dans les documents du dossier."
            : "⚠️ Le PDF signé n'a pas pu être archivé — la signature est bien enregistrée, mais le document est à régénérer depuis le dossier."
        }</p>
        <p><a href="${appUrl}/admin/offers/${offerId}">Ouvrir le dossier</a></p>`,
      from,
      attachment
    );

    // Archivage dans les documents du dossier
    if (pdfPath && archivedSize > 0) {
      await sb.from("offer_documents").insert({
        offer_id: offerId,
        document_type: "signed_offer",
        file_name: `Offre_${safeReference}_signee.pdf`,
        file_path: pdfPath,
        file_size: archivedSize,
        mime_type: "application/pdf",
        uploaded_by: offer.signer_name || "Signature en ligne",
        status: "approved",
      });
    }

    // Trace dans la timeline de l'affaire
    const { data: offerWithOpp } = await sb
      .from("offers")
      .select("opportunity_id")
      .eq("id", offerId)
      .maybeSingle();

    await sb.from("crm_activities").insert({
      company_id: offer.company_id,
      opportunity_id: offerWithOpp?.opportunity_id ?? null,
      client_id: offer.client_id,
      offer_id: offerId,
      type: "document",
      direction: "out",
      channel: "email",
      occurred_at: new Date().toISOString(),
      actor_label: "Signature en ligne",
      subject: `Offre ${reference} signée — document envoyé`,
      body: `Signée par ${offer.signer_name ?? "—"}. ${
        attachment ? "PDF signé archivé et envoyé." : "PDF non archivé."
      }`,
      payload: { pdf_path: pdfPath, client_email_sent: clientResult.ok },
    });

    await sb
      .from("offers")
      .update({ signed_pdf_path: pdfPath, signed_pdf_sent_at: new Date().toISOString() })
      .eq("id", offerId);

    console.log(
      `signed-offer-delivery ${reference}: client=${clientResult.ok} interne=${internalResult.ok} pdf=${!!attachment}`
    );

    return json({
      success: true,
      client_email_sent: clientResult.ok,
      internal_email_sent: internalResult.ok,
      archived: !!attachment,
    });
  } catch (err) {
    console.error("signed-offer-delivery error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
