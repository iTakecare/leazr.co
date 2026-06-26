// @ts-nocheck
import { requireElevatedAccess } from "../_shared/security.ts";
import { resolveClientLanguage } from "../_shared/clientLanguage.ts";
import { rejectionTitle, rejectionBody, buildRejectionHtml } from "../_shared/leasingEmails.ts";

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
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin', 'broker'],
      rateLimit: {
        endpoint: 'send-leasing-rejection-email',
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: 'send-leasing-rejection-email',
      },
    });

    if (!access.ok) {
      return access.response;
    }

    if (!RESEND_API_KEY) {
      console.error('❌ ITAKECARE_RESEND_API non configurée');
      throw new Error('ITAKECARE_RESEND_API non configurée');
    }

    const { offerId, customTitle, customContent, language } = await req.json();

    if (!offerId) {
      throw new Error('offerId est requis');
    }

    console.log('📧 Traitement de l\'email de refus pour l\'offre:', offerId);

    // Initialiser le client Supabase
    const supabase = access.context.supabaseAdmin;

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

    if (
      !access.context.isServiceRole &&
      access.context.role !== 'super_admin' &&
      access.context.companyId !== offer.company_id
    ) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cross-company leasing rejection email is forbidden' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Offre récupérée:', {
      id: offer.id,
      clientName: offer.client_name,
      clientEmail: offer.client_email
    });

    // Langue de communication : surcharge éventuelle, sinon préférence du client.
    const lang = await resolveClientLanguage(supabase, { override: language, clientId: offer.client_id, offerId });
    console.log('🌐 Langue résolue:', lang);

    // Utiliser les valeurs personnalisées ou les valeurs par défaut localisées
    const emailTitle = customTitle || rejectionTitle(lang);
    const emailBody = customContent || rejectionBody(lang);

    // Générer le HTML de l'email
    const htmlContent = buildRejectionHtml(emailTitle, emailBody);

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
