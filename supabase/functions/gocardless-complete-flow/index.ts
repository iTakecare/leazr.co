/**
 * GoCardless Complete Flow
 * 
 * Called after customer completes the billing request flow
 * Creates subscription and stores mandate in dedicated tables
 * Multi-tenant aware with idempotency support
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
    // Rate limiting (no auth required for this endpoint - called from redirect)
    const identifier = getRateLimitIdentifier(req);
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin, 
      identifier, 
      'gocardless-complete-flow',
      GOCARDLESS_RATE_LIMITS.completeFlow
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez plus tard.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders(rateLimitResult, GOCARDLESS_RATE_LIMITS.completeFlow),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const { billingRequestId, contractId } = await req.json();

    if (!billingRequestId || !contractId) {
      return new Response(
        JSON.stringify({ error: 'billingRequestId et contractId sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contract to determine company_id (tenant scoping)
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('id, company_id, monthly_payment, contract_start_date, client_id')
      .eq('id', contractId)
      .maybeSingle();

    if (contractError || !contract) {
      console.error('[CompleteFlow] Contract not found', { error: contractError?.message });
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
      console.error('[CompleteFlow] No GoCardless connection', { error: error instanceof Error ? error.message : 'Unknown' });
      return new Response(
        JSON.stringify({ error: 'Aucune connexion GoCardless active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch billing request status
    console.log('[CompleteFlow] Fetching billing request', { billingRequestId });
    
    let billingRequest: Record<string, unknown>;
    try {
      const brResponse = await gcClient.getBillingRequest(billingRequestId);
      billingRequest = brResponse.billing_requests as Record<string, unknown>;
    } catch (error) {
      console.error('[CompleteFlow] Failed to fetch billing request', { 
        error: error instanceof Error ? error.message : 'Unknown'
      });
      return new Response(
        JSON.stringify({ error: 'Impossible de récupérer la demande de mandat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brStatus = billingRequest.status as string;
    console.log('[CompleteFlow] Billing request status', { status: brStatus });

    // Check if flow is completed
    if (brStatus !== 'fulfilled') {
      return new Response(
        JSON.stringify({ 
          error: 'Le mandat n\'est pas encore validé',
          status: brStatus 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brLinks = billingRequest.links as Record<string, string>;
    const mandateId = brLinks?.mandate;
    const customerId = brLinks?.customer;

    if (!mandateId) {
      return new Response(
        JSON.stringify({ error: 'Aucun mandat trouvé dans la demande' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check idempotency - is this mandate already stored?
    const { data: existingMandate } = await supabaseAdmin
      .from('gocardless_mandates')
      .select('id')
      .eq('gocardless_mandate_id', mandateId)
      .eq('company_id', companyId)
      .maybeSingle();

    let localMandateId: string;

    if (existingMandate) {
      console.log('[CompleteFlow] Mandate already exists, skipping creation', { mandateId });
      localMandateId = existingMandate.id;
    } else {
      // Find end_customer_id if client exists
      let endCustomerId: string | null = null;
      if (contract.client_id) {
        const { data: endCustomer } = await supabaseAdmin
          .from('gocardless_end_customers')
          .select('id')
          .eq('client_id', contract.client_id)
          .eq('company_id', companyId)
          .maybeSingle();
        endCustomerId = endCustomer?.id || null;
      }

      // Store mandate in dedicated table
      const { data: newMandate, error: mandateInsertError } = await supabaseAdmin
        .from('gocardless_mandates')
        .insert({
          company_id: companyId,
          end_customer_id: endCustomerId,
          contract_id: contractId,
          gocardless_mandate_id: mandateId,
          status: 'submitted',
          scheme: 'sepa_core'
        })
        .select('id')
        .single();

      if (mandateInsertError) {
        console.error('[CompleteFlow] Failed to store mandate', { error: mandateInsertError.message });
        // Continue anyway - subscription is more important
      }

      localMandateId = newMandate?.id || '';
    }

    // Calculate subscription start date (1st of next month)
    const now = new Date();
    let startDate = contract.contract_start_date 
      ? new Date(contract.contract_start_date)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Ensure start date is in the future
    if (startDate <= now) {
      startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];
    const monthlyPaymentCents = Math.round((contract.monthly_payment || 0) * 100);

    // Create subscription with idempotency key
    const idempotencyKey = `subscription-${contractId}-${mandateId}`;
    let subscriptionId: string | null = null;

    if (monthlyPaymentCents > 0) {
      console.log('[CompleteFlow] Creating subscription', { 
        amount: monthlyPaymentCents, 
        startDate: startDateStr 
      });

      try {
        const subResponse = await gcClient.createSubscription(
          mandateId,
          monthlyPaymentCents,
          'EUR',
          'monthly',
          1, // day of month
          startDateStr,
          { contract_id: contractId, company_id: companyId },
          idempotencyKey
        );

        subscriptionId = subResponse.subscriptions.id as string;
        console.log('[CompleteFlow] Subscription created', { subscriptionId });

        // Store subscription in dedicated table
        await supabaseAdmin
          .from('gocardless_subscriptions')
          .insert({
            company_id: companyId,
            mandate_id: localMandateId || null,
            contract_id: contractId,
            gocardless_subscription_id: subscriptionId,
            amount_cents: monthlyPaymentCents,
            currency: 'EUR',
            interval_unit: 'monthly',
            day_of_month: 1,
            start_date: startDateStr,
            status: 'active'
          });

      } catch (error) {
        // Log but don't fail - mandate is still valid
        console.error('[CompleteFlow] Subscription creation failed', { 
          error: error instanceof Error ? error.message : 'Unknown'
        });
      }
    }

    // Update billing request flow status
    await supabaseAdmin
      .from('gocardless_billing_request_flows')
      .update({ status: 'completed' })
      .eq('billing_request_id', billingRequestId)
      .eq('company_id', companyId);

    // Update contract for backward compatibility
    const contractUpdate: Record<string, unknown> = {
      gocardless_mandate_id: mandateId,
      gocardless_customer_id: customerId,
      gocardless_mandate_status: 'submitted',
      gocardless_mandate_created_at: new Date().toISOString()
    };

    if (subscriptionId) {
      contractUpdate.gocardless_subscription_id = subscriptionId;
    }

    await supabaseAdmin
      .from('contracts')
      .update(contractUpdate)
      .eq('id', contractId);

    console.log('[CompleteFlow] Complete', { 
      mandateId, 
      subscriptionId,
      companyId: companyId.substring(0, 8)
    });

    return new Response(
      JSON.stringify({
        success: true,
        mandateId,
        subscriptionId,
        message: 'Domiciliation SEPA configurée avec succès'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CompleteFlow] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
