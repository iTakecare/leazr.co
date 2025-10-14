import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("ITAKECARE_RESEND_API"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOfferEmailRequest {
  offerId: string;
  recipientEmail: string;
  recipientName?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📧 [SEND-OFFER-EMAIL] Starting email send process");

    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Vérifier l'utilisateur
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("✅ User authenticated:", user.email);

    // Parser la requête
    const { offerId, recipientEmail, recipientName, message }: SendOfferEmailRequest = await req.json();

    console.log("📋 Request params:", { offerId, recipientEmail, recipientName });

    // Récupérer les informations de l'offre
    const { data: offer, error: offerError } = await supabaseClient
      .from("offers")
      .select(`
        id,
        offer_id,
        client_name,
        company_id,
        companies (
          name,
          logo_url
        )
      `)
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      throw new Error(`Offer not found: ${offerError?.message}`);
    }

    console.log("✅ Offer found:", offer.offer_id);

    // Récupérer le PDF depuis Storage
    const pdfPath = `company-${offer.company_id}/${offerId}.pdf`;
    console.log("📄 Fetching PDF from:", pdfPath);

    const { data: pdfData, error: pdfError } = await supabaseClient.storage
      .from("offer-pdfs")
      .download(pdfPath);

    if (pdfError || !pdfData) {
      throw new Error(`PDF not found: ${pdfError?.message}`);
    }

    console.log("✅ PDF downloaded, size:", (pdfData.size / 1024).toFixed(2), "KB");

    // Convertir le Blob en Buffer pour Resend
    const pdfBuffer = await pdfData.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Préparer le contenu de l'email
    const companyName = offer.companies?.name || "iTakecare";
    const clientDisplayName = recipientName || offer.client_name || "Client";
    const offerReference = offer.offer_id || offerId.substring(0, 8);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            padding: 30px 0;
            border-bottom: 3px solid #5b9bd5;
          }
          .content {
            padding: 30px 0;
          }
          .message {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            padding: 20px 0;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background: #5b9bd5;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="color: #2c3e50; margin: 0;">📄 Votre proposition commerciale</h1>
          <p style="color: #666; margin: 10px 0 0 0;">Offre N° ${offerReference}</p>
        </div>
        
        <div class="content">
          <p>Bonjour ${clientDisplayName},</p>
          
          <p>Veuillez trouver ci-joint votre proposition commerciale personnalisée de la part de <strong>${companyName}</strong>.</p>
          
          ${message ? `
            <div class="message">
              <p style="margin: 0;"><strong>Message personnalisé :</strong></p>
              <p style="margin: 10px 0 0 0;">${message}</p>
            </div>
          ` : ''}
          
          <p>Le document PDF en pièce jointe contient tous les détails de notre offre.</p>
          
          <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
          
          <p style="margin-top: 30px;">Cordialement,<br><strong>${companyName}</strong></p>
        </div>
        
        <div class="footer">
          <p>Cet email a été envoyé automatiquement par ${companyName}</p>
          <p>Merci de ne pas répondre directement à cet email</p>
        </div>
      </body>
      </html>
    `;

    // Envoyer l'email via Resend
    console.log("📤 Sending email via Resend...");
    
    const emailResponse = await resend.emails.send({
      from: `${companyName} <noreply@itakecare.be>`,
      to: [recipientEmail],
      subject: `Proposition commerciale ${offerReference} - ${companyName}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Offre_${offerReference}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    console.log("✅ Email sent successfully:", emailResponse);

    // Logger l'action dans offer_workflow_logs
    const { error: logError } = await supabaseClient
      .from("offer_workflow_logs")
      .insert({
        offer_id: offerId,
        action_type: "email_sent",
        action_description: `PDF envoyé à ${recipientEmail}`,
        created_by: user.id,
      });

    if (logError) {
      console.warn("⚠️ Failed to log workflow action:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResponse.id,
        message: "Email envoyé avec succès",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in send-offer-email function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
