/**
 * GoCardless OAuth Callback
 * Exchanges authorization code for access token with CSRF validation
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  encryptToken, 
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
      'gocardless-oauth-callback',
      GOCARDLESS_RATE_LIMITS.oauthCallback
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders(rateLimitResult, GOCARDLESS_RATE_LIMITS.oauthCallback),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Parse request
    const { code, state } = await req.json();

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: 'Code et state sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate state token (CSRF protection)
    const { data: oauthState, error: stateError } = await supabaseAdmin
      .from('gocardless_oauth_states')
      .select('*')
      .eq('state_token', state)
      .is('used_at', null)
      .maybeSingle();

    if (stateError || !oauthState) {
      console.error('[OAuth] Invalid or missing state token');
      return new Response(
        JSON.stringify({ error: 'Token de sécurité invalide ou expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(oauthState.expires_at) < new Date()) {
      console.error('[OAuth] State token expired');
      
      // Mark as used anyway to prevent replay
      await supabaseAdmin
        .from('gocardless_oauth_states')
        .update({ used_at: new Date().toISOString() })
        .eq('id', oauthState.id);
      
      return new Response(
        JSON.stringify({ error: 'La session OAuth a expiré. Veuillez réessayer.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark state as used immediately (prevent replay attacks)
    await supabaseAdmin
      .from('gocardless_oauth_states')
      .update({ used_at: new Date().toISOString() })
      .eq('id', oauthState.id);

    const companyId = oauthState.company_id;
    const environment = oauthState.environment as GoCardlessEnvironment;

    // Get OAuth configuration
    const clientId = Deno.env.get('GOCARDLESS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOCARDLESS_CLIENT_SECRET');
    const redirectUri = Deno.env.get('GOCARDLESS_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('[OAuth] Missing configuration');
      return new Response(
        JSON.stringify({ error: 'Configuration OAuth manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange code for access token
    const oauthUrls = getOAuthUrls(environment);
    
    const tokenResponse = await fetch(oauthUrls.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[OAuth] Token exchange failed', { 
        status: tokenResponse.status,
        // Don't log full error body in production
        errorPrefix: errorText.substring(0, 100)
      });
      return new Response(
        JSON.stringify({ error: 'Échec de l\'authentification GoCardless' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Extract data from response
    const accessToken = tokenData.access_token;
    const organisationId = tokenData.organisation_id;

    if (!accessToken || !organisationId) {
      console.error('[OAuth] Invalid token response', { 
        hasAccessToken: !!accessToken, 
        hasOrgId: !!organisationId 
      });
      return new Response(
        JSON.stringify({ error: 'Réponse OAuth invalide' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypt the access token
    let encryptedToken: string;
    try {
      encryptedToken = await encryptToken(accessToken);
    } catch (encryptError) {
      console.error('[OAuth] Token encryption failed', { 
        error: encryptError instanceof Error ? encryptError.message : 'Unknown' 
      });
      return new Response(
        JSON.stringify({ error: 'Erreur de sécurité lors du stockage' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert connection (handles reconnection case)
    const { data: connection, error: upsertError } = await supabaseAdmin
      .from('gocardless_connections')
      .upsert({
        company_id: companyId,
        environment: environment,
        access_token_encrypted: encryptedToken,
        organisation_id: organisationId,
        connected_at: new Date().toISOString(),
        status: 'active',
        verification_status: null,
        verification_checked_at: null
      }, {
        onConflict: 'company_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[OAuth] Failed to save connection', { error: upsertError.message });
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la sauvegarde de la connexion' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[OAuth] Connection established', {
      companyId: companyId.substring(0, 8),
      organisationId: organisationId.substring(0, 8),
      environment
    });

    return new Response(
      JSON.stringify({
        success: true,
        organisationId,
        environment,
        message: 'Connexion GoCardless établie avec succès'
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
