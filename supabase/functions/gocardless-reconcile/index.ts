/**
 * GoCardless Reconcile
 * Manual admin action to sync mandates/payments from GoCardless to local DB
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

interface ReconcileResult {
  mandatesUpdated: number;
  paymentsUpdated: number;
  subscriptionsUpdated: number;
  errors: string[];
}

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

    // Rate limiting (strict for admin action)
    const identifier = getRateLimitIdentifier(req, user.id);
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin, 
      identifier, 
      'gocardless-reconcile',
      GOCARDLESS_RATE_LIMITS.reconcile
    );

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Trop de requêtes. Réessayez dans quelques minutes.' }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders(rateLimitResult, GOCARDLESS_RATE_LIMITS.reconcile),
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Get user's company and check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Profil utilisateur non trouvé' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only admins can reconcile
    if (profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Action réservée aux administrateurs' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = profile.company_id;

    // Get GoCardless client
    let gcClient: GoCardlessClient;
    try {
      gcClient = await GoCardlessClient.fromConnection(supabaseAdmin, companyId);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Aucune connexion GoCardless active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ReconcileResult = {
      mandatesUpdated: 0,
      paymentsUpdated: 0,
      subscriptionsUpdated: 0,
      errors: []
    };

    // 1. Reconcile mandates
    try {
      const { mandates } = await gcClient.listMandates();
      
      for (const mandate of mandates) {
        const mandateId = mandate.id as string;
        const status = mandate.status as string;
        
        // Update local mandate if exists
        const { error: updateError } = await supabaseAdmin
          .from('gocardless_mandates')
          .update({
            status,
            last_event_at: new Date().toISOString()
          })
          .eq('gocardless_mandate_id', mandateId)
          .eq('company_id', companyId);

        if (!updateError) {
          result.mandatesUpdated++;
        }

        // Also update contracts table for backward compatibility
        await supabaseAdmin
          .from('contracts')
          .update({ gocardless_mandate_status: status })
          .eq('gocardless_mandate_id', mandateId);
      }
    } catch (error) {
      result.errors.push(`Mandates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 2. Reconcile payments (last 100)
    try {
      const { payments } = await gcClient.listPayments();
      
      for (const payment of payments.slice(0, 100)) {
        const paymentId = payment.id as string;
        const status = payment.status as string;
        
        const { error: updateError } = await supabaseAdmin
          .from('gocardless_payments')
          .update({ status })
          .eq('gocardless_payment_id', paymentId)
          .eq('company_id', companyId);

        if (!updateError) {
          result.paymentsUpdated++;
        }
      }
    } catch (error) {
      result.errors.push(`Payments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('[Reconcile] Completed', {
      companyId: companyId.substring(0, 8),
      ...result
    });

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
        message: `Réconciliation terminée: ${result.mandatesUpdated} mandats, ${result.paymentsUpdated} paiements mis à jour`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Reconcile] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
