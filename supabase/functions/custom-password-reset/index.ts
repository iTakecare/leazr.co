import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PasswordResetRequest {
  email: string;
  companyId?: string;
}

serve(async (req: Request) => {
  console.log("Custom password reset - Request received:", req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email, companyId }: PasswordResetRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requis' }),
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

    // First, check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filters: { email }
    });

    if (!existingUser?.users || existingUser.users.length === 0) {
      // For security, we don't reveal if the email exists or not
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation.'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const user = existingUser.users[0];

    // Get user's company from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    let userCompanyId = profile?.company_id;

    // If no company in profile, try to detect from request origin
    if (!userCompanyId) {
      const origin = req.headers.get('origin') || req.headers.get('referer') || '';
      console.log("Origin for company detection:", origin);
      
      const { data: companyFromDomain } = await supabase.rpc('detect_company_from_domain', {
        request_origin: origin
      });
      
      userCompanyId = companyFromDomain || companyId;
    }

    if (!userCompanyId) {
      return new Response(
        JSON.stringify({ error: 'Impossible de déterminer l\'entreprise' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get company information
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, primary_color, logo_url')
      .eq('id', userCompanyId)
      .single();

    if (companyError || !company) {
      console.error("Erreur lors de la récupération de l'entreprise:", companyError);
      return new Response(
        JSON.stringify({ error: 'Entreprise non trouvée' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate custom token for password reset
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2); // Expire in 2 hours (more secure)

    const { error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .insert({
        company_id: userCompanyId,
        user_email: email,
        token,
        token_type: 'password_reset',
        expires_at: expiresAt.toISOString(),
        metadata: {
          user_id: user.id
        }
      });

    if (tokenError) {
      console.error("Erreur lors de la création du token:", tokenError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la génération du lien' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get email template for password reset
    const { data: emailTemplate, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('company_id', userCompanyId)
      .eq('type', 'password_reset')
      .eq('active', true)
      .single();

    if (templateError || !emailTemplate) {
      console.error("Template d'email non trouvé:", templateError);
      return new Response(
        JSON.stringify({ error: 'Configuration email manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get SMTP settings for the company
    const { data: smtpSettings, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name')
      .eq('company_id', userCompanyId)
      .eq('enabled', true)
      .single();

    if (smtpError || !smtpSettings) {
      console.error("Configuration SMTP non trouvée:", smtpError);
      return new Response(
        JSON.stringify({ error: 'Configuration email manquante' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare template variables
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const baseUrl = origin.replace(/\/$/, '');
    const resetLink = `${baseUrl}/auth/reset-password?token=${token}`;
    
    const userName = user.user_metadata?.first_name 
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
      : email.split('@')[0];

    const templateVariables = {
      user_name: userName,
      client_name: userName, // For backward compatibility
      company_name: company.name,
      primary_color: company.primary_color || '#3b82f6',
      company_logo: company.logo_url || '',
      reset_link: resetLink,
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
    
    const emailResponse = await resend.emails.send({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: [email],
      subject: renderedSubject || emailTemplate.subject,
      html: renderedContent || emailTemplate.html_content
    });

    console.log("Email de réinitialisation envoyé:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Erreur dans custom-password-reset:", error);
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