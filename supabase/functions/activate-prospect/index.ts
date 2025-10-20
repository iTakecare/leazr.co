import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActivateProspectRequest {
  activationToken: string;
  password: string;
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
      activationToken,
      password
    }: ActivateProspectRequest = await req.json();

    console.log('Activation du prospect avec token:', activationToken);

    // Récupérer les informations du prospect
    const { data: prospectData, error: prospectError } = await supabaseAdmin
      .from('prospects')
      .select('*')
      .eq('activation_token', activationToken)
      .eq('status', 'active')
      .gt('trial_ends_at', new Date().toISOString())
      .single();

    if (prospectError || !prospectData) {
      console.error('Prospect non trouvé ou expiré:', prospectError);
      throw new Error('Token d\'activation invalide ou expiré');
    }

    console.log('Prospect trouvé:', prospectData.email);

    // Créer l'utilisateur dans auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: prospectData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: prospectData.first_name,
        last_name: prospectData.last_name,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Erreur lors de la création de l\'utilisateur:', authError);
      throw new Error(`Erreur d'authentification: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Erreur lors de la création de l\'utilisateur');
    }

    console.log('Utilisateur créé avec succès:', authData.user.id);

    // Créer l'entreprise et le profil complet via la fonction existante
    const { data: companyResult, error: companyError } = await supabaseAdmin
      .rpc('create_company_with_admin_complete', {
        p_company_name: prospectData.company_name,
        p_admin_email: prospectData.email,
        p_admin_first_name: prospectData.first_name,
        p_admin_last_name: prospectData.last_name,
        p_plan: prospectData.plan
      });

    if (companyError) {
      console.error('Erreur lors de la création de l\'entreprise complète:', companyError);
      // Nettoyer l'utilisateur créé en cas d'erreur
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erreur lors de la création de l'entreprise: ${companyError.message}`);
    }

    if (!companyResult || companyResult.length === 0) {
      console.error('Aucun résultat retourné par la fonction de création d\'entreprise');
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error('Erreur lors de la création de l\'entreprise: aucun résultat');
    }

    const { company_id: companyId, user_id: userId } = companyResult[0];
    console.log('Entreprise et profil créés avec succès:', { companyId, userId });

    // Marquer le prospect comme converti
    const { error: updateError } = await supabaseAdmin
      .from('prospects')
      .update({
        status: 'converted',
        activated_at: new Date().toISOString(),
        converted_at: new Date().toISOString()
      })
      .eq('id', prospectData.id);

    if (updateError) {
      console.warn('Erreur lors de la mise à jour du prospect:', updateError);
    }

    // Associer les modules sélectionnés
    if (prospectData.selected_modules && prospectData.selected_modules.length > 0) {
      const { data: modules, error: modulesQueryError } = await supabaseAdmin
        .from('modules')
        .select('id, slug')
        .in('slug', prospectData.selected_modules);

      if (!modulesQueryError && modules && modules.length > 0) {
        const moduleAssociations = modules.map(module => ({
          company_id: companyId,
          module_id: module.id,
          enabled: true,
          activated_at: new Date().toISOString()
        }));

        const { error: modulesError } = await supabaseAdmin
          .from('company_modules')
          .insert(moduleAssociations);

        if (modulesError) {
          console.warn('Erreur lors de l\'association des modules:', modulesError);
        } else {
          console.log('Modules associés avec succès');
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        companyId: companyId,
        userId: userId,
        message: 'Compte activé avec succès'
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
    console.error('Erreur dans activate-prospect:', error);
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