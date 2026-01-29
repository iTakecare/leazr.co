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
    const supabase = createClient(
      'https://cifbetjefyfocafanlhv.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { billingRequestId, contractId } = await req.json();

    if (!billingRequestId || !contractId) {
      return new Response(
        JSON.stringify({ error: 'billingRequestId et contractId sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Récupérer le Billing Request pour obtenir les IDs
    console.log('Récupération billing request:', billingRequestId);

    const brResponse = await fetch(`${GOCARDLESS_BASE_URL}/billing_requests/${billingRequestId}`, {
      method: 'GET',
      headers: gcHeaders
    });

    if (!brResponse.ok) {
      const errorText = await brResponse.text();
      console.error('Erreur récupération billing request:', errorText);
      return new Response(
        JSON.stringify({ error: 'Impossible de récupérer la demande de mandat' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brData = await brResponse.json();
    const billingRequest = brData.billing_requests;

    console.log('Billing request status:', billingRequest.status);
    console.log('Billing request links:', billingRequest.links);

    // Vérifier que le flow est complété
    if (billingRequest.status !== 'fulfilled') {
      return new Response(
        JSON.stringify({ 
          error: 'Le mandat n\'est pas encore validé',
          status: billingRequest.status 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mandateId = billingRequest.links?.mandate;
    const customerId = billingRequest.links?.customer;

    if (!mandateId) {
      return new Response(
        JSON.stringify({ error: 'Aucun mandat trouvé dans la demande' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer le contrat pour avoir le montant mensuel
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, monthly_payment, contract_start_date')
      .eq('id', contractId)
      .maybeSingle();

    if (contractError || !contract) {
      console.error('Erreur contrat:', contractError);
      return new Response(
        JSON.stringify({ error: 'Contrat non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculer la date de début pour la subscription (1er du mois suivant)
    const now = new Date();
    const startDate = contract.contract_start_date 
      ? new Date(contract.contract_start_date)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // S'assurer que la date est dans le futur
    if (startDate <= now) {
      startDate.setMonth(startDate.getMonth() + 1);
      startDate.setDate(1);
    }

    const startDateStr = startDate.toISOString().split('T')[0];

    // Créer une subscription mensuelle
    const subscriptionPayload = {
      subscriptions: {
        amount: Math.round((contract.monthly_payment || 0) * 100), // en centimes
        currency: 'EUR',
        name: `Contrat ${contractId.substring(0, 8)}`,
        interval_unit: 'monthly',
        interval: 1,
        day_of_month: 1,
        start_date: startDateStr,
        links: {
          mandate: mandateId
        },
        metadata: {
          contract_id: contractId
        }
      }
    };

    console.log('Création subscription:', JSON.stringify(subscriptionPayload));

    const subResponse = await fetch(`${GOCARDLESS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: gcHeaders,
      body: JSON.stringify(subscriptionPayload)
    });

    if (!subResponse.ok) {
      const errorText = await subResponse.text();
      console.error('Erreur création subscription:', errorText);
      // On continue quand même pour mettre à jour le contrat avec le mandate_id
    }

    let subscriptionId = null;
    if (subResponse.ok) {
      const subData = await subResponse.json();
      subscriptionId = subData.subscriptions.id;
      console.log('Subscription créée:', subscriptionId);
    }

    // Mettre à jour le contrat avec toutes les informations GoCardless
    const updateData: Record<string, any> = {
      gocardless_mandate_id: mandateId,
      gocardless_customer_id: customerId,
      gocardless_mandate_status: 'submitted',
      gocardless_mandate_created_at: new Date().toISOString()
    };

    if (subscriptionId) {
      updateData.gocardless_subscription_id = subscriptionId;
    }

    const { error: updateError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId);

    if (updateError) {
      console.error('Erreur mise à jour contrat:', updateError);
    }

    console.log('Contrat mis à jour avec succès');

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
    console.error('Erreur inattendue:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
