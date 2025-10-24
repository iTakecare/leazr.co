import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { createErrorResponse } from '../_shared/errorHandler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SignupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
}

serve(async (req: Request) => {
  console.log("Custom signup - Request received:", req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { email, password, firstName, lastName, companyId }: SignupRequest = await req.json();
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email et mot de passe requis' }),
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

    // ✅ RATE LIMITING
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 'unknown';
    
    const rateLimit = await checkRateLimit(supabase, clientIp, 'custom-signup', 
      { maxRequests: 5, windowSeconds: 3600 });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de tentatives. Réessayez dans 1 heure.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect company ID from request origin if not provided
    let detectedCompanyId = companyId;
    if (!detectedCompanyId) {
      const origin = req.headers.get('origin') || req.headers.get('referer') || '';
      console.log("Origin for company detection:", origin);
      
      const { data: companyFromDomain } = await supabase.rpc('detect_company_from_domain', {
        request_origin: origin
      });
      
      detectedCompanyId = companyFromDomain;
      console.log("Detected company ID:", detectedCompanyId);
    }

    if (!detectedCompanyId) {
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
      .eq('id', detectedCompanyId)
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

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers({
      filters: { email }
    });

    // ✅ MASQUAGE ÉNUMÉRATION: Toujours retourner succès
    if (existingUser?.users && existingUser.users.length > 0) {
      console.log('⚠️ Compte existant:', email);
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Compte créé avec succès. Vérifiez votre email.',
          userId: 'pending',
          activationSent: true
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user without email confirmation (we'll handle it ourselves)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company_id: detectedCompanyId
      }
    });

    if (createError || !newUser.user) {
      console.error("Erreur lors de la création de l'utilisateur:", createError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du compte' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        first_name: firstName || '',
        last_name: lastName || '',
        role: 'client',
        company_id: detectedCompanyId
      });

    if (profileError) {
      console.error("Erreur lors de la création du profil:", profileError);
    }

    // Generate custom token for email verification
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expire in 24 hours

    const { error: tokenError } = await supabase
      .from('custom_auth_tokens')
      .insert({
        company_id: detectedCompanyId,
        user_email: email,
        token,
        token_type: 'signup',
        expires_at: expiresAt.toISOString(),
        metadata: {
          user_id: newUser.user.id,
          first_name: firstName,
          last_name: lastName
        }
      });

    if (tokenError) {
      console.error("Erreur lors de la création du token:", tokenError);
    }

    // Get email template for signup
    const { data: emailTemplate, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('company_id', detectedCompanyId)
      .eq('type', 'signup_welcome')
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
      .eq('company_id', detectedCompanyId)
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
    const activationLink = `${baseUrl}/auth/verify?token=${token}`;
    
    const templateVariables = {
      user_name: firstName ? `${firstName} ${lastName || ''}`.trim() : email.split('@')[0],
      company_name: company.name,
      primary_color: company.primary_color || '#3b82f6',
      company_logo: company.logo_url || '',
      activation_link: activationLink,
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

    console.log("Email d'activation envoyé:", emailResponse);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Compte créé avec succès. Vérifiez votre email pour l\'activer.',
        userId: newUser.user.id,
        activationSent: true
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("Erreur dans custom-signup:", error);
    return createErrorResponse(error, corsHeaders);
  }
});