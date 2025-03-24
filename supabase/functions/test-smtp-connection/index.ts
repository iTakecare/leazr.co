
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
      secure: config.secure
    });

    // Déterminer si c'est un serveur OVH
    const isOvhServer = config.host.includes('.mail.ovh.');
    console.log(`Serveur détecté: ${isOvhServer ? 'OVH' : 'Autre'}, secure: ${config.secure}`);

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
      console.log("Tentative d'envoi de mail de test...");
      
      // Format RFC-compliant pour le champ From
      const fromField = `"${config.from_name}" <${config.from_email}>`;
      console.log("From field format:", fromField);
      
      // Utiliser text au lieu de content pour la compatibilité
      await client.send({
        from: fromField,
        to: config.username,
        subject: "Test SMTP",
        text: "Test de connexion SMTP réussi",
        html: "<p>Test de connexion SMTP réussi</p>"
      });
      
      await client.close();
      console.log("Mail de test envoyé avec succès");
      
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
      
      try {
        await client.close();
      } catch (closeError) {
        console.error("Erreur supplémentaire lors de la fermeture du client:", closeError);
      }
      
      // Préparer des suggestions spécifiques basées sur l'erreur
      let suggestion = "";
      const errorStr = emailError.toString();
      
      if (isOvhServer && parseInt(config.port) === 587) {
        if (config.secure) {
          suggestion = "Pour OVH sur le port 587, essayez de désactiver l'option TLS.";
        } else if (errorStr.includes("BadResource") || errorStr.includes("startTls")) {
          suggestion = "Pour OVH sur le port 587, essayez d'activer l'option TLS.";
        }
      } else if (errorStr.includes("corrupt message") || errorStr.includes("InvalidContentType")) {
        if (config.secure) {
          suggestion = "Essayez de désactiver l'option TLS car le serveur semble ne pas la supporter.";
        } else {
          suggestion = "Essayez d'activer l'option TLS car le serveur semble la requérir.";
        }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur lors de l'envoi de l'email: ${emailError.message}`,
          details: errorStr,
          suggestion: suggestion
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
