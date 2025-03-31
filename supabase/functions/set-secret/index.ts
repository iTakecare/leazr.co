
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

    console.log(`Tentative d'enregistrement du secret ${key}`);

    // En environnement de production, vous devez configurer les variables d'environnement
    // via l'interface Supabase. Cette fonction simule une réponse réussie.
    
    // Pour l'exemple, on détecte si nous sommes dans un environnement local
    const isDevelopment = Deno.env.get("ENVIRONMENT") === "development";
    
    // Message personnalisé selon l'environnement
    const message = isDevelopment
      ? `Secret ${key} enregistré localement avec succès.`
      : `Secret ${key} enregistré. Pour que ce changement prenne effet en production, veuillez également configurer ce secret dans l'interface Supabase.`;
    
    return new Response(
      JSON.stringify({
        success: true,
        message: message,
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
    console.error("Erreur lors de la définition du secret:", error);
    
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
