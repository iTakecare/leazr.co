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

  console.log('send-no-follow-up-email v1');
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

    console.log('📧 Traitement de l\'email de clôture pour l\'offre:', offerId);

    // Initialiser le client Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // SECURITY (multi-tenant): fetch the offer through a client scoped to the
    // CALLER's JWT so Row-Level Security applies. This guarantees the caller
    // can only act on offers belonging to their own tenant — without it, the
    // service-role client below would let any authenticated user trigger a
    // "file closure" email on another company's offer/client.
    const authHeader = req.headers.get('Authorization') || '';
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: offer, error: offerError } = await callerClient
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('❌ Offre introuvable ou accès refusé (tenant):', offerError);
      throw new Error('Offre introuvable');
    }

    console.log('✅ Offre récupérée:', {
      id: offer.id,
      clientName: offer.client_name,
      clientEmail: offer.client_email
    });

    // Utiliser les valeurs personnalisées ou les valeurs par défaut
    const emailTitle = customTitle || "📁 Clôture de votre dossier";
    
    const defaultContent = `<p>Bonjour ${offer.client_name || 'Client'},</p>

<p>Nous avons tenté de vous joindre à plusieurs reprises concernant votre demande de leasing informatique, mais nous n'avons malheureusement pas eu de nouvelles de votre part.</p>

<p>En l'absence de retour, nous sommes contraints de <strong>clore votre dossier</strong>.</p>

<p>Si toutefois il s'agit d'un oubli ou si votre situation a changé, n'hésitez pas à nous recontacter. Nous serons ravis de reprendre l'étude de votre demande.</p>

<p>Nous restons à votre disposition.</p>

<p>Cordialement,<br/>L'équipe iTakecare</p>`;

    // Remplacer {{client_name}} dans le contenu personnalisé
    let emailBody = customContent || defaultContent;
    emailBody = emailBody.replace(/\{\{client_name\}\}/g, offer.client_name || 'Client');

    // Générer le HTML de l'email avec un header gris/neutre
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
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
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
    }
    .content p {
      margin: 0 0 16px 0;
    }
    .content p:last-child {
      margin-bottom: 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${emailTitle}</h1>
  </div>
  
  <div class="content">
    ${emailBody}
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

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Erreur Resend:', resendData);
      throw new Error(`Erreur lors de l'envoi de l'email: ${JSON.stringify(resendData)}`);
    }

    console.log('✅ Email de clôture envoyé avec succès:', resendData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email de clôture envoyé avec succès',
        emailId: resendData.id 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erreur dans send-no-follow-up-email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erreur interne' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

Deno.serve(handler);
