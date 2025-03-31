
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    // Get the API key from the request or from the database
    const requestBody: RequestBody = await req.json().catch(() => ({}));
    
    // Créer un client Supabase avec les variables d'environnement
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variables d'environnement Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Récupérer les paramètres SMTP depuis la base de données
    const { data: smtpSettings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name')
      .eq('id', 1)
      .single();
    
    if (settingsError) {
      console.error("Erreur lors de la récupération des paramètres SMTP:", settingsError);
      throw new Error(`Erreur de base de données: ${settingsError.message}`);
    }
    
    if (!smtpSettings) {
      throw new Error("Paramètres SMTP non trouvés");
    }
    
    // Utiliser la clé API fournie ou celle récupérée de la base de données
    const key = requestBody.apiKey || smtpSettings.resend_api_key;
    
    if (!key) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend non configurée",
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
    
    const fromEmail = smtpSettings.from_email || "onboarding@resend.dev";
    const fromName = smtpSettings.from_name || "iTakecare";
    
    // Tester l'API en envoyant un email
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
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
