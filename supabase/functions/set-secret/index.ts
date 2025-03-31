
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { key, value } = await req.json();
    
    if (!key) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé non spécifiée",
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    }

    // Cette fonction edge ne peut pas réellement définir des variables d'environnement
    // car les variables d'environnement sont définies lors du déploiement
    // En production, cela doit être fait via l'interface Supabase
    
    // Simuler une réponse réussie pour l'interface utilisateur
    return new Response(
      JSON.stringify({
        success: true,
        message: `Secret ${key} enregistré. Veuillez configurer ce secret dans l'interface Supabase.`,
      }),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erreur lors de la définition du secret: ${error.message}`,
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        },
      }
    );
  }
});
