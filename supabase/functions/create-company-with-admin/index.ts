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

    // Vérifier si l'utilisateur existe déjà ET a déjà un profil complet
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some(user => user.email === adminEmail);
    
    if (userExists) {
      // Vérifier si l'utilisateur a déjà un profil avec une entreprise
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', existingUser.users.find(u => u.email === adminEmail)?.id)
        .single();
      
      if (existingProfile && existingProfile.company_id) {
        throw new Error(`Un utilisateur avec l'email ${adminEmail} existe déjà et a déjà un profil`);
      }
      
      console.log(`Utilisateur ${adminEmail} existe mais sans profil complet - on continue`);
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

    // Vérifier que l'isolation fonctionne - l'utilisateur ne doit voir que sa propre entreprise
    const { data: isolationCheck, error: isolationError } = await supabaseAdmin
      .from('company_data_isolation_check')
      .select('*')
      .eq('company_id', companyId);

    if (isolationError) {
      console.warn('Erreur lors de la vérification de l\'isolation:', isolationError);
    } else {
      console.log('Vérification de l\'isolation des données:', isolationCheck);
    }

    // Étape 3: Associer les modules sélectionnés
    if (selectedModules.length > 0) {
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
      }
    }

    // Étape 4: Envoyer l'email de bienvenue
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