import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PasswordResetRequest {
  email: string;
  companyId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Créer un client Supabase avec la clé de service pour accès admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, companyId }: PasswordResetRequest = await req.json();

    console.log(`Demande de réinitialisation de mot de passe pour ${email}`);

    // 1. Vérifier si l'utilisateur existe via les users
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Erreur lors de la récupération des utilisateurs:', listError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification de l\'utilisateur' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const userData = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!userData) {
      console.log(`Utilisateur non trouvé pour l'email: ${email}`);
      // Pour des raisons de sécurité, on retourne toujours success même si l'utilisateur n'existe pas
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Si cet email existe, un lien de réinitialisation a été envoyé'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2. Récupérer le profil pour obtenir company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, first_name, last_name')
      .eq('id', userData.id)
      .single();

    const userCompanyId = companyId || profile?.company_id;

    if (!userCompanyId) {
      return new Response(
        JSON.stringify({ error: 'Entreprise non trouvée' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 3. Générer un token personnalisé pour la réinitialisation
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expire dans 1 heure

    const { error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .insert({
        user_email: email,
        token: resetToken,
        token_type: 'password_reset',
        company_id: userCompanyId,
        expires_at: expiresAt.toISOString(),
        metadata: {
          user_id: userData.id,
          first_name: profile?.first_name,
          last_name: profile?.last_name
        }
      });

    if (tokenError) {
      console.error('Erreur création token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la génération du token' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 4. Récupérer les informations de l'entreprise
    const { data: company } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', userCompanyId)
      .single();

    // 5. Récupérer les paramètres SMTP/Email de l'entreprise
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('company_id', userCompanyId)
      .single();

    // Déterminer quelle clé API Resend utiliser
    let resendApiKey = Deno.env.get("LEAZR_RESEND_API");
    let fromEmail = 'noreply@leazr.co';
    let fromName = 'Leazr';

    if (smtpSettings && smtpSettings.resend_api_key && smtpSettings.resend_api_key.trim() !== '') {
      console.log('Utilisation de la clé API Resend de l\'entreprise');
      resendApiKey = smtpSettings.resend_api_key;
      fromEmail = smtpSettings.from_email || fromEmail;
      fromName = smtpSettings.from_name || fromName;
    } else {
      console.log('Utilisation de la clé API Resend de fallback (LEAZR_RESEND_API)');
    }

    if (!resendApiKey) {
      console.error('Aucune clé API Resend disponible');
      return new Response(
        JSON.stringify({ error: 'Configuration API Resend manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    // 6. Récupérer le template d'email
    const { data: emailTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('company_id', userCompanyId)
      .eq('type', 'password_reset')
      .single();

    // 7. Préparer le contenu de l'email
    // Déterminer l'URL de base à partir de l'en-tête de la requête
    const origin = req.headers.get('origin') || req.headers.get('referer');
    let APP_URL = 'https://preview--leazr.lovable.app'; // Fallback par défaut
    
    if (origin) {
      try {
        const originUrl = new URL(origin);
        APP_URL = originUrl.origin;
        console.log('URL détectée depuis origin:', APP_URL);
      } catch (e) {
        console.log('Impossible de parser origin, utilisation du fallback:', APP_URL);
      }
    } else {
      console.log('Pas d\'origin détecté, utilisation du fallback:', APP_URL);
    }
    
    const resetUrl = `${APP_URL}/update-password?token=${resetToken}&type=password_reset`;
    console.log('URL de réinitialisation générée:', resetUrl);
    
    let emailContent = emailTemplate?.html_content || `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Réinitialisation de votre mot de passe</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
              <!-- Header avec logo -->
              <tr>
                  <td style="padding: 40px 20px; text-align: center; background-color: #3b82f6;">
                      ${company?.logo_url ? `
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 100%;">
                          <tr>
                              <td style="text-align: center; padding-bottom: 20px;">
                                  <img src="${company.logo_url}" alt="${company.name || 'Logo'}" style="max-height: 60px; max-width: 200px; height: auto; width: auto; display: block; margin: 0 auto;">
                              </td>
                          </tr>
                      </table>
                      ` : ''}
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${company?.name || 'Leazr'}</h1>
                  </td>
              </tr>
              
              <!-- Contenu principal -->
              <tr>
                  <td style="padding: 40px 20px;">
                      <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Réinitialisation de votre mot de passe</h2>
                      <p>Bonjour ${profile?.first_name || ''},</p>
                      <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte ${company?.name || ''}.</p>
                      <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
                      <div style="text-align: center; margin: 30px 0;">
                          <a href="${resetUrl}" style="background-color: #2d618f; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Réinitialiser mon mot de passe</a>
                      </div>
                      <p>Ce lien expirera dans 1 heure.</p>
                      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>
                      <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">Cordialement,<br>L'équipe ${company?.name || ''}</p>
                  </td>
              </tr>
          </table>
      </body>
      </html>
    `;

    // Remplacer les variables dans le template
    emailContent = emailContent
      .replace(/\{\{first_name\}\}/g, profile?.first_name || '')
      .replace(/\{\{last_name\}\}/g, profile?.last_name || '')
      .replace(/\{\{client_name\}\}/g, `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || email)
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{company_name\}\}/g, company?.name || '')
      .replace(/\{\{company_logo\}\}/g, company?.logo_url || '')
      .replace(/\{\{reset_url\}\}/g, resetUrl)
      .replace(/\{\{reset_link\}\}/g, resetUrl);

    // 8. Envoyer l'email via Resend
    const emailResult = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [email],
      subject: emailTemplate?.subject || 'Réinitialisation de votre mot de passe',
      html: emailContent,
    });

    console.log('Email de réinitialisation envoyé:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Un email de réinitialisation a été envoyé via Resend'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('Erreur dans custom-password-reset:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

serve(handler);