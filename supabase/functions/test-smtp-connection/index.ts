
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SMTPConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  secure: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config } = await req.json() as { config: SMTPConfig };
    
    console.log("Test de connexion SMTP avec les paramètres:", {
      host: config.host,
      port: config.port,
      username: config.username,
      fromEmail: config.from_email,
      secure: config.secure
    });

    // Créer un client SMTP avec les paramètres explicites
    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: parseInt(config.port),
        tls: config.secure,
        auth: {
          username: config.username,
          password: config.password,
        },
      },
    });

    try {
      // Approche simplifiée : envoyer un email text sans HTML d'abord
      await client.send({
        from: `${config.from_name} <${config.from_email}>`,
        to: config.username,
        subject: "Test de connexion SMTP réussi",
        content: `
Test de connexion SMTP réussi

Ceci est un email de test pour vérifier les paramètres SMTP.

Détails de la configuration:
- Serveur: ${config.host}
- Port: ${config.port}
- Utilisateur: ${config.username}
- Sécurisé: ${config.secure ? "Oui" : "Non"}
        `
      });

      // Fermer la connexion
      await client.close();
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Connexion SMTP réussie. Un email de test a été envoyé.",
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email de test:", emailError);
      
      // Fermer la connexion en cas d'erreur
      await client.close();
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur lors de l'envoi de l'email: ${emailError.message}`,
          details: JSON.stringify(emailError)
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    }
  } catch (error) {
    console.error("Erreur lors du test SMTP:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erreur lors du test SMTP: ${error.message}`,
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
