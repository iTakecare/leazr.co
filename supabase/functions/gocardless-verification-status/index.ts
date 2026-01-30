/**
 * GoCardless Verification Status
 * Checks creditor verification status from GoCardless API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  GoCardlessClient,
  checkRateLimit, 
  getRateLimitIdentifier, 
  rateLimitHeaders,
  GOCARDLESS_RATE_LIMITS 
} from "../_shared/gocardless/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Rate limiting
    const identifier = getRateLimitIdentifier(req, user.id);
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin, 
      identifier, 
      'gocardless-verification-status',
      GOCARDLESS_RATE_LIMITS.verificationStatus
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders(rateLimitResult, GOCARDLESS_RATE_LIMITS.verificationStatus),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur non trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = profile.company_id;

    // Get GoCardless client for this tenant
    let gcClient: GoCardlessClient;
    try {
      gcClient = await GoCardlessClient.fromConnection(supabaseAdmin, companyId);
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Aucune connexion GoCardless active',
          connected: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch creditor verification status
    let verificationStatus: string = 'unknown';
    let verificationUrl: string | null = null;
    
    try {
      const creditor = await gcClient.getCreditor();
      
      verificationStatus = (creditor?.verification_status as string) || 'unknown';
      
      // Build verification URL if needed
      if (verificationStatus === 'action_required' || verificationStatus === 'pending') {
        const environment = gcClient.environmentValue;
        const dashboardBase = environment === 'live'
          ? 'https://manage.gocardless.com'
          : 'https://manage-sandbox.gocardless.com';
        verificationUrl = `${dashboardBase}/organisation/settings`;
      }
    } catch (apiError) {
      console.error('[VerificationStatus] API error', { 
        error: apiError instanceof Error ? apiError.message : 'Unknown' 
      });
      // Return cached status if API fails
    }

    // Update cached status
    const checkedAt = new Date().toISOString();
    await supabaseAdmin
      .from('gocardless_connections')
      .update({
        verification_status: verificationStatus,
        verification_checked_at: checkedAt
      })
      .eq('company_id', companyId);

    // Get full connection details
    const { data: connection } = await supabaseAdmin
      .from('gocardless_connections')
      .select('organisation_id, environment, connected_at, status')
      .eq('company_id', companyId)
      .single();

    return new Response(
      JSON.stringify({
        connected: true,
        status: connection?.status || 'unknown',
        environment: connection?.environment || 'sandbox',
        organisationId: connection?.organisation_id,
        connectedAt: connection?.connected_at,
        verificationStatus,
        verificationCheckedAt: checkedAt,
        verificationUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[VerificationStatus] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
