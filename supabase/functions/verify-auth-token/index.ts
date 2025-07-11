import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface VerifyTokenRequest {
  token: string;
  newPassword?: string; // Only for password reset tokens
}

serve(async (req: Request) => {
  console.log("Verify auth token - Request received:", req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { token, newPassword }: VerifyTokenRequest = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the token
    const { data: authToken, error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .select('*')
      .eq('token', token)
      .is('used_at', null) // Not used yet
      .gt('expires_at', new Date().toISOString()) // Not expired
      .single();

    if (tokenError || !authToken) {
      console.error("Token non trouvé ou expiré:", tokenError);
      return new Response(
        JSON.stringify({ error: 'Token invalide ou expiré' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get user
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filters: { email: authToken.user_email }
    });

    if (!existingUser?.users || existingUser.users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const user = existingUser.users[0];

    // Handle different token types
    if (authToken.token_type === 'signup') {
      // Confirm user email
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error("Erreur lors de la confirmation de l'email:", confirmError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de l\'activation du compte' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Mark token as used
      await supabase
        .from('custom_auth_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      // Send welcome email (account activated)
      await sendWelcomeEmail(supabase, authToken, user, req);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Compte activé avec succès',
          action: 'account_activated'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else if (authToken.token_type === 'password_reset') {
      if (!newPassword) {
        return new Response(
          JSON.stringify({ error: 'Nouveau mot de passe requis' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Update user password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Erreur lors de la mise à jour du mot de passe:", updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour du mot de passe' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Mark token as used
      await supabase
        .from('custom_auth_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Mot de passe mis à jour avec succès',
          action: 'password_updated'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } else if (authToken.token_type === 'email_verification') {
      // Confirm user email
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
      );

      if (confirmError) {
        console.error("Erreur lors de la confirmation de l'email:", confirmError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la vérification de l\'email' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Mark token as used
      await supabase
        .from('custom_auth_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', token);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email vérifié avec succès',
          action: 'email_verified'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Type de token non supporté' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("Erreur dans verify-auth-token:", error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendWelcomeEmail(supabase: any, authToken: any, user: any, req: Request) {
  try {
    // Get company information
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, primary_color, logo_url')
      .eq('id', authToken.company_id)
      .single();

    if (!company) return;

    // Get email template for account activated
    const { data: emailTemplate } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('company_id', authToken.company_id)
      .eq('type', 'account_activated')
      .eq('active', true)
      .single();

    if (!emailTemplate) return;

    // Get SMTP settings for the company
    const { data: smtpSettings } = await supabase
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name')
      .eq('company_id', authToken.company_id)
      .eq('enabled', true)
      .single();

    if (!smtpSettings) return;

    // Prepare template variables
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const baseUrl = origin.replace(/\/$/, '');
    
    const userName = authToken.metadata?.first_name 
      ? `${authToken.metadata.first_name} ${authToken.metadata.last_name || ''}`.trim()
      : authToken.user_email.split('@')[0];

    const templateVariables = {
      user_name: userName,
      company_name: company.name,
      primary_color: company.primary_color || '#3b82f6',
      company_logo: company.logo_url || '',
      login_url: `${baseUrl}/login`
    };

    // Render email content
    const { data: renderedSubject } = await supabase.rpc('render_email_template', {
      template_content: emailTemplate.subject,
      variables: templateVariables
    });

    const { data: renderedContent } = await supabase.rpc('render_email_template', {
      template_content: emailTemplate.html_content,
      variables: templateVariables
    });

    // Send email using Resend
    const resend = new Resend(smtpSettings.resend_api_key);
    
    await resend.emails.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: [authToken.user_email],
      subject: renderedSubject || emailTemplate.subject,
      html: renderedContent || emailTemplate.html_content
    });

    console.log("Email de bienvenue envoyé avec succès");
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de bienvenue:", error);
  }
}