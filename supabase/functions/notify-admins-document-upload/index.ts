import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offerId, documentType, fileName, uploaderEmail } = await req.json();

    console.log('📧 Notification admins - Upload document:', { offerId, documentType, fileName });

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Initialiser le client Supabase avec service role pour accéder aux données
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Récupérer les infos de l'offre et de l'entreprise
    const { data: offer, error: offerError } = await supabaseAdmin
      .from('offers')
      .select(`
        id,
        client_name,
        company_id,
        companies (
          name
        )
      `)
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      console.error('Erreur récupération offre:', offerError);
      throw new Error('Offer not found');
    }

    // Récupérer tous les admins de l'entreprise
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('company_id', offer.company_id)
      .in('role', ['admin', 'super_admin']);

    if (adminsError || !admins || admins.length === 0) {
      console.log('Aucun admin trouvé pour cette entreprise');
      return new Response(
        JSON.stringify({ success: true, message: 'No admins to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ ${admins.length} admin(s) trouvé(s)`);

    // Créer le lien vers l'offre
    const viewLink = `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://app.')}/offers/${offerId}`;

    // Template email
    const createEmailHtml = (adminName: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background-color: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .info-box strong { color: #1e40af; }
    .button { display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Nouveau Document Reçu</h1>
    </div>
    <div class="content">
      <p>Bonjour ${adminName},</p>
      
      <p>Un nouveau document vient d'être uploadé pour une offre :</p>
      
      <div class="info-box">
        <strong>Client :</strong> ${offer.client_name || 'Non spécifié'}<br>
        <strong>Type de document :</strong> ${documentType}<br>
        <strong>Nom du fichier :</strong> ${fileName}<br>
        <strong>Uploadé par :</strong> ${uploaderEmail || 'Non spécifié'}
      </div>
      
      <p>Le document est en attente de validation dans votre interface d'administration.</p>
      
      <a href="${viewLink}" class="button">Voir l'offre et le document</a>
      
      <p>Cordialement,<br>Votre plateforme iTakecare</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;

    // Envoyer un email à chaque admin
    const emailPromises = admins.map(async (admin) => {
      try {
        const emailHtml = createEmailHtml(admin.full_name || admin.email);
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: 'iTakecare <noreply@itakecare.be>',
            to: [admin.email],
            subject: `Nouveau document reçu - ${offer.client_name || 'Client'}`,
            html: emailHtml,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Erreur envoi email à ${admin.email}:`, errorText);
          return { admin: admin.email, success: false, error: errorText };
        }

        console.log(`✅ Email envoyé à ${admin.email}`);
        return { admin: admin.email, success: true };
      } catch (error) {
        console.error(`Erreur lors de l'envoi à ${admin.email}:`, error);
        return { admin: admin.email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`📧 Résultat: ${successCount}/${admins.length} emails envoyés`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: admins.length,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('❌ Erreur notification admins:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
