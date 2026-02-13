
// Fonction Edge Supabase pour créer un bucket de paramètres du site
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { requireElevatedAccess } from "../_shared/security.ts";

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
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Méthode non supportée" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
      );
    }

    const access = await requireElevatedAccess(req, corsHeaders, {
      allowedRoles: ["super_admin"],
      rateLimit: {
        endpoint: "create-site-settings-bucket",
        maxRequests: 5,
        windowSeconds: 60,
        identifierPrefix: "create-site-settings-bucket",
      },
    });

    if (!access.ok) {
      return access.response;
    }

    const supabaseClient = access.context.supabaseAdmin;

    const body = await req.json().catch(() => ({}));
    const { bucketName = "site-settings" } = body || {};

    // This function is only meant to manage the site-settings bucket.
    if (bucketName !== "site-settings") {
      return new Response(
        JSON.stringify({ error: "Bucket non autorisé" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

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
