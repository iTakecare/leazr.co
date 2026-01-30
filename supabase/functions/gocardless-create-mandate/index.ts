/**
 * GoCardless Create Mandate
 * 
 * Multi-tenant aware mandate creation flow
 * Uses tenant's encrypted access token from gocardless_connections
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
      'gocardless-create-mandate',
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

    const { contractId, returnUrl } = await req.json();

    if (!contractId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'contractId et returnUrl sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contract with client info AND company_id for tenant scoping
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
        company_id,
        client_name,
        client_id,
        monthly_payment,
        gocardless_customer_id,
        clients (
          id,
          name,
          email,
          company,
          address,
          city,
          postal_code,
          country
        )
      `)
      .eq('id', contractId)
      .maybeSingle();

    if (contractError || !contract) {
      console.error('[CreateMandate] Contract not found', { error: contractError?.message });
      return new Response(
        JSON.stringify({ error: 'Contrat non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = contract.company_id;
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Contrat sans entreprise associée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get GoCardless client for this tenant
    let gcClient: GoCardlessClient;
    try {
      gcClient = await GoCardlessClient.fromConnection(supabaseAdmin, companyId);
    } catch (error) {
      console.error('[CreateMandate] No GoCardless connection', { error: error instanceof Error ? error.message : 'Unknown' });
      return new Response(
        JSON.stringify({ error: 'Aucune connexion GoCardless active pour cette entreprise' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = contract.clients;
    let customerId = contract.gocardless_customer_id;
    let endCustomerId: string | null = null;

    // Check for existing end customer in our database
    if (contract.client_id) {
      const { data: existingEndCustomer } = await supabaseAdmin
        .from('gocardless_end_customers')
        .select('id, gocardless_customer_id')
        .eq('client_id', contract.client_id)
        .eq('company_id', companyId)
        .maybeSingle();

      if (existingEndCustomer?.gocardless_customer_id) {
        customerId = existingEndCustomer.gocardless_customer_id;
        endCustomerId = existingEndCustomer.id;
      }
    }

    // Create GoCardless customer if needed
    if (!customerId) {
      console.log('[CreateMandate] Creating new GoCardless customer');
      
      const customerData = {
        email: client?.email || `contract-${contractId}@placeholder.com`,
        given_name: client?.name?.split(' ')[0] || contract.client_name?.split(' ')[0] || 'Client',
        family_name: client?.name?.split(' ').slice(1).join(' ') || contract.client_name?.split(' ').slice(1).join(' ') || '',
        company_name: client?.company || contract.client_name,
        address_line1: client?.address || '',
        city: client?.city || '',
        postal_code: client?.postal_code || '',
        country_code: client?.country || 'BE',
        metadata: {
          contract_id: contractId,
          client_id: contract.client_id || '',
          company_id: companyId
        }
      };

      try {
        const customerResponse = await gcClient.createCustomer(customerData);
        customerId = customerResponse.customers.id as string;
        
        // Store in gocardless_end_customers for future use
        if (contract.client_id) {
          const { data: newEndCustomer } = await supabaseAdmin
            .from('gocardless_end_customers')
            .insert({
              company_id: companyId,
              client_id: contract.client_id,
              gocardless_customer_id: customerId,
              email: customerData.email
            })
            .select('id')
            .single();
          
          endCustomerId = newEndCustomer?.id || null;
        }

        // Update contract with customer ID
        await supabaseAdmin
          .from('contracts')
          .update({ gocardless_customer_id: customerId })
          .eq('id', contractId);
          
      } catch (error) {
        console.error('[CreateMandate] Customer creation failed', { 
          error: error instanceof Error ? error.message : 'Unknown'
        });
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création du client GoCardless' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Billing Request
    console.log('[CreateMandate] Creating billing request');
    let billingRequestId: string;
    
    try {
      const brResponse = await gcClient.createBillingRequest(
        { scheme: 'sepa_core', currency: 'EUR' },
        { contract_id: contractId, company_id: companyId }
      );
      billingRequestId = brResponse.billing_requests.id as string;
    } catch (error) {
      console.error('[CreateMandate] Billing request creation failed', { 
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la demande de mandat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Billing Request Flow
    console.log('[CreateMandate] Creating billing request flow');
    let flowId: string;
    let authorisationUrl: string;
    
    try {
      const flowResponse = await gcClient.createBillingRequestFlow(
        billingRequestId,
        customerId,
        returnUrl,
        returnUrl
      );
      
      flowId = flowResponse.billing_request_flows.id as string;
      authorisationUrl = flowResponse.billing_request_flows.authorisation_url as string;
    } catch (error) {
      console.error('[CreateMandate] Flow creation failed', { 
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du flux de paiement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store billing request flow in dedicated table
    await supabaseAdmin
      .from('gocardless_billing_request_flows')
      .insert({
        company_id: companyId,
        contract_id: contractId,
        end_customer_id: endCustomerId,
        billing_request_id: billingRequestId,
        flow_id: flowId,
        status: 'pending'
      });

    // Update contract for backward compatibility
    await supabaseAdmin
      .from('contracts')
      .update({ 
        gocardless_billing_request_id: billingRequestId,
        gocardless_mandate_status: 'pending_submission'
      })
      .eq('id', contractId);

    console.log('[CreateMandate] Flow created successfully', { 
      flowId, 
      billingRequestId,
      companyId: companyId.substring(0, 8)
    });

    return new Response(
      JSON.stringify({
        success: true,
        authorisationUrl,
        billingRequestId,
        flowId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CreateMandate] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
