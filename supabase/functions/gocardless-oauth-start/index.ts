/**
 * GoCardless OAuth Start
 * Initiates the OAuth flow with CSRF protection
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getOAuthUrls, 
  checkRateLimit, 
  getRateLimitIdentifier, 
  rateLimitHeaders,
  GOCARDLESS_RATE_LIMITS 
} from "../_shared/gocardless/index.ts";
import type { GoCardlessEnvironment } from "../_shared/gocardless/index.ts";

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
    // Rate limiting
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin, 
      identifier, 
      'gocardless-oauth-start',
      GOCARDLESS_RATE_LIMITS.oauthStart
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders(rateLimitResult, GOCARDLESS_RATE_LIMITS.oauthStart),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

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

    // Parse request
    const { environment = 'sandbox' } = await req.json().catch(() => ({}));
    
    if (!['sandbox', 'live'].includes(environment)) {
      return new Response(
        JSON.stringify({ error: 'Environnement invalide. Utilisez "sandbox" ou "live".' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check required env vars
    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const redirectUri = Deno.env.get('GOCARDLESS_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      console.error('[OAuth] Missing configuration', { hasClientId: !!clientId, hasRedirectUri: !!redirectUri });
      return new Response(
        JSON.stringify({ error: 'Configuration OAuth manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate CSRF state token
    const stateToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store state with company binding
    const { error: stateError } = await supabaseAdmin
      .from('gocardless_oauth_states')
      .insert({
        state_token: stateToken,
        company_id: companyId,
        environment: environment as GoCardlessEnvironment,
        expires_at: expiresAt.toISOString()
      });

    if (stateError) {
      console.error('[OAuth] Failed to store state', { error: stateError.message });
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'initialisation OAuth' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build authorization URL
    const oauthUrls = getOAuthUrls(environment as GoCardlessEnvironment);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read_write',
      state: stateToken,
      // Prefill if we have company info
      // initial_view: 'login' // or 'signup'
    });

    const authorizeUrl = `${oauthUrls.authorizeUrl}?${params.toString()}`;

    console.log('[OAuth] Authorization URL generated', {
      companyId: companyId.substring(0, 8),
      environment,
      expiresAt: expiresAt.toISOString()
    });

    return new Response(
      JSON.stringify({
        authorizeUrl,
        expiresAt: expiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OAuth] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
