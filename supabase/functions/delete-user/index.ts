
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
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
    
    // First clean up related entities
    // Update related tables to remove user_id references
    const tables = ['clients', 'partners', 'ambassadors'];
    
    for (const table of tables) {
      try {
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
          console.log(`Association utilisateur supprimée dans ${table}`);
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
    
    // Delete the user with admin supabase client
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    
    if (error) {
      console.error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Utilisateur ${user_id} supprimé avec succès`);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error(`Exception non gérée: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
