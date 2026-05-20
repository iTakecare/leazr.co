import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

const RESEND_API_KEY = Deno.env.get("ITAKECARE_RESEND_API");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  offerId: string;
  providerId: string;
  // Optional: only notify about a subset of services (by offer_external_services.id)
  serviceIds?: string[];
  // Optional admin note appended to the email body
  note?: string;
}

const billingLabels: Record<string, string> = {
  monthly: "/mois",
  yearly: "/an",
  one_time: "unique",
};

const esc = (s: string | null | undefined) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["admin", "super_admin", "broker"],
      rateLimit: {
        endpoint: "send-external-provider-notification",
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: "send-external-provider-notification",
      },
    });
    if (!access.ok) return access.response;

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const { offerId, providerId, serviceIds, note }: NotifyRequest = await req.json();
    if (!offerId || !providerId) {
      return new Response(
        JSON.stringify({ error: "offerId and providerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = access.context.supabaseAdmin;

    // Fetch offer + client + company
    const { data: offer, error: offerErr } = await supabase
      .from("offers")
      .select(`
        id, company_id, client_name, client_email, equipment_description,
        clients ( name, email, phone, company, billing_address, billing_city, billing_postal_code, billing_country ),
        companies ( name )
      `)
      .eq("id", offerId)
      .single();

    if (offerErr || !offer) {
      return new Response(JSON.stringify({ error: "Offer not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tenant isolation check
    if (
      !access.context.isServiceRole &&
      access.context.role !== "super_admin" &&
      access.context.companyId !== offer.company_id
    ) {
      return new Response(JSON.stringify({ error: "Cross-company notification is forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch provider with contact info
    const { data: provider, error: provErr } = await supabase
      .from("external_providers")
      .select("id, name, contact_email, contact_phone, website_url")
      .eq("id", providerId)
      .eq("company_id", offer.company_id)
      .single();

    if (provErr || !provider) {
      return new Response(JSON.stringify({ error: "Provider not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!provider.contact_email) {
      return new Response(
        JSON.stringify({
          error:
            "Ce prestataire n'a pas d'email de contact configuré. Renseignez-le dans Gestion du catalogue → Prestataires externes.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch requested services for this offer (optionally filtered by serviceIds and by provider_name)
    let svcQuery = supabase
      .from("offer_external_services")
      .select("id, provider_name, product_name, description, price_htva, billing_period, quantity")
      .eq("offer_id", offerId)
      .eq("provider_name", provider.name);
    if (serviceIds && serviceIds.length > 0) {
      svcQuery = svcQuery.in("id", serviceIds);
    }
    const { data: services, error: svcErr } = await svcQuery;
    if (svcErr) throw svcErr;
    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun service de ce prestataire trouvé sur cette demande" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build client info
    const clientName = offer.clients?.name || offer.client_name || "—";
    const clientEmail = offer.clients?.email || offer.client_email || "";
    const clientPhone = offer.clients?.phone || "";
    const clientCompany = offer.clients?.company || "";
    const addressParts = [
      offer.clients?.billing_address,
      offer.clients?.billing_postal_code && offer.clients?.billing_city
        ? `${offer.clients.billing_postal_code} ${offer.clients.billing_city}`
        : offer.clients?.billing_city || offer.clients?.billing_postal_code,
      offer.clients?.billing_country,
    ].filter(Boolean);
    const clientAddress = addressParts.length ? addressParts.join(", ") : "";

    const companyName = offer.companies?.name || "iTakecare";

    // Build services HTML rows
    const servicesRowsHtml = services
      .map(
        (s: any) => `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">
            <strong>${esc(s.product_name)}</strong>${s.description ? `<br><span style="color:#6b7280;font-size:13px;">${esc(s.description)}</span>` : ""}
          </td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${s.quantity || 1}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">
            ${Number(s.price_htva || 0).toFixed(2)} € HTVA <span style="color:#6b7280;">${esc(billingLabels[s.billing_period] || s.billing_period)}</span>
          </td>
        </tr>
      `
      )
      .join("");

    const servicesTextLines = services
      .map(
        (s: any) =>
          `  - ${s.product_name} (x${s.quantity || 1}) — ${Number(s.price_htva || 0).toFixed(2)} € HTVA ${billingLabels[s.billing_period] || s.billing_period}`
      )
      .join("\n");

    const subject = `Nouvelle demande client via ${companyName} — ${clientName}`;

    const noteBlock = note
      ? `<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px 14px;margin:16px 0;border-radius:4px;"><strong style="color:#92400e;">Note de ${esc(companyName)} :</strong><br>${esc(note).replace(/\n/g, "<br>")}</div>`
      : "";

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(subject)}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:640px;margin:0 auto;padding:24px;background:#f9fafb;">
  <div style="background:linear-gradient(135deg,#3b82f6 0%,#6366f1 100%);color:white;padding:24px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;font-size:22px;">Nouvelle demande client</h1>
    <p style="margin:6px 0 0 0;font-size:14px;opacity:0.9;">via ${esc(companyName)}</p>
  </div>
  <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
    <p>Bonjour <strong>${esc(provider.name)}</strong>,</p>
    <p>Un client de <strong>${esc(companyName)}</strong> a sélectionné un ou plusieurs de vos services
       dans une demande en cours. Voici ses coordonnées pour que vous puissiez le recontacter directement
       et finaliser la transaction.</p>

    ${noteBlock}

    <h2 style="font-size:16px;margin-top:24px;margin-bottom:8px;color:#111827;">Coordonnées du client</h2>
    <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;overflow:hidden;">
      <tr><td style="padding:8px 12px;color:#6b7280;width:35%;">Nom</td><td style="padding:8px 12px;"><strong>${esc(clientName)}</strong></td></tr>
      ${clientCompany ? `<tr><td style="padding:8px 12px;color:#6b7280;">Société</td><td style="padding:8px 12px;">${esc(clientCompany)}</td></tr>` : ""}
      ${clientEmail ? `<tr><td style="padding:8px 12px;color:#6b7280;">Email</td><td style="padding:8px 12px;"><a href="mailto:${esc(clientEmail)}">${esc(clientEmail)}</a></td></tr>` : ""}
      ${clientPhone ? `<tr><td style="padding:8px 12px;color:#6b7280;">Téléphone</td><td style="padding:8px 12px;"><a href="tel:${esc(clientPhone)}">${esc(clientPhone)}</a></td></tr>` : ""}
      ${clientAddress ? `<tr><td style="padding:8px 12px;color:#6b7280;">Adresse</td><td style="padding:8px 12px;">${esc(clientAddress)}</td></tr>` : ""}
    </table>

    <h2 style="font-size:16px;margin-top:24px;margin-bottom:8px;color:#111827;">Services demandés</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;">
      <thead><tr style="background:#f3f4f6;">
        <th style="text-align:left;padding:10px;font-size:13px;color:#374151;">Service</th>
        <th style="text-align:center;padding:10px;font-size:13px;color:#374151;">Qté</th>
        <th style="text-align:right;padding:10px;font-size:13px;color:#374151;">Prix</th>
      </tr></thead>
      <tbody>${servicesRowsHtml}</tbody>
    </table>

    <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:12px 14px;margin:20px 0;border-radius:4px;font-size:13px;color:#1e40af;">
      <strong>À noter :</strong> ${esc(companyName)} ne facture pas ces services. Le contrat et la facturation
      sont entièrement gérés par vous, en direct avec le client.
    </div>

    <p style="color:#6b7280;font-size:13px;margin-top:24px;">Cet email vous est envoyé automatiquement depuis l'espace
       administration de ${esc(companyName)}.</p>
  </div>
</body></html>`;

    const textContent = `Nouvelle demande client via ${companyName}

Bonjour ${provider.name},

Un client a sélectionné un ou plusieurs de vos services dans une demande de leasing.
Voici ses coordonnées pour le recontacter directement.

Coordonnées du client :
- Nom : ${clientName}
${clientCompany ? `- Société : ${clientCompany}\n` : ""}${clientEmail ? `- Email : ${clientEmail}\n` : ""}${clientPhone ? `- Téléphone : ${clientPhone}\n` : ""}${clientAddress ? `- Adresse : ${clientAddress}\n` : ""}
Services demandés :
${servicesTextLines}

${note ? `\nNote de ${companyName} :\n${note}\n` : ""}
${companyName} ne facture pas ces services — le contrat et la facturation sont gérés par vous, en direct avec le client.
`;

    // Send email via Resend
    const replyTo = `noreply@itakecare.be`;
    const emailPayload = {
      from: `${companyName} <noreply@itakecare.be>`,
      to: [provider.contact_email],
      reply_to: clientEmail || replyTo,
      subject,
      html: htmlContent,
      text: textContent,
    };

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("[PROVIDER-NOTIF] Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();
    console.log("[PROVIDER-NOTIF] Email sent:", result?.id);

    // Log notification in DB so the UI can show "Notifié le …"
    await supabase.from("offer_external_provider_notifications").insert({
      offer_id: offerId,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_email: provider.contact_email,
      notified_by: access.context.userId,
      notes: note || null,
    });

    return new Response(
      JSON.stringify({ success: true, email_id: result?.id || null, sent_to: provider.contact_email }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[PROVIDER-NOTIF] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
