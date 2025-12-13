import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendSignedContractRequest {
  contractId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contractId }: SendSignedContractRequest = await req.json();

    if (!contractId) {
      throw new Error("Missing contractId parameter");
    }

    console.log("Processing signed contract email for:", contractId);

    // Initialize Supabase client with service role for admin access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch contract with all related data
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select(`
        *,
        contract_equipment (*)
      `)
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      console.error("Contract fetch error:", contractError);
      throw new Error("Contrat non trouvé");
    }

    console.log("Contract fetched:", contract.tracking_number);

    // Fetch company data
    const { data: company } = await supabase
      .from("companies")
      .select("name, logo_url, primary_color")
      .eq("id", contract.company_id)
      .single();

    const companyName = company?.name || "Notre équipe";
    const primaryColor = company?.primary_color || "#3b82f6";
    const logoUrl = company?.logo_url || "";

    // Get client email from contract
    const clientEmail = contract.client_email;
    if (!clientEmail) {
      throw new Error("Email client non trouvé sur le contrat");
    }

    // Get admin emails for copy
    const { data: adminEmails } = await supabase.rpc('get_admin_emails_for_company', {
      p_company_id: contract.company_id
    });

    // Format signature date
    const signedAt = contract.contract_signed_at 
      ? new Date(contract.contract_signed_at).toLocaleDateString('fr-FR', {
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

    // Build equipment list HTML
    const equipmentListHtml = contract.contract_equipment?.map((eq: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${eq.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${eq.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${(eq.monthly_payment || 0).toFixed(2)} €</td>
      </tr>
    `).join('') || '';

    // Build the email HTML
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat signé - ${contract.tracking_number}</title>
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
              <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px; color: white;">✓</span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h2 style="margin: 0 0 20px; text-align: center; color: #111827; font-size: 22px;">Contrat signé avec succès !</h2>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                Bonjour ${contract.client_name || 'Cher client'},
              </p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                Nous vous confirmons que votre contrat de location a été signé électroniquement avec succès.
              </p>
              
              <!-- Contract Details -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px; color: #111827; font-size: 16px;">Détails du contrat</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Référence :</td>
                    <td style="padding: 5px 0; color: #111827; font-weight: 600;">${contract.tracking_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Signataire :</td>
                    <td style="padding: 5px 0; color: #111827;">${contract.contract_signer_name || contract.client_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Date de signature :</td>
                    <td style="padding: 5px 0; color: #111827;">${signedAt}</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Durée :</td>
                    <td style="padding: 5px 0; color: #111827;">${contract.contract_duration || 36} mois</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px 0; color: #6b7280;">Mensualité HT :</td>
                    <td style="padding: 5px 0; color: ${primaryColor}; font-weight: 700; font-size: 16px;">${totalMonthly.toFixed(2)} €</td>
                  </tr>
                </table>
              </div>
              
              <!-- Equipment Table -->
              <h3 style="margin: 25px 0 15px; color: #111827; font-size: 16px;">Équipements</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e5e7eb;">Équipement</th>
                    <th style="padding: 10px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qté</th>
                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e5e7eb;">Mensualité</th>
                  </tr>
                </thead>
                <tbody>
                  ${equipmentListHtml}
                </tbody>
                <tfoot>
                  <tr style="background-color: #f9fafb; font-weight: 600;">
                    <td colspan="2" style="padding: 12px 10px; text-align: right;">Total mensuel HT :</td>
                    <td style="padding: 12px 10px; text-align: right; color: ${primaryColor};">${totalMonthly.toFixed(2)} €</td>
                  </tr>
                </tfoot>
              </table>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 25px;">
                Les prélèvements seront effectués par domiciliation bancaire sur le compte que vous avez renseigné lors de la signature.
              </p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                Pour toute question, n'hésitez pas à nous contacter.
              </p>
              
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                Cordialement,<br>
                <strong>L'équipe ${companyName}</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Contrat signé électroniquement le ${signedAt}<br>
                Adresse IP : ${contract.contract_signer_ip || 'Non disponible'}<br><br>
                © ${new Date().getFullYear()} ${companyName}. Tous droits réservés.
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
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "contrats@resend.dev";

    // Send email to client
    console.log("Sending email to client:", clientEmail);
    const clientEmailResponse = await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [clientEmail],
      subject: `Votre contrat ${contract.tracking_number} a été signé`,
      html: htmlContent,
    });

    console.log("Client email sent:", clientEmailResponse);

    // Send copy to admins
    if (adminEmails && adminEmails.length > 0) {
      const adminEmailAddresses = adminEmails
        .filter((admin: any) => admin.email)
        .map((admin: any) => admin.email);

      if (adminEmailAddresses.length > 0) {
        console.log("Sending copy to admins:", adminEmailAddresses);
        
        const adminEmailResponse = await resend.emails.send({
          from: `${companyName} <${fromEmail}>`,
          to: adminEmailAddresses,
          subject: `[Copie] Contrat signé - ${contract.tracking_number}`,
          html: htmlContent.replace(
            'Bonjour ' + (contract.client_name || 'Cher client'),
            `<strong>[Copie pour l'administration]</strong><br><br>Le contrat de ${contract.client_name || 'votre client'} a été signé`
          ),
        });

        console.log("Admin email sent:", adminEmailResponse);
      }
    }

    // Update contract with email sent timestamp
    await supabase
      .from("contracts")
      .update({
        last_email_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", contractId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Emails envoyés avec succès",
        clientEmail: clientEmail
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
