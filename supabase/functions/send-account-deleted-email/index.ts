import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.1";
import { Resend } from "npm:resend@2.0.0";

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeletedEmailRequest {
  userEmail: string;
  userName: string;
  companyId: string;
  entityType: 'ambassador' | 'partner' | 'client';
}

const handler = async (req: Request): Promise<Response> => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, userName, companyId, entityType }: DeletedEmailRequest = await req.json();

    // Initialiser le client Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Récupérer les informations de l'entreprise
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url, primary_color, secondary_color, accent_color')
      .eq('id', companyId)
      .single();

    if (companyError) {
      console.error('Erreur récupération entreprise:', companyError);
      throw new Error('Entreprise non trouvée');
    }

    // Récupérer les paramètres SMTP
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name')
      .eq('company_id', companyId)
      .single();

    if (smtpError) {
      console.log('Aucun paramètre SMTP trouvé pour cette entreprise');
    }

    // Déterminer la clé API et les paramètres d'envoi
    let resendApiKey = Deno.env.get("LEAZR_RESEND_API");
    let fromEmail = 'noreply@leazr.co';
    let fromName = 'Leazr';

    // Traitement spécial pour iTakecare
    if (companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0') {
      console.log('Utilisation de la clé API Resend spéciale iTakecare (ITAKECARE_RESEND_API)');
      resendApiKey = Deno.env.get("ITAKECARE_RESEND_API");
      fromEmail = 'noreply@itakecare.be';
      fromName = 'iTakecare';
    } else if (smtpSettings && smtpSettings.resend_api_key && smtpSettings.resend_api_key.trim() !== '') {
      console.log('Utilisation de la clé API Resend de l\'entreprise');
      resendApiKey = smtpSettings.resend_api_key.trim();
      fromEmail = smtpSettings.from_email || fromEmail;
      fromName = smtpSettings.from_name || fromName;
    }

    if (!resendApiKey) {
      throw new Error('Aucune clé API Resend disponible');
    }

    // Initialiser Resend
    const resend = new Resend(resendApiKey);

    // Récupérer le template d'email
    let emailTemplate;
    const templateType = entityType === 'ambassador' ? 'ambassador_account_deleted' : 
                        entityType === 'partner' ? 'partner_account_deleted' : 
                        'client_account_deleted';
    
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('email_templates')
        .select('subject, html_content')
        .eq('company_id', companyId)
        .eq('type', templateType)
        .eq('active', true)
        .single();

      if (templateError) {
        console.log(`Aucun template ${templateType} trouvé, utilisation du template par défaut`);
      } else {
        emailTemplate = templateData;
        console.log(`Template ${templateType} trouvé et utilisé`);
      }
    } catch (error) {
      console.log('Erreur lors de la récupération du template:', error);
    }

    // Préparer le contenu de l'email
    const currentDate = new Date().toLocaleDateString('fr-FR');
    let emailSubject, emailHtml;
    
    if (emailTemplate) {
      // Utiliser le template personnalisé avec des variables
      emailSubject = emailTemplate.subject;
      emailHtml = emailTemplate.html_content
        .replace(/{{user_name}}/g, userName)
        .replace(/{{company_name}}/g, companyData.name || 'Leazr')
        .replace(/{{company_logo}}/g, companyData.logo_url || '')
        .replace(/{{company_address}}/g, 'Adresse de l\'entreprise')
        .replace(/{{company_email}}/g, fromEmail)
        .replace(/{{deletion_date}}/g, currentDate);
    } else {
      // Template par défaut basé sur le type d'entité
      if (entityType === 'ambassador') {
        emailSubject = `Votre compte ambassadeur ${companyData.name || 'Leazr'} a été supprimé`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 40px 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">${companyData.name || 'Leazr'}</h1>
            </div>
            <div style="padding: 40px 20px;">
              <h1 style="color: #1e293b;">Suppression de votre compte ambassadeur</h1>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Bonjour ${userName},
              </p>
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <p style="color: #475569; margin: 0;">
                  <strong>⚠️ Information importante :</strong> Votre compte ambassadeur chez 
                  <strong>${companyData.name || 'Leazr'}</strong> a été supprimé le ${currentDate}.
                </p>
              </div>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Nous vous remercions pour votre collaboration passée.
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                Cordialement,<br>
                L'équipe ${companyData.name || 'Leazr'}
              </p>
            </div>
          </div>
        `;
      } else {
        emailSubject = `Votre compte ${companyData.name || 'Leazr'} a été supprimé`;
        emailHtml = `
          <h1>Suppression de votre compte</h1>
          <p>Bonjour ${userName},</p>
          <p>Votre compte chez ${companyData.name || 'Leazr'} a été supprimé le ${currentDate}.</p>
          <p>Merci pour votre collaboration passée.</p>
          <p>Cordialement,<br>L'équipe ${companyData.name || 'Leazr'}</p>
        `;
      }
    }

    // Envoyer l'email
    const emailData = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [userEmail],
      subject: emailSubject,
      html: emailHtml,
    });

    console.log('Email de suppression envoyé:', emailData);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email de suppression envoyé avec succès',
      emailData 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Erreur dans send-account-deleted-email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);