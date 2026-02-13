
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { requireElevatedAccess } from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ['admin', 'super_admin'],
      rateLimit: {
        endpoint: 'delete-user',
        maxRequests: 20,
        windowSeconds: 60,
        identifierPrefix: 'delete-user',
      },
    });

    if (!access.ok) {
      return access.response;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Clés d'environnement manquantes");
      return new Response(
        JSON.stringify({ error: "Configuration incomplète du serveur" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Initialize the Supabase client with the service role key for admin privileges
    const supabaseAdmin = access.context.supabaseAdmin || createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const { user_id } = await req.json();
    
    // Validate input
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Tentative de suppression de l'utilisateur: ${user_id}`);
    
    // Récupérer les informations de l'utilisateur avant suppression pour l'email
    let userEmail = null;
    let userName = null;
    let companyId = null;
    let entityType = null;
    
    try {
      // Récupérer les infos du profil
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('first_name, last_name, company_id, role')
        .eq('id', user_id)
        .single();
      
      if (profile) {
        userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        companyId = profile.company_id;
        entityType = profile.role;

        if (
          !access.context.isServiceRole &&
          access.context.role !== 'super_admin' &&
          (!companyId || access.context.companyId !== companyId)
        ) {
          return new Response(
            JSON.stringify({ error: 'Cross-company user deletion is forbidden' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          );
        }
      } else if (
        !access.context.isServiceRole &&
        access.context.role !== 'super_admin'
      ) {
        return new Response(
          JSON.stringify({ error: 'Target user profile not found in your scope' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }
      
      // Récupérer l'email depuis auth.users
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (userData?.user) {
        userEmail = userData.user.email;
      }
    } catch (error) {
      console.log('Erreur lors de la récupération des infos utilisateur:', error);
    }
    
    // First clean up related entities
    // Update related tables to remove user_id references
    const tables = ['clients', 'partners', 'ambassadors'];
    
    for (const table of tables) {
      try {
        // Vérifier d'abord si des enregistrements existent
        const { data: existingRecords, error: selectError } = await supabaseAdmin
          .from(table)
          .select('id')
          .eq('user_id', user_id);
          
        if (selectError) {
          console.log(`Error checking ${table}: ${selectError.message}`);
          continue;
        }
        
        if (existingRecords && existingRecords.length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from(table)
            .update({
              user_id: null,
              has_user_account: false,
              user_account_created_at: null
            })
            .eq('user_id', user_id);
            
          if (updateError) {
            console.log(`Error updating ${table}: ${updateError.message}`);
          } else {
            console.log(`Association utilisateur supprimée dans ${table} (${existingRecords.length} enregistrements)`);
          }
        } else {
          console.log(`Aucun enregistrement trouvé dans ${table} pour l'utilisateur ${user_id}`);
        }
      } catch (err) {
        console.log(`Exception when updating ${table}: ${err.message}`);
      }
    }
    
    // Delete the user's profile
    try {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', user_id);
        
      if (profileError) {
        console.log(`Error deleting profile: ${profileError.message}`);
      } else {
        console.log(`Profil utilisateur supprimé`);
      }
    } catch (err) {
      console.log(`Exception when deleting profile: ${err.message}`);
    }
    
    // Delete the user with admin supabase client (primary method)
    console.log("Attempting to delete user via admin.deleteUser method");
    
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    
    if (error) {
      console.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
      // Si l'utilisateur n'existe pas, considérer cela comme un succès
      if (error.message && (error.message.includes('User not found') || error.message.includes('not found'))) {
        console.log(`L'utilisateur ${user_id} n'existe plus, suppression considérée comme réussie`);
      } else {
        return new Response(
          JSON.stringify({ error: error.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    } else {
      console.log(`Utilisateur ${user_id} supprimé avec succès`);
    }
    
    // Envoyer l'email de notification de suppression
    if (userEmail && userName && companyId && entityType) {
      try {
        console.log('Envoi de l\'email de notification de suppression...');
        const { error: emailError } = await supabaseAdmin.functions.invoke('send-account-deleted-email', {
          body: {
            userEmail,
            userName,
            companyId,
            entityType
          }
        });
        
        if (emailError) {
          console.log('Erreur lors de l\'envoi de l\'email de suppression:', emailError);
        } else {
          console.log('Email de suppression envoyé avec succès');
        }
      } catch (emailErr) {
        console.log('Exception lors de l\'envoi de l\'email:', emailErr);
      }
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error(`Exception non gérée:`, error);
    console.error(`Stack trace:`, error.stack);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur inconnue' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
