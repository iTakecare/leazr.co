
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { bucket_name } = await req.json();
    
    if (!bucket_name) {
      return new Response(
        JSON.stringify({ error: "Missing bucket_name" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Créer le bucket s'il n'existe pas
    const { data, error } = await supabaseClient
      .storage
      .createBucket(bucket_name, {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
    
    if (error && error.message !== 'Bucket already exists') {
      console.error("Error creating bucket:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Créer les politiques d'accès public si le bucket a été créé
    if (!error || error.message === 'Bucket already exists') {
      try {
        // Policies for SELECT
        await supabaseClient
          .rpc('create_storage_policy', { 
            bucket_name, 
            policy_name: `${bucket_name}_public_select`, 
            definition: 'TRUE', 
            policy_type: 'SELECT' 
          });
        
        // Policies for INSERT
        await supabaseClient
          .rpc('create_storage_policy', { 
            bucket_name, 
            policy_name: `${bucket_name}_public_insert`, 
            definition: 'TRUE', 
            policy_type: 'INSERT' 
          });
        
        // Policies for UPDATE
        await supabaseClient
          .rpc('create_storage_policy', { 
            bucket_name, 
            policy_name: `${bucket_name}_public_update`, 
            definition: 'TRUE', 
            policy_type: 'UPDATE' 
          });
        
        // Policies for DELETE
        await supabaseClient
          .rpc('create_storage_policy', { 
            bucket_name, 
            policy_name: `${bucket_name}_public_delete`, 
            definition: 'TRUE', 
            policy_type: 'DELETE' 
          });
      } catch (policyError) {
        console.error("Error creating policies:", policyError);
        // Continue even if policy creation failed
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, bucket: bucket_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
