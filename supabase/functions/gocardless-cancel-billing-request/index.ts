/**
 * GoCardless Cancel Billing Request
 * 
 * Cancels a pending mandate request for a contract
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

    // Rate limiting
    const identifier = getRateLimitIdentifier(req, user.id);
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin, 
      identifier, 
      'gocardless-cancel-billing-request',
      GOCARDLESS_RATE_LIMITS.createMandate
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders(rateLimitResult, GOCARDLESS_RATE_LIMITS.createMandate),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const { contractId } = await req.json();

    if (!contractId) {
      return new Response(
        JSON.stringify({ error: 'contractId est requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contract with billing request info
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        company_id,
        gocardless_billing_request_id,
        sepa_status
      `)
      .eq('id', contractId)
      .maybeSingle();

    if (contractError || !contract) {
      console.error('[CancelBillingRequest] Contract not found', { error: contractError?.message });
      return new Response(
        JSON.stringify({ error: 'Contrat non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!contract.gocardless_billing_request_id) {
      return new Response(
        JSON.stringify({ error: 'Aucune demande de mandat en cours pour ce contrat' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (contract.sepa_status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Seules les demandes en attente peuvent être annulées' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = contract.company_id;

    // Get GoCardless client for this tenant
    let gcClient: GoCardlessClient;
    try {
      gcClient = await GoCardlessClient.fromConnection(supabaseAdmin, companyId);
    } catch (error) {
      console.error('[CancelBillingRequest] No GoCardless connection', { error: error instanceof Error ? error.message : 'Unknown' });
      return new Response(
        JSON.stringify({ error: 'Aucune connexion GoCardless active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancel the billing request via GoCardless API
    try {
      await gcClient.request(
        'POST',
        `/billing_requests/${contract.gocardless_billing_request_id}/actions/cancel`,
        { data: { metadata: { cancelled_by: user.id, cancelled_at: new Date().toISOString() } } }
      );
    } catch (error) {
      // If already cancelled or fulfilled, that's OK
      console.warn('[CancelBillingRequest] GoCardless cancel may have failed', { 
        error: error instanceof Error ? error.message : 'Unknown'
      });
    }

    // Update billing request flow status
    await supabaseAdmin
      .from('gocardless_billing_request_flows')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('contract_id', contractId)
      .eq('billing_request_id', contract.gocardless_billing_request_id);

    // Reset contract SEPA fields
    await supabaseAdmin
      .from('contracts')
      .update({ 
        sepa_status: 'none',
        gocardless_billing_request_id: null,
        gocardless_billing_request_flow_id: null,
        gocardless_billing_request_flow_url: null,
        gocardless_mandate_status: null
      })
      .eq('id', contractId);

    console.log('[CancelBillingRequest] Successfully cancelled', { contractId });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CancelBillingRequest] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
