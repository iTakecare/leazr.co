/**
 * GoCardless Resend Mandate Link
 * 
 * Resends the mandate signature link to the client email
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { 
  checkRateLimit, 
  getRateLimitIdentifier, 
  rateLimitHeaders,
  GOCARDLESS_RATE_LIMITS 
} from "../_shared/gocardless/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = 'https://cifbetjefyfocafanlhv.supabase.co';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Session invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting - stricter for emails
    const identifier = getRateLimitIdentifier(req, user.id);
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin, 
      identifier, 
      'gocardless-resend-mandate-link',
      { maxRequests: 5, windowMinutes: 60 } // 5 resends per hour
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de renvois. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const { contractId, email: overrideEmail } = await req.json();

    if (!contractId) {
      return new Response(
        JSON.stringify({ error: 'contractId est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contract with client email and flow URL
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        company_id,
        client_name,
        gocardless_billing_request_flow_url,
        sepa_status,
        clients (
          email,
          name
        )
      `)
      .eq('id', contractId)
      .maybeSingle();

    if (contractError || !contract) {
      console.error('[ResendMandateLink] Contract not found', { error: contractError?.message });
      return new Response(
        JSON.stringify({ error: 'Contrat non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (contract.sepa_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Aucune demande de mandat en attente pour ce contrat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contract.gocardless_billing_request_flow_url) {
      return new Response(
        JSON.stringify({ error: 'URL du flux de signature non disponible' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine recipient email
    const recipientEmail = overrideEmail || contract.clients?.email;
    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Aucun email de destination' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company info for email branding
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('name')
      .eq('id', contract.company_id)
      .maybeSingle();

    const companyName = company?.name || 'Leazr';
    const clientName = contract.clients?.name || contract.client_name || 'Client';

    // Initialize Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('[ResendMandateLink] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Service email non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Send email with mandate link
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Leazr <noreply@leazr.app>',
      to: [recipientEmail],
      subject: `Signature du mandat SEPA - ${companyName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Signature du mandat SEPA</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Bonjour ${clientName},</p>
            
            <p>${companyName} vous invite à signer votre mandat de prélèvement SEPA pour automatiser vos paiements mensuels.</p>
            
            <p>Ce processus sécurisé est géré par GoCardless, un prestataire de paiement agréé par la banque de France.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contract.gocardless_billing_request_flow_url}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Signer le mandat SEPA
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Ce lien est valide pendant 7 jours. Si vous avez des questions, n'hésitez pas à contacter ${companyName}.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #999; text-align: center;">
              Cet email a été envoyé par ${companyName} via la plateforme Leazr.<br>
              Si vous n'avez pas demandé ce mandat, vous pouvez ignorer cet email.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error('[ResendMandateLink] Email send failed', { error: emailError });
      return new Response(
        JSON.stringify({ error: 'Échec de l\'envoi de l\'email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[ResendMandateLink] Email sent successfully', { 
      contractId, 
      emailId: emailData?.id,
      to: recipientEmail.substring(0, 3) + '***'
    });

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ResendMandateLink] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
