
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

// Fonction pour générer un UUID simple
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let companyId: string | null = null;
  let userId: string | null = null;

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

    console.log('🚀 Début création entreprise:', { companyName, plan, modulesCount: selectedModules?.length || 0 });

    // Générer un email unique avec UUID pour éviter tout conflit
    const uniqueId = generateUUID().substring(0, 8);
    const finalAdminEmail = adminEmail || `admin-${uniqueId}@temp.leazr.co`;

    console.log('📧 Email admin généré:', finalAdminEmail);

    // ÉTAPE 1: Créer l'entreprise
    console.log('🏢 Création de l\'entreprise...');
    try {
      const { data: company, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: companyName,
          plan: plan || 'starter',
          is_active: true,
          trial_starts_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id')
        .single();

      if (companyError) {
        console.error('❌ Erreur création entreprise:', companyError);
        throw new Error(`Erreur lors de la création de l'entreprise: ${companyError.message}`);
      }

      companyId = company.id;
      console.log('✅ Entreprise créée:', companyId);

    } catch (error) {
      console.error('❌ Échec création entreprise:', error);
      throw new Error(`Erreur création entreprise: ${error.message}`);
    }

    // ÉTAPE 2: Créer l'utilisateur admin
    console.log('👤 Création de l\'utilisateur admin...');
    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: finalAdminEmail,
        password: adminPassword || 'TempPassword123!',
        email_confirm: true,
        user_metadata: {
          first_name: adminFirstName || 'Admin',
          last_name: adminLastName || 'User',
          role: 'admin'
        }
      });

      if (authError) {
        console.error('❌ Erreur création utilisateur:', authError);
        throw new Error(`Erreur création utilisateur: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Aucun utilisateur retourné lors de la création');
      }

      userId = authData.user.id;
      console.log('✅ Utilisateur créé:', userId);

    } catch (error) {
      console.error('❌ Échec création utilisateur:', error);
      
      // Rollback: supprimer l'entreprise créée
      if (companyId) {
        console.log('🔄 Rollback: suppression entreprise...');
        await supabaseAdmin.from('companies').delete().eq('id', companyId);
      }
      
      throw new Error(`Erreur création utilisateur: ${error.message}`);
    }

    // ÉTAPE 3: Créer le profil
    console.log('📝 Création du profil...');
    try {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          first_name: adminFirstName || 'Admin',
          last_name: adminLastName || 'User',
          role: 'admin',
          company_id: companyId
        });

      if (profileError) {
        console.error('❌ Erreur création profil:', profileError);
        throw new Error(`Erreur création profil: ${profileError.message}`);
      }

      console.log('✅ Profil créé avec succès');

    } catch (error) {
      console.error('❌ Échec création profil:', error);
      
      // Rollback: supprimer utilisateur et entreprise
      if (userId) {
        console.log('🔄 Rollback: suppression utilisateur...');
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      if (companyId) {
        console.log('🔄 Rollback: suppression entreprise...');
        await supabaseAdmin.from('companies').delete().eq('id', companyId);
      }
      
      throw new Error(`Erreur création profil: ${error.message}`);
    }

    // ÉTAPE 4: Modules (optionnel - ne pas faire échouer si ça ne marche pas)
    if (selectedModules && selectedModules.length > 0) {
      console.log('🔧 Association des modules...');
      try {
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
            console.warn('⚠️ Erreur modules (non bloquant):', modulesError);
          } else {
            console.log('✅ Modules associés:', modules.length);
          }
        } else {
          console.warn('⚠️ Aucun module trouvé pour:', selectedModules);
        }
      } catch (moduleError) {
        console.warn('⚠️ Erreur modules (ignorée):', moduleError);
      }
    }

    // ÉTAPE 5: Email de bienvenue (optionnel)
    try {
      console.log('📨 Envoi email de bienvenue...');
      await supabaseAdmin.functions.invoke('send-trial-welcome-email', {
        body: {
          type: 'welcome',
          companyName: companyName,
          adminEmail: finalAdminEmail,
          adminFirstName: adminFirstName || 'Admin',
          adminLastName: adminLastName || 'User',
          companyId: companyId
        }
      });
      console.log('✅ Email envoyé');
    } catch (emailError) {
      console.warn('⚠️ Erreur email (ignorée):', emailError);
    }

    console.log('🎉 Création terminée avec succès!');

    return new Response(
      JSON.stringify({
        success: true,
        companyId: companyId,
        userId: userId,
        adminEmail: finalAdminEmail,
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
    console.error('💥 ERREUR FATALE:', error);
    
    // Dernière tentative de nettoyage en cas d'erreur
    try {
      if (userId) {
        console.log('🔄 Nettoyage final: suppression utilisateur...');
        await (await createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )).auth.admin.deleteUser(userId);
      }
      if (companyId) {
        console.log('🔄 Nettoyage final: suppression entreprise...');
        await (await createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )).from('companies').delete().eq('id', companyId);
      }
    } catch (cleanupError) {
      console.error('⚠️ Erreur nettoyage:', cleanupError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Erreur inconnue',
        details: error.toString()
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
