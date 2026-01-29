import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOCARDLESS_BASE_URL = Deno.env.get('GOCARDLESS_ENVIRONMENT') === 'live' 
  ? 'https://api.gocardless.com'
  : 'https://api-sandbox.gocardless.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      'https://cifbetjefyfocafanlhv.supabase.co',
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Session invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { contractId, returnUrl } = await req.json();

    if (!contractId || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'contractId et returnUrl sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le contrat avec les informations client
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        id,
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
      console.error('Erreur contrat:', contractError);
      return new Response(
        JSON.stringify({ error: 'Contrat non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = contract.clients;
    const accessToken = Deno.env.get('GOCARDLESS_ACCESS_TOKEN');

    if (!accessToken) {
      console.error('GOCARDLESS_ACCESS_TOKEN non configuré');
      return new Response(
        JSON.stringify({ error: 'Configuration GoCardless manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const gcHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'GoCardless-Version': '2015-07-06',
      'Content-Type': 'application/json',
    };

    let customerId = contract.gocardless_customer_id;

    // Créer un customer GoCardless si nécessaire
    if (!customerId) {
      const customerPayload = {
        customers: {
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
            client_id: contract.client_id || ''
          }
        }
      };

      console.log('Création customer GoCardless:', JSON.stringify(customerPayload));

      const customerResponse = await fetch(`${GOCARDLESS_BASE_URL}/customers`, {
        method: 'POST',
        headers: gcHeaders,
        body: JSON.stringify(customerPayload)
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('Erreur création customer:', errorText);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création du client GoCardless' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customerData = await customerResponse.json();
      customerId = customerData.customers.id;

      // Sauvegarder le customer_id dans le contrat
      await supabase
        .from('contracts')
        .update({ gocardless_customer_id: customerId })
        .eq('id', contractId);
    }

    // Créer un Billing Request
    const billingRequestPayload = {
      billing_requests: {
        mandate_request: {
          scheme: 'sepa_core',
          currency: 'EUR'
        },
        metadata: {
          contract_id: contractId
        }
      }
    };

    console.log('Création billing request:', JSON.stringify(billingRequestPayload));

    const billingRequestResponse = await fetch(`${GOCARDLESS_BASE_URL}/billing_requests`, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify(billingRequestPayload)
    });

    if (!billingRequestResponse.ok) {
      const errorText = await billingRequestResponse.text();
      console.error('Erreur création billing request:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création de la demande de mandat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const billingRequestData = await billingRequestResponse.json();
    const billingRequestId = billingRequestData.billing_requests.id;

    // Créer un Billing Request Flow
    const flowPayload = {
      billing_request_flows: {
        redirect_uri: returnUrl,
        exit_uri: returnUrl,
        links: {
          billing_request: billingRequestId,
          customer: customerId
        },
        lock_customer_details: false,
        lock_bank_account: false,
        show_redirect_buttons: true,
        show_success_redirect_button: true
      }
    };

    console.log('Création billing request flow:', JSON.stringify(flowPayload));

    const flowResponse = await fetch(`${GOCARDLESS_BASE_URL}/billing_request_flows`, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify(flowPayload)
    });

    if (!flowResponse.ok) {
      const errorText = await flowResponse.text();
      console.error('Erreur création flow:', errorText);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la création du flux de paiement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const flowData = await flowResponse.json();
    const flowId = flowData.billing_request_flows.id;
    const authorisationUrl = flowData.billing_request_flows.authorisation_url;

    // Sauvegarder le billing_request_id dans le contrat
    await supabase
      .from('contracts')
      .update({ 
        gocardless_billing_request_id: billingRequestId,
        gocardless_mandate_status: 'pending_submission'
      })
      .eq('id', contractId);

    console.log('Flow créé avec succès:', { flowId, billingRequestId, authorisationUrl });

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
    console.error('Erreur inattendue:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
