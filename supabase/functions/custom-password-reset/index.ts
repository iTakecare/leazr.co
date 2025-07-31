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
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    // Créer un client Supabase avec la clé de service pour accès admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, companyId }: PasswordResetRequest = await req.json();

    console.log(`Demande de réinitialisation de mot de passe pour ${email}`);

    // 1. Vérifier si l'utilisateur existe
    const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !userData.user) {
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
      .eq('id', userData.user.id)
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
        email,
        token: resetToken,
        token_type: 'password_reset',
        company_id: userCompanyId,
        expires_at: expiresAt.toISOString(),
        metadata: {
          user_id: userData.user.id,
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
      .select('name')
      .eq('id', userCompanyId)
      .single();

    // 5. Récupérer les paramètres SMTP/Email de l'entreprise
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('company_id', userCompanyId)
      .single();

    if (!smtpSettings) {
      console.error('Pas de paramètres SMTP trouvés pour l\'entreprise');
      return new Response(
        JSON.stringify({ error: 'Configuration email manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 6. Récupérer le template d'email
    const { data: emailTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('company_id', userCompanyId)
      .eq('type', 'password_reset')
      .single();

    // 7. Préparer le contenu de l'email
    const resetUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/rest/v1', '')}/update-password?token=${resetToken}&type=password_reset`;
    
    let emailContent = emailTemplate?.content || `
      <h1>Réinitialisation de votre mot de passe</h1>
      <p>Bonjour ${profile?.first_name || ''},</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte ${company?.name || ''}.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <p><a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez ce message.</p>
      <p>Cordialement,<br>L'équipe ${company?.name || ''}</p>
    `;

    // Remplacer les variables dans le template
    emailContent = emailContent
      .replace(/\{\{first_name\}\}/g, profile?.first_name || '')
      .replace(/\{\{last_name\}\}/g, profile?.last_name || '')
      .replace(/\{\{email\}\}/g, email)
      .replace(/\{\{company_name\}\}/g, company?.name || '')
      .replace(/\{\{reset_url\}\}/g, resetUrl);

    // 8. Envoyer l'email via Resend
    const emailResult = await resend.emails.send({
      from: smtpSettings.from_email || 'noreply@leazr.co',
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