// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=deno&dts";

const RESEND_API_KEY = Deno.env.get('ITAKECARE_RESEND_API');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('send-leasing-rejection-email v1');
  console.log('Env check - ITAKECARE_RESEND_API:', RESEND_API_KEY ? 'true (length: ' + RESEND_API_KEY.length + ')' : 'false');

  try {
    if (!RESEND_API_KEY) {
      console.error('❌ ITAKECARE_RESEND_API non configurée');
      throw new Error('ITAKECARE_RESEND_API non configurée');
    }

    const { offerId, customTitle, customContent } = await req.json();

    if (!offerId) {
      throw new Error('offerId est requis');
    }

    console.log('📧 Traitement de l\'email de refus pour l\'offre:', offerId);

    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les données de l'offre
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('❌ Erreur lors de la récupération de l\'offre:', offerError);
      throw new Error('Offre introuvable');
    }

    console.log('✅ Offre récupérée:', {
      id: offer.id,
      clientName: offer.client_name,
      clientEmail: offer.client_email
    });

    // Utiliser les valeurs personnalisées ou les valeurs par défaut
    const emailTitle = customTitle || "😕 Nous sommes désolés, votre demande de leasing n'a pas été acceptée";
    const emailBody = customContent || `Bonjour,

Nous sommes désolés de vous apprendre que notre partenaire financier nous a indiqué qu'il ne pouvait pas donner suite à votre demande de leasing.

Nous ne pourrons donc pas vous proposer de matériel cette fois-ci.
Je vous souhaite tout le meilleur pour la suite de vos activités.
À bientôt,

L'équipe iTakecare`;

    // Générer le HTML de l'email
    const formattedBody = emailBody.replace(/\n/g, '<br>');
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
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
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
      white-space: pre-wrap;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${emailTitle}</h1>
  </div>
  
  <div class="content">
    ${formattedBody}
  </div>
  
  <div class="footer">
    <p>iTakecare SRL | BE0795.642.894<br>
    Avenue Général Michel 1E - 6000 Charleroi<br>
    <a href="https://www.itakecare.be">www.itakecare.be</a> | <a href="mailto:hello@itakecare.be">hello@itakecare.be</a></p>
  </div>
</body>
</html>
    `;

    console.log('📧 Envoi de l\'email via Resend...');

    // Envoyer l'email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'iTakecare <noreply@itakecare.be>',
        to: [offer.client_email],
        subject: emailTitle,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('❌ Erreur Resend:', errorText);
      throw new Error(`Erreur lors de l'envoi de l'email: ${errorText}`);
    }

    const resendData = await resendResponse.json();
    console.log('✅ Email envoyé avec succès via Resend:', resendData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de refus envoyé avec succès',
        resendData 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erreur dans send-leasing-rejection-email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

Deno.serve(handler);
