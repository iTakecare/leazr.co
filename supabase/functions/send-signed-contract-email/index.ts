import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getClientIp, getJwtRoleFromRequest, requireElevatedAccess } from "../_shared/security.ts";
import { resolveClientLanguage, type Lang } from "../_shared/clientLanguage.ts";

const SIGNED_LOCALE: Record<Lang, string> = { fr: "fr-FR", nl: "nl-NL", en: "en-GB", de: "de-DE" };

const SIGNED_I18N: Record<Lang, Record<string, string>> = {
  fr: {
    subject: "Votre contrat {ref} a été signé",
    successTitle: "Contrat signé avec succès !",
    hello: "Bonjour",
    confirm: "Nous vous confirmons que votre contrat de location a été signé électroniquement avec succès.",
    download: "📄 Télécharger le contrat signé",
    details: "Détails du contrat",
    reference: "Référence :",
    signer: "Signataire :",
    signedDate: "Date de signature :",
    duration: "Durée :",
    months: "mois",
    downPayment: "Acompte :",
    adjustedMonthly: "Mensualité ajustée HT :",
    monthly: "Mensualité HT :",
    equipment: "Équipements",
    equipmentCol: "Équipement",
    qty: "Qté",
    monthlyCol: "Mensualité",
    totalMonthly: "Total mensuel HT :",
    debitNote: "Les prélèvements seront effectués par domiciliation bancaire sur le compte que vous avez renseigné lors de la signature.",
    questions: "Pour toute question, n'hésitez pas à nous contacter.",
    regards: "Cordialement,",
    team: "L'équipe",
    signedElec: "Contrat signé électroniquement le",
    ip: "Adresse IP :",
    rights: "Tous droits réservés.",
    dearClient: "Cher client",
  },
  nl: {
    subject: "Uw contract {ref} is ondertekend",
    successTitle: "Contract succesvol ondertekend!",
    hello: "Beste",
    confirm: "Wij bevestigen dat uw huurcontract succesvol elektronisch werd ondertekend.",
    download: "📄 Ondertekend contract downloaden",
    details: "Contractgegevens",
    reference: "Referentie:",
    signer: "Ondertekenaar:",
    signedDate: "Datum van ondertekening:",
    duration: "Looptijd:",
    months: "maanden",
    downPayment: "Voorschot:",
    adjustedMonthly: "Aangepaste maandhuur excl. btw:",
    monthly: "Maandhuur excl. btw:",
    equipment: "Materiaal",
    equipmentCol: "Materiaal",
    qty: "Aantal",
    monthlyCol: "Maandhuur",
    totalMonthly: "Totaal per maand excl. btw:",
    debitNote: "De betalingen gebeuren via domiciliëring op de rekening die u bij de ondertekening hebt opgegeven.",
    questions: "Met vragen kunt u steeds bij ons terecht.",
    regards: "Met vriendelijke groeten,",
    team: "Het team van",
    signedElec: "Contract elektronisch ondertekend op",
    ip: "IP-adres:",
    rights: "Alle rechten voorbehouden.",
    dearClient: "Geachte klant",
  },
  en: {
    subject: "Your contract {ref} has been signed",
    successTitle: "Contract signed successfully!",
    hello: "Hello",
    confirm: "We confirm that your rental contract has been successfully signed electronically.",
    download: "📄 Download the signed contract",
    details: "Contract details",
    reference: "Reference:",
    signer: "Signatory:",
    signedDate: "Date signed:",
    duration: "Term:",
    months: "months",
    downPayment: "Down payment:",
    adjustedMonthly: "Adjusted monthly (excl. VAT):",
    monthly: "Monthly (excl. VAT):",
    equipment: "Equipment",
    equipmentCol: "Equipment",
    qty: "Qty",
    monthlyCol: "Monthly",
    totalMonthly: "Total monthly (excl. VAT):",
    debitNote: "Payments will be collected by direct debit from the account you provided when signing.",
    questions: "If you have any questions, please don't hesitate to contact us.",
    regards: "Kind regards,",
    team: "The team at",
    signedElec: "Contract signed electronically on",
    ip: "IP address:",
    rights: "All rights reserved.",
    dearClient: "Dear customer",
  },
  de: {
    subject: "Ihr Vertrag {ref} wurde unterzeichnet",
    successTitle: "Vertrag erfolgreich unterzeichnet!",
    hello: "Guten Tag",
    confirm: "Wir bestätigen, dass Ihr Mietvertrag erfolgreich elektronisch unterzeichnet wurde.",
    download: "📄 Unterzeichneten Vertrag herunterladen",
    details: "Vertragsdetails",
    reference: "Referenz:",
    signer: "Unterzeichner:",
    signedDate: "Unterzeichnungsdatum:",
    duration: "Laufzeit:",
    months: "Monate",
    downPayment: "Anzahlung:",
    adjustedMonthly: "Angepasste Monatsrate (netto):",
    monthly: "Monatsrate (netto):",
    equipment: "Ausstattung",
    equipmentCol: "Ausstattung",
    qty: "Menge",
    monthlyCol: "Monatsrate",
    totalMonthly: "Monatlich gesamt (netto):",
    debitNote: "Die Zahlungen erfolgen per Lastschrift von dem bei der Unterzeichnung angegebenen Konto.",
    questions: "Bei Fragen stehen wir Ihnen gerne zur Verfügung.",
    regards: "Mit freundlichen Grüßen,",
    team: "Das Team von",
    signedElec: "Vertrag elektronisch unterzeichnet am",
    ip: "IP-Adresse:",
    rights: "Alle Rechte vorbehalten.",
    dearClient: "Sehr geehrter Kunde",
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendSignedContractRequest {
  contractId?: string;
  signatureToken?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId, signatureToken }: SendSignedContractRequest = await req.json();

    if (!contractId && !signatureToken) {
      throw new Error("Missing contractId or signatureToken parameter");
    }

    console.log("Processing signed contract email for:", contractId || "signature-token-flow");

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    let supabase = createClient(supabaseUrl, supabaseServiceKey);
    let authContext: any = null;

    const hasAuthorizationHeader = !!req.headers.get("Authorization");
    const jwtRole = getJwtRoleFromRequest(req);
    const hasPrivilegedAuthorization = hasAuthorizationHeader && jwtRole !== null && jwtRole !== "anon";

    if (hasPrivilegedAuthorization) {
      if (!contractId) {
        return new Response(
          JSON.stringify({ error: "contractId is required for authenticated requests" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const access = await requireElevatedAccess(req, corsHeaders, {
        allowedRoles: ["admin", "super_admin", "broker"],
        rateLimit: {
          endpoint: "send-signed-contract-email-auth",
          maxRequests: 25,
          windowSeconds: 60,
          identifierPrefix: "send-signed-contract-email-auth",
        },
      });

      if (!access.ok) {
        return access.response;
      }

      authContext = access.context;
      supabase = authContext.supabaseAdmin;
    } else {
      if (!signatureToken) {
        return new Response(
          JSON.stringify({ error: "Authorization header or signatureToken is required" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      const clientIp = getClientIp(req);
      const publicRateLimit = await checkRateLimit(
        supabase,
        `send-signed-contract-email-public:${clientIp}`,
        "send-signed-contract-email-public",
        { maxRequests: 5, windowSeconds: 60 }
      );

      if (!publicRateLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many requests" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
              "X-RateLimit-Remaining": publicRateLimit.remaining.toString(),
            },
          }
        );
      }
    }

    // Fetch contract with all related data including client and offer (for down payment)
    let contractQuery = supabase
      .from("contracts")
      .select(`
        *,
        contract_equipment (*),
        clients (id, name, email, company, phone, address, city, postal_code, vat_number),
        offers!offer_id (down_payment, coefficient, monthly_payment, financed_amount, amount)
      `);

    if (signatureToken && !authContext) {
      contractQuery = contractQuery.eq("contract_signature_token", signatureToken);
    } else {
      contractQuery = contractQuery.eq("id", contractId);
    }

    const { data: contract, error: contractError } = await contractQuery.single();

    if (contractError || !contract) {
      console.error("Contract fetch error:", contractError);
      throw new Error("Contrat non trouvé");
    }

    if (
      authContext &&
      !authContext.isServiceRole &&
      authContext.role !== "super_admin" &&
      authContext.companyId !== contract.company_id
    ) {
      return new Response(
        JSON.stringify({ error: "Cross-company signed contract email is forbidden" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!authContext) {
      if (contract.signature_status !== "signed") {
        return new Response(
          JSON.stringify({ error: "Contract must be signed before sending email" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (!contract.contract_signature_token || contract.contract_signature_token !== signatureToken) {
        return new Response(
          JSON.stringify({ error: "Invalid signature token" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    }

    // Resolve contract reference with fallback
    const contractReference = contract.tracking_number || contract.contract_number || `CONTRAT-${String(contract.id).substring(0, 8).toUpperCase()}`;
    console.log("Contract reference resolved:", contractReference, "(tracking_number:", contract.tracking_number, "contract_number:", contract.contract_number, ")");

    // Fetch company data with slug for PDF download URL
    const { data: company } = await supabase
      .from("companies")
      .select("name, logo_url, primary_color, slug")
      .eq("id", contract.company_id)
      .single();

    const companyName = company?.name || "Notre équipe";
    const primaryColor = company?.primary_color || "#3b82f6";
    const logoUrl = company?.logo_url || "";
    const companySlug = company?.slug || "";

    // Get client email - fallback to clients table if not on contract directly
    const clientEmail = contract.client_email || contract.clients?.email;
    if (!clientEmail) {
      console.error("No client email found. contract.client_email:", contract.client_email, "clients.email:", contract.clients?.email);
      throw new Error("Email client non trouvé sur le contrat");
    }
    console.log("Client email resolved:", clientEmail);

    // Langue de communication du client → email localisé.
    const lang = await resolveClientLanguage(supabase, { clientId: contract.client_id ?? contract.clients?.id });
    const t = SIGNED_I18N[lang];
    const dateLocale = SIGNED_LOCALE[lang];
    console.log("Resolved language:", lang);

    // Format signature date
    const signedAt = contract.contract_signed_at
      ? new Date(contract.contract_signed_at).toLocaleDateString(dateLocale, {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Non disponible';

    // Calculate total monthly payment
    const totalMonthly = contract.monthly_payment || 
      (contract.contract_equipment?.reduce((sum: number, eq: any) => 
        sum + (eq.monthly_payment || 0), 0) || 0);

    // Get down payment info from linked offer
    const downPayment = contract.offers?.down_payment || 0;
    const coefficient = contract.offers?.coefficient || 0;
    const financedAmount = contract.offers?.financed_amount || contract.offers?.amount || 0;
    const isSelfLeasing = contract.is_self_leasing || false;
    
    // Only show down payment info for self-leasing contracts with actual down payment
    const hasDownPayment = downPayment > 0 && coefficient > 0 && isSelfLeasing;
    
    // Calculate adjusted monthly payment using the correct formula from SQL:
    // adjusted = round(((financed_amount - down_payment) * coefficient) / 100, 2)
    const adjustedMonthlyPayment = hasDownPayment 
      ? Math.round(((financedAmount - downPayment) * coefficient) / 100 * 100) / 100
      : totalMonthly;

    console.log("Down payment info:", { downPayment, coefficient, financedAmount, isSelfLeasing, hasDownPayment, totalMonthly, adjustedMonthlyPayment });

    // Build equipment list HTML
    const equipmentListHtml = contract.contract_equipment?.map((eq: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${eq.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${eq.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(eq.monthly_payment || 0).toFixed(2)} €</td>
      </tr>
    `).join('') || '';

    // Generate the full signed contract HTML document
    const signedContractHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat signé - ${contractReference}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 20px; }
    .logo { max-height: 60px; margin-bottom: 15px; }
    h1 { color: ${primaryColor}; margin: 0; }
    .contract-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .info-label { font-weight: bold; width: 200px; color: #6b7280; }
    .info-value { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
    .total-row { background: #f9fafb; font-weight: bold; }
    .signature-section { margin-top: 40px; padding: 20px; background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; }
    .signature-title { color: #059669; font-weight: bold; margin-bottom: 15px; font-size: 18px; }
    .signature-image { max-width: 300px; max-height: 100px; margin: 10px 0; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" />` : ''}
    <h1>CONTRAT DE LOCATION SIGNÉ</h1>
    <p style="color: #6b7280;">Référence : ${contractReference}</p>
  </div>

  <div class="contract-info">
    <h2 style="margin-top: 0; color: ${primaryColor};">Informations du contrat</h2>
    <div class="info-row">
      <span class="info-label">Client :</span>
      <span class="info-value">${contract.client_name || 'Non spécifié'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Email :</span>
      <span class="info-value">${contract.client_email || 'Non spécifié'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Durée du contrat :</span>
      <span class="info-value">${contract.contract_duration || 36} mois</span>
    </div>
    ${hasDownPayment ? `
    <div class="info-row">
      <span class="info-label">Acompte :</span>
      <span class="info-value" style="font-weight: bold;">${downPayment.toFixed(2)} €</span>
    </div>
    <div class="info-row">
      <span class="info-label">Mensualité ajustée HT :</span>
      <span class="info-value" style="color: ${primaryColor}; font-weight: bold; font-size: 18px;">${adjustedMonthlyPayment.toFixed(2)} €</span>
    </div>
    ` : `
    <div class="info-row">
      <span class="info-label">Mensualité HT :</span>
      <span class="info-value" style="color: ${primaryColor}; font-weight: bold; font-size: 18px;">${totalMonthly.toFixed(2)} €</span>
    </div>
    `}
    ${contract.client_iban ? `
    <div class="info-row">
      <span class="info-label">IBAN :</span>
      <span class="info-value">${contract.client_iban}</span>
    </div>
    ` : ''}
  </div>

  <h2 style="color: ${primaryColor};">Équipements</h2>
  <table>
    <thead>
      <tr>
        <th>Équipement</th>
        <th style="text-align: center;">Quantité</th>
        <th style="text-align: right;">Mensualité HT</th>
      </tr>
    </thead>
    <tbody>
      ${equipmentListHtml}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2" style="text-align: right; padding: 12px;">Total mensuel HT :</td>
        <td style="text-align: right; color: ${primaryColor}; padding: 12px;">${totalMonthly.toFixed(2)} €</td>
      </tr>
    </tfoot>
  </table>

  <div class="signature-section">
    <div class="signature-title">✓ Signature électronique</div>
    <div class="info-row">
      <span class="info-label">Signataire :</span>
      <span class="info-value">${contract.contract_signer_name || contract.client_name || 'Non spécifié'}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date de signature :</span>
      <span class="info-value">${signedAt}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Adresse IP :</span>
      <span class="info-value">${contract.contract_signer_ip || 'Non disponible'}</span>
    </div>
    ${contract.signature_data ? `
    <div style="margin-top: 15px;">
      <span class="info-label">Signature :</span>
      <div><img src="${contract.signature_data}" class="signature-image" alt="Signature" /></div>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    <p>Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p>© ${new Date().getFullYear()} ${companyName}. Tous droits réservés.</p>
  </div>
</body>
</html>
    `;

    // Build PDF download URL using the public route
    // Uses the contract_signature_token to allow public PDF generation
    let downloadUrl = '';
    
    if (contract.contract_signature_token) {
      // Use the new public PDF download route
      const baseUrl = 'https://leazr.co';
      if (companySlug) {
        downloadUrl = `${baseUrl}/${companySlug}/contract/${contract.contract_signature_token}/signed.pdf`;
      } else {
        downloadUrl = `${baseUrl}/contract/${contract.contract_signature_token}/signed.pdf`;
      }
      console.log("Using public PDF download URL:", downloadUrl);
    } else {
      console.warn("No contract_signature_token found, email will have no download button");
    }

    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat signé - ${contractReference}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 30px 40px; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 50px; max-width: 200px;" />` : `<h1 style="margin: 0; color: #ffffff; font-size: 24px;">${companyName}</h1>`}
            </td>
          </tr>
          
          <!-- Success Icon -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; margin: 0 auto; line-height: 80px;">
                <span style="font-size: 40px; color: white;">✓</span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 20px; text-align: center; color: #111827; font-size: 22px;">${t.successTitle}</h2>

              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                ${t.hello} ${contract.client_name || t.dearClient},
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                ${t.confirm}
              </p>

              <!-- Download Button -->
              ${downloadUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadUrl}" style="display: inline-block; background-color: ${primaryColor}; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ${t.download}
                </a>
              </div>
              ` : ''}

              <!-- Contract Details -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px; color: #111827; font-size: 16px;">${t.details}</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">${t.reference}</td>
                    <td style="padding: 5px 0; color: #111827; font-weight: 600;">${contractReference}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">${t.signer}</td>
                    <td style="padding: 5px 0; color: #111827;">${contract.contract_signer_name || contract.client_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">${t.signedDate}</td>
                    <td style="padding: 5px 0; color: #111827;">${signedAt}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">${t.duration}</td>
                    <td style="padding: 5px 0; color: #111827;">${contract.contract_duration || 36} ${t.months}</td>
                  </tr>
                  ${hasDownPayment ? `
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">${t.downPayment}</td>
                    <td style="padding: 5px 0; color: #111827; font-weight: 600;">${downPayment.toFixed(2)} €</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">${t.adjustedMonthly}</td>
                    <td style="padding: 5px 0; color: ${primaryColor}; font-weight: 700; font-size: 16px;">${adjustedMonthlyPayment.toFixed(2)} €</td>
                  </tr>
                  ` : `
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">${t.monthly}</td>
                    <td style="padding: 5px 0; color: ${primaryColor}; font-weight: 700; font-size: 16px;">${totalMonthly.toFixed(2)} €</td>
                  </tr>
                  `}
              </div>

              <!-- Equipment Table -->
              <h3 style="margin: 25px 0 15px; color: #111827; font-size: 16px;">${t.equipment}</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">${t.equipmentCol}</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">${t.qty}</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">${t.monthlyCol}</th>
                  </tr>
                </thead>
                <tbody>
                  ${equipmentListHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f9fafb; font-weight: 600;">
                    <td colspan="2" style="padding: 12px 10px; text-align: right;">${hasDownPayment ? t.adjustedMonthly : t.totalMonthly}</td>
                    <td style="padding: 12px 10px; text-align: right; color: ${primaryColor};">${hasDownPayment ? adjustedMonthlyPayment.toFixed(2) : totalMonthly.toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>

              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 25px;">
                ${t.debitNote}
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                ${t.questions}
              </p>

              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                ${t.regards}<br>
                <strong>${t.team} ${companyName}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                ${t.signedElec} ${signedAt}<br>
                ${t.ip} ${contract.contract_signer_ip || 'Non disponible'}<br><br>
                © ${new Date().getFullYear()} ${companyName}. ${t.rights}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Initialize Resend
    const resendApiKey = Deno.env.get("ITAKECARE_RESEND_API") || Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    // Use verified email address - hello@itakecare.be is verified on Resend
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "hello@itakecare.be";

    // Send email to client
    console.log("Sending email to client:", clientEmail, "from:", fromEmail);
    const clientEmailResponse = await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [clientEmail],
      subject: t.subject.replace("{ref}", contractReference),
      html: htmlContent,
    });

    console.log("Client email sent:", clientEmailResponse);

    // Update contract with email sent timestamp
    await supabase
      .from("contracts")
      .update({
        last_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", contract.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Emails envoyés avec succès",
        clientEmail: clientEmail,
        downloadUrl: downloadUrl
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-signed-contract-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
