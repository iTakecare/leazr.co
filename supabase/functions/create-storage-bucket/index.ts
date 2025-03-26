
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
    const supabaseAdmin = createClient(
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
    
    console.log(`Tentative de création du bucket: ${bucket_name}`);
    
    // Vérifier d'abord si le bucket existe déjà
    try {
      const { data: existingBucket } = await supabaseAdmin.storage.getBucket(bucket_name);
      
      if (existingBucket) {
        console.log(`Le bucket ${bucket_name} existe déjà`);
        return new Response(
          JSON.stringify({ success: true, bucket: bucket_name, message: "Bucket already exists" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (checkError) {
      // Si l'erreur n'est pas "bucket not found", alors il y a un autre problème
      if (!checkError.message?.includes("not found")) {
        console.error("Error checking bucket:", checkError);
      }
    }
    
    // Créer le bucket s'il n'existe pas
    try {
      const { data, error } = await supabaseAdmin.storage
        .createBucket(bucket_name, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
      
      if (error) {
        if (error.message === 'The resource already exists') {
          console.log(`Le bucket ${bucket_name} existe déjà (conflit)`);
          return new Response(
            JSON.stringify({ success: true, bucket: bucket_name, message: "Bucket already exists" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.error("Error creating bucket:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Bucket ${bucket_name} créé avec succès`);
    } catch (createError) {
      if (createError.message?.includes("already exists")) {
        console.log(`Le bucket ${bucket_name} existe déjà (exception)`);
        return new Response(
          JSON.stringify({ success: true, bucket: bucket_name, message: "Bucket already exists" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error("Error creating bucket:", createError);
      return new Response(
        JSON.stringify({ error: createError.message || "Unknown error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Créer les politiques d'accès
    try {
      console.log("Création des politiques pour le bucket");
      
      // Utiliser une requête SQL pour créer les politiques
      const createPoliciesQuery = `
        BEGIN;
        -- Supprimer les politiques existantes pour éviter les erreurs
        DROP POLICY IF EXISTS "${bucket_name}_public_select" ON storage.objects;
        DROP POLICY IF EXISTS "${bucket_name}_authenticated_insert" ON storage.objects;
        DROP POLICY IF EXISTS "${bucket_name}_authenticated_update" ON storage.objects;
        DROP POLICY IF EXISTS "${bucket_name}_authenticated_delete" ON storage.objects;
        
        -- Créer les nouvelles politiques
        CREATE POLICY "${bucket_name}_public_select" 
        ON storage.objects 
        FOR SELECT 
        USING (bucket_id = '${bucket_name}');
        
        CREATE POLICY "${bucket_name}_authenticated_insert" 
        ON storage.objects 
        FOR INSERT 
        WITH CHECK (bucket_id = '${bucket_name}' AND auth.role() = 'authenticated');
        
        CREATE POLICY "${bucket_name}_authenticated_update" 
        ON storage.objects 
        FOR UPDATE 
        USING (bucket_id = '${bucket_name}' AND auth.role() = 'authenticated');
        
        CREATE POLICY "${bucket_name}_authenticated_delete" 
        ON storage.objects 
        FOR DELETE 
        USING (bucket_id = '${bucket_name}' AND auth.role() = 'authenticated');
        COMMIT;
      `;
      
      // Exécuter les requêtes SQL via rpc
      await supabaseAdmin.rpc('execute_sql', { sql: createPoliciesQuery });
      
      console.log("Politiques créées avec succès");
    } catch (policyError) {
      console.error("Error creating policies (continuing anyway):", policyError);
      // Continuer même si la création des politiques a échoué
    }
    
    return new Response(
      JSON.stringify({ success: true, bucket: bucket_name }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
