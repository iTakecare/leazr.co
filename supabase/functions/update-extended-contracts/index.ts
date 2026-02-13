import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getClientIp, requireElevatedAccess } from "../_shared/security.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Démarrage de la vérification des contrats à prolonger...");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('UPDATE_EXTENDED_CONTRACTS_SECRET');
    const providedCronSecret = req.headers.get('x-cron-secret');

    let supabase = createClient(supabaseUrl, supabaseServiceKey);
    let isAuthorized = false;

    if (cronSecret && providedCronSecret && providedCronSecret === cronSecret) {
      isAuthorized = true;

      const clientIp = getClientIp(req);
      const cronRateLimit = await checkRateLimit(
        supabase,
        `update-extended-contracts-cron:${clientIp}`,
        'update-extended-contracts-cron',
        { maxRequests: 10, windowSeconds: 60 }
      );

      if (!cronRateLimit.allowed) {
        return new Response(
          JSON.stringify({ error: 'Too many requests' }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-RateLimit-Remaining': cronRateLimit.remaining.toString(),
            }
          }
        );
      }
    } else {
      const access = await requireElevatedAccess(req, corsHeaders, {
        allowedRoles: ['super_admin'],
        rateLimit: {
          endpoint: 'update-extended-contracts-admin',
          maxRequests: 10,
          windowSeconds: 60,
          identifierPrefix: 'update-extended-contracts-admin',
        },
      });

      if (!access.ok) {
        return access.response;
      }

      isAuthorized = true;
      supabase = access.context.supabaseAdmin;
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    console.log("📅 Date du jour:", today);

    // Find active contracts with end date passed
    const { data: expiredContracts, error: fetchError } = await supabase
      .from('contracts')
      .select('id, client_name, contract_end_date, company_id')
      .eq('status', 'active')
      .not('contract_end_date', 'is', null)
      .lt('contract_end_date', today);

    if (fetchError) {
      console.error("❌ Erreur lors de la récupération des contrats:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 ${expiredContracts?.length || 0} contrat(s) actif(s) avec date de fin dépassée`);

    if (!expiredContracts || expiredContracts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Aucun contrat à prolonger",
          updated_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const contract of expiredContracts) {
      console.log(`🔧 Traitement du contrat ${contract.id} (${contract.client_name})`);

      // Update contract status to extended
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ 
          status: 'extended',
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id);

      if (updateError) {
        console.error(`❌ Erreur mise à jour contrat ${contract.id}:`, updateError);
        errors.push(`Contrat ${contract.id}: ${updateError.message}`);
        continue;
      }

      // Create workflow log entry
      const { error: logError } = await supabase
        .from('contract_workflow_logs')
        .insert({
          contract_id: contract.id,
          previous_status: 'active',
          new_status: 'extended',
          reason: `Contrat prolongé automatiquement - date de fin dépassée (${contract.contract_end_date})`,
          user_name: 'Système automatique'
        });

      if (logError) {
        console.error(`⚠️ Erreur création log pour contrat ${contract.id}:`, logError);
        // Don't fail the whole operation for log errors
      }

      updatedCount++;
      console.log(`✅ Contrat ${contract.id} marqué comme prolongé`);
    }

    console.log(`🏁 Terminé: ${updatedCount}/${expiredContracts.length} contrat(s) mis à jour`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${updatedCount} contrat(s) marqué(s) comme prolongé(s)`,
        updated_count: updatedCount,
        total_checked: expiredContracts.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("❌ Exception dans update-extended-contracts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
