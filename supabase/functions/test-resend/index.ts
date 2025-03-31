
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  apiKey?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody: RequestBody = await req.json();
    const { apiKey } = requestBody;
    
    // Utiliser la clé API fournie ou celle stockée dans les variables d'environnement
    const key = apiKey || Deno.env.get("RESEND_API_KEY");
    
    if (!key) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend non trouvée",
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
    
    console.log("Test de connexion Resend...");
    
    const resend = new Resend(key);
    
    // Tester l'API en envoyant un email
    const { data, error } = await resend.emails.send({
      from: "iTakecare <onboarding@resend.dev>", // L'email onboarding est valide pour les tests
      to: "delivered@resend.dev", // Email de test fourni par Resend
      subject: "Test de connexion Resend",
      html: "<p>Ce message est un test de connexion à l'API Resend.</p>",
    });
    
    if (error) {
      console.error("Erreur lors du test Resend:", error);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur de connexion à Resend: ${error.message}`,
          details: error
        }),
        {
          status: 200, // Utiliser 200 pour permettre à l'interface de traiter l'erreur
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    }
    
    console.log("Test Resend réussi:", data);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Connexion Resend réussie. Un email de test a été envoyé.",
        data
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
    console.error("Erreur lors du test Resend:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erreur lors du test Resend: ${error.message}`,
        details: JSON.stringify(error)
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
