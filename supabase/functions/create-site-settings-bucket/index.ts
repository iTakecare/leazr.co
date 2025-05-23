
// Fonction Edge Supabase pour créer un bucket de paramètres du site
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req) => {
  // Gérer les requêtes OPTIONS (pour CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Extraire les informations de la requête
  try {
    // Créer le client Supabase avec les clés d'environnement
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { bucketName = "site-settings" } = body;

    console.log(`Tentative de création du bucket: ${bucketName}`);

    // Vérifier si le bucket existe déjà
    const { data: buckets, error: listError } = await supabaseClient.storage.listBuckets();
    
    if (listError) {
      console.error("Erreur lors de la vérification des buckets:", listError);
      return new Response(
        JSON.stringify({ error: "Erreur lors de la vérification des buckets", details: listError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Si le bucket existe déjà, retourner un succès
    if (buckets.some(bucket => bucket.name === bucketName)) {
      console.log(`Le bucket ${bucketName} existe déjà.`);
      return new Response(
        JSON.stringify({ message: `Le bucket ${bucketName} existe déjà.`, success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
    // Créer le bucket
    const { data: createData, error: createError } = await supabaseClient.storage.createBucket(bucketName, {
      public: true,
    });
    
    if (createError) {
      console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
      return new Response(
        JSON.stringify({ error: `Erreur lors de la création du bucket ${bucketName}`, details: createError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Créer des politiques pour permettre l'accès public en lecture
    // Ces opérations sont mieux gérées par SQL, mais nous pouvons les exécuter via RPC si nécessaire
    
    console.log(`Bucket ${bucketName} créé avec succès.`);
    return new Response(
      JSON.stringify({ message: `Bucket ${bucketName} créé avec succès`, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    console.error("Erreur:", error);
    return new Response(
      JSON.stringify({ error: "Une erreur s'est produite", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
