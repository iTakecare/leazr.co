import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateProspectRequest {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  plan?: string;
  selectedModules?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const {
      email,
      firstName,
      lastName,
      companyName,
      plan = 'starter',
      selectedModules = ['crm', 'offers', 'contracts']
    }: CreateProspectRequest = await req.json();

    console.log('Création du prospect:', { email, firstName, lastName, companyName, plan });

    // Appeler la fonction de création de prospect
    const { data: prospectData, error: prospectError } = await supabaseAdmin
      .rpc('create_prospect', {
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName,
        p_company_name: companyName,
        p_plan: plan,
        p_selected_modules: selectedModules
      });

    if (prospectError) {
      console.error('Erreur lors de la création du prospect:', prospectError);
      throw new Error(`Erreur de création: ${prospectError.message}`);
    }

    if (!prospectData || prospectData.length === 0) {
      throw new Error('Aucune donnée retournée par la fonction de création');
    }

    const { prospect_id, activation_token, trial_ends_at } = prospectData[0];
    console.log('Prospect créé avec succès:', { prospect_id, trial_ends_at });

    // Envoyer l'email d'activation (optionnel pour l'instant)
    try {
      const activationUrl = `${req.headers.get('origin')}/activate?token=${activation_token}`;
      
      // TODO: Implémenter l'envoi d'email d'activation
      console.log('URL d\'activation:', activationUrl);
      
    } catch (emailError) {
      console.warn('Erreur lors de l\'envoi de l\'email d\'activation:', emailError);
      // Ne pas faire échouer la création du prospect si l'email échoue
    }

    return new Response(
      JSON.stringify({
        success: true,
        prospectId: prospect_id,
        activationToken: activation_token,
        trialEndsAt: trial_ends_at,
        message: 'Essai gratuit de 14 jours créé avec succès'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Erreur dans create-prospect:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur inconnue'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);