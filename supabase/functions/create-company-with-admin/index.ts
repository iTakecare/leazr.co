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

    // Étape 2: Créer l'entreprise
    const { data: companyData, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert([{
        name: companyName,
        plan: plan,
        account_status: 'trial',
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 jours
        modules_enabled: selectedModules,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (companyError) {
      console.error('Erreur lors de la création de l\'entreprise:', companyError);
      // Nettoyer l'utilisateur créé en cas d'erreur
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erreur lors de la création de l'entreprise: ${companyError.message}`);
    }

    console.log('Entreprise créée avec succès:', companyData.id);

    // Étape 3: Mettre à jour le profil utilisateur avec l'ID de l'entreprise
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: companyData.id,
        role: 'admin'
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Erreur lors de la mise à jour du profil:', profileError);
      // Ne pas faire échouer si le profil n'est pas mis à jour
    }

    // Étape 4: Associer les modules sélectionnés
    if (selectedModules.length > 0) {
      const { data: modules, error: modulesQueryError } = await supabaseAdmin
        .from('modules')
        .select('id, slug')
        .in('slug', selectedModules);

      if (!modulesQueryError && modules && modules.length > 0) {
        const moduleAssociations = modules.map(module => ({
          company_id: companyData.id,
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

    // Étape 5: Envoyer l'email de bienvenue
    try {
      const { error: emailError } = await supabaseAdmin.functions.invoke('send-trial-welcome-email', {
        body: {
          type: 'welcome',
          companyName: companyName,
          adminEmail: adminEmail,
          adminFirstName: adminFirstName,
          adminLastName: adminLastName,
          companyId: companyData.id
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
        companyId: companyData.id,
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