import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offerId, customSubject, customContent } = await req.json();

    if (!offerId) {
      throw new Error("offerId est requis");
    }

    // Get authorization header to propagate JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    console.log('Auth header present:', Boolean(authHeader));

    // Initialize Supabase client with JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: authHeader } 
        } 
      }
    );

    // Get offer details
    const { data: offer, error: offerError } = await supabaseClient
      .from('offers')
      .select(`
        id,
        client_name,
        client_email,
        companies (
          name,
          logo_url
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      throw new Error("Offre introuvable ou accès non autorisé");
    }

    if (!offer.client_email) {
      throw new Error("Aucun email client trouvé pour cette offre");
    }

    // Prepare email content
    const subject = customSubject || "😕 Nous sommes désolés, votre demande de leasing n'a pas été acceptée";
    
    const defaultContent = `
      <p>Bonjour,</p>
      <p>Nous sommes désolés de vous apprendre que notre partenaire financier nous a indiqué qu'il ne pouvait pas donner suite à votre demande de leasing.</p>
      <p>Nous ne pourrons donc pas vous proposer de matériel cette fois-ci.</p>
      <p>Je vous souhaite tout le meilleur pour la suite de vos activités.</p>
      <p>A bientôt,</p>
      <p><strong>L'équipe ${offer.companies?.name || 'iTakecare'}</strong></p>
    `;

    const emailBody = customContent || defaultContent;

    // Construct full HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
          }
          .logo {
            max-width: 150px;
            height: auto;
            margin-bottom: 15px;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border-radius: 8px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${offer.companies?.logo_url ? `<img src="${offer.companies.logo_url}" alt="Logo" class="logo">` : ''}
          <h2>Notification de décision</h2>
        </div>
        <div class="content">
          ${emailBody}
        </div>
        <div class="footer">
          <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY n'est pas configuré");
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${offer.companies?.name || 'iTakecare'} <onboarding@resend.dev>`,
        to: [offer.client_email],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Erreur Resend:", errorText);
      throw new Error(`Erreur lors de l'envoi de l'email: ${errorText}`);
    }

    const resendData = await resendResponse.json();
    console.log("Email de refus envoyé avec succès:", resendData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email de refus envoyé avec succès",
        emailId: resendData.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Erreur dans send-leasing-rejection-email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de l'envoi de l'email de refus" 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
