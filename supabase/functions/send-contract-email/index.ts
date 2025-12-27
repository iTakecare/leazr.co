import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("ITAKECARE_RESEND_API") || Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContractEmailRequest {
  to: string;
  subject: string;
  body: string;
  signatureLink: string;
  contractId: string;
  contractNumber?: string;
  offerNumber?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, signatureLink, contractId, contractNumber, offerNumber }: ContractEmailRequest = await req.json();

    // Use contract number if available, fallback to offer number
    const referenceNumber = contractNumber || offerNumber;
    console.log("Send contract email request:", { to, subject, contractId, contractNumber, offerNumber, referenceNumber });

    if (!to || !subject || !signatureLink) {
      throw new Error("Missing required fields: to, subject, signatureLink");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    let companyName = "Notre équipe";
    let primaryColor = "#3b82f6";
    let logoUrl = "";
    let companyId: string | null = null;

    // Try to get company info from authenticated user first
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .single();
        companyId = profile?.company_id || null;
      }
    }

    // Fallback: get company_id from contract if not found via auth
    if (!companyId && contractId) {
      console.log("Getting company_id from contract:", contractId);
      const { data: contract, error: contractError } = await adminSupabase
        .from("contracts")
        .select("company_id")
        .eq("id", contractId)
        .single();
      
      if (contractError) {
        console.error("Error fetching contract:", contractError);
      } else {
        companyId = contract?.company_id || null;
        console.log("Found company_id from contract:", companyId);
      }
    }

    // Get company branding
    if (companyId) {
      const { data: company } = await adminSupabase
        .from("companies")
        .select("name, logo_url, primary_color")
        .eq("id", companyId)
        .single();

      if (company) {
        companyName = company.name || companyName;
        primaryColor = company.primary_color || primaryColor;
        logoUrl = company.logo_url || "";
        console.log("Company branding loaded:", { companyName, primaryColor, hasLogo: !!logoUrl });
      }
    }

    // Build email HTML
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="white-space: pre-wrap; line-height: 1.6; color: #374151; font-size: 15px;">
${body.replace(/\n/g, '<br>')}
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${signatureLink}" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✍️ Signer le contrat
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 13px; margin-top: 30px;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                <a href="${signatureLink}" style="color: ${primaryColor}; word-break: break-all;">${signatureLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                ${referenceNumber ? `Référence : ${referenceNumber}<br>` : ''}
                Cet email a été envoyé par ${companyName}.<br>
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

    // Get FROM address - use verified domain
    const fromEmail = "hello@itakecare.be";
    const fromName = companyName;

    console.log("Sending email via Resend:", { from: `${fromName} <${fromEmail}>`, to, subject });

    const emailResponse = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    // Check for Resend errors (returns { data, error } structure)
    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: emailResponse.error.message || "Failed to send email",
          details: emailResponse.error
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Contract email sent successfully:", emailResponse);

    // Update contract timestamp (updated_at only, last_email_sent_at doesn't exist)
    if (contractId) {
      await adminSupabase
        .from("contracts")
        .update({
          updated_at: new Date().toISOString()
        })
        .eq("id", contractId);
    }

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-contract-email function:", error);
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
