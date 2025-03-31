
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
    const { key } = await req.json();
    
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

    // Récupérer la valeur du secret (de façon sécurisée)
    const value = Deno.env.get(key);
    
    // Pour des raisons de sécurité, ne pas retourner le message d'erreur précis
    // si le secret n'existe pas
    return new Response(
      JSON.stringify({
        success: true,
        value: value || '',
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
        message: `Erreur lors de la récupération du secret: ${error.message}`,
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
