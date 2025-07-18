
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCompanyRequest {
  companyName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  plan: string;
  selectedModules: string[];
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
      companyName,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
      plan,
      selectedModules
    }: CreateCompanyRequest = await req.json();

    console.log('Création sécurisée de l\'entreprise:', { companyName, adminEmail, plan });

    // Vérifier si l'utilisateur existe déjà
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(user => user.email === adminEmail);
    
    if (userExists) {
      console.log(`Utilisateur avec l'email ${adminEmail} existe déjà`);
      throw new Error(`Un utilisateur avec l'email ${adminEmail} existe déjà`);
    }

    // Étape 1: Créer l'utilisateur avec le client admin
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // Confirmer automatiquement l'email
      user_metadata: {
        first_name: adminFirstName,
        last_name: adminLastName,
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

    // Étape 2: Créer l'entreprise directement
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        name: companyName,
        plan: plan,
        is_active: true,
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 jours
      })
      .select('id')
      .single();

    if (companyError) {
      console.error('Erreur lors de la création de l\'entreprise:', companyError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erreur lors de la création de l'entreprise: ${companyError.message}`);
    }

    const companyId = company.id;

    // Étape 3: Créer le profil utilisateur
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        first_name: adminFirstName,
        last_name: adminLastName,
        role: 'admin',
        company_id: companyId
      });

    if (profileError) {
      console.error('Erreur lors de la création du profil:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('companies').delete().eq('id', companyId);
      throw new Error(`Erreur lors de la création du profil: ${profileError.message}`);
    }
    console.log('Entreprise et profil créés avec succès:', { companyId, userId: authData.user.id });

    // Étape 4: Associer les modules sélectionnés (validation sécurisée)
    if (selectedModules && selectedModules.length > 0) {
      try {
        // Vérifier que les modules existent
        const { data: modules, error: modulesQueryError } = await supabaseAdmin
          .from('modules')
          .select('id, slug')
          .in('slug', selectedModules);

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
        } else {
          console.warn('Aucun module valide trouvé pour:', selectedModules);
        }
      } catch (moduleError) {
        console.warn('Erreur lors du traitement des modules:', moduleError);
        // On continue même si l'association des modules échoue
      }
    }

    // Étape 5: Envoyer l'email de bienvenue (optionnel)
    try {
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-trial-welcome-email', {
        body: {
          type: 'welcome',
          companyName: companyName,
          adminEmail: adminEmail,
          adminFirstName: adminFirstName,
          adminLastName: adminLastName,
          companyId: companyId
        }
      });

      if (emailError) {
        console.warn('Erreur lors de l\'envoi de l\'email:', emailError);
      } else {
        console.log('Email de bienvenue envoyé avec succès');
      }
    } catch (emailError) {
      console.warn('Erreur lors de l\'envoi de l\'email:', emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        companyId: companyId,
        userId: authData.user.id,
        message: 'Entreprise et utilisateur créés avec succès'
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
    console.error('Erreur dans create-company-with-admin:', error);
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
