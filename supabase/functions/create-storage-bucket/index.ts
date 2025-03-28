
// Fonction Edge pour créer un bucket de stockage Supabase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Activer le mode log détaillé
const DEBUG = true;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Gestion des requêtes OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    // Accès aux variables d'environnement
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Variables d'environnement manquantes");
    }

    // Créer un client Supabase avec le rôle de service
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === "POST") {
      // Lire le body de la requête
      const requestData = await req.json();
      const bucketName = requestData.bucketName;

      if (!bucketName) {
        throw new Error("Nom du bucket manquant");
      }

      // Vérifier si le bucket existe déjà
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Erreur lors de la vérification des buckets: ${listError.message}`);
      }

      const bucketExists = buckets.some(bucket => bucket.name === bucketName);
      
      if (bucketExists) {
        if (DEBUG) console.log(`Le bucket ${bucketName} existe déjà`);
        return new Response(
          JSON.stringify({ success: true, message: `Le bucket ${bucketName} existe déjà` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      // Création du bucket
      if (DEBUG) console.log(`Tentative de création du bucket: ${bucketName}`);
      
      const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
      });

      if (createError) {
        if (createError.message.includes("already exists")) {
          if (DEBUG) console.log(`Le bucket ${bucketName} existe déjà`);
          return new Response(
            JSON.stringify({ success: true, message: `Le bucket ${bucketName} existe déjà` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            }
          );
        }
        throw new Error(`Erreur lors de la création du bucket: ${createError.message}`);
      }

      // Création des politiques pour le bucket
      try {
        // Politique pour permettre la lecture publique
        await supabase.rpc("create_storage_policy", {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_select`,
          definition: "TRUE",
          policy_type: "SELECT"
        });

        // Politique pour permettre l'insertion par tout utilisateur authentifié
        await supabase.rpc("create_storage_policy", {
          bucket_name: bucketName,
          policy_name: `${bucketName}_auth_insert`,
          definition: "auth.role() = 'authenticated'",
          policy_type: "INSERT"
        });

        // Politique pour permettre la modification par tout utilisateur authentifié
        await supabase.rpc("create_storage_policy", {
          bucket_name: bucketName,
          policy_name: `${bucketName}_auth_update`,
          definition: "auth.role() = 'authenticated'",
          policy_type: "UPDATE"
        });

        // Politique pour permettre la suppression par tout utilisateur authentifié
        await supabase.rpc("create_storage_policy", {
          bucket_name: bucketName,
          policy_name: `${bucketName}_auth_delete`,
          definition: "auth.role() = 'authenticated'",
          policy_type: "DELETE"
        });
      } catch (policyError) {
        if (DEBUG) console.log(`Erreur lors de la création des politiques: ${policyError}`);
        // Continuer même si la création des politiques échoue, car le bucket est déjà créé
      }

      if (DEBUG) console.log(`Bucket ${bucketName} créé avec succès`);
      
      return new Response(
        JSON.stringify({ success: true, message: `Bucket ${bucketName} créé avec succès` }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    } else {
      throw new Error(`Méthode HTTP non supportée: ${req.method}`);
    }
  } catch (error) {
    if (DEBUG) console.error(`Erreur: ${error.message}`);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
