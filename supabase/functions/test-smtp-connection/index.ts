
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
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      }
    });
  }

  try {
    const { config } = await req.json() as { config: SMTPConfig };
    
    console.log("Test de connexion SMTP avec les paramètres:", {
      host: config.host,
      port: config.port,
      username: config.username,
      secure: config.secure
    });

    // Determine if it's an OVH server
    const isOvhServer = config.host.includes('.mail.ovh.');
    const isPort587 = parseInt(config.port) === 587;
    console.log(`Serveur détecté: ${isOvhServer ? 'OVH' : 'Autre'}, Port: ${config.port}, secure: ${config.secure}`);

    // Adjust settings for OVH servers on port 587
    let finalTlsSetting = config.secure;
    if (isOvhServer && isPort587) {
      if (!config.secure) {
        console.log("Serveur OVH sur port 587 avec TLS désactivé, test avec forçage TLS activé");
        finalTlsSetting = true;
      }
    }

    console.log(`Configuration du client SMTP: TLS=${finalTlsSetting}`);
    const client = new SMTPClient({
      connection: {
        hostname: config.host,
        port: parseInt(config.port),
        tls: finalTlsSetting,
        auth: {
          username: config.username,
          password: config.password,
        },
      },
      debug: true, // Enable SMTP debugging
    });

    try {
      console.log("Tentative d'envoi de mail de test...");
      
      // Set a timeout for the entire operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Délai de connexion SMTP dépassé (10s)")), 10000);
      });
      
      // Format RFC-compliant for the From field
      const fromField = `"${config.from_name}" <${config.from_email}>`;
      console.log("From field format:", fromField);
      
      // Try sending test email with simple settings for maximum compatibility
      const emailResult = await Promise.race([
        client.send({
          from: fromField,
          to: config.username,
          subject: "Test SMTP",
          text: "Test de connexion SMTP réussi",
          html: "<p>Test de connexion SMTP réussi</p>"
        }),
        timeoutPromise
      ]);
      
      console.log("Résultat de l'envoi:", emailResult);
      
      await client.close();
      console.log("Mail de test envoyé avec succès");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Connexion SMTP réussie. Un email de test a été envoyé.",
          details: emailResult
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
        console.log("Client SMTP fermé après erreur");
      } catch (closeError) {
        console.error("Erreur supplémentaire lors de la fermeture du client:", closeError);
      }
      
      // Prepare specific suggestions based on the error
      let suggestion = "";
      const errorStr = emailError.toString();
      
      if (errorStr.includes("InvalidContentType") || errorStr.includes("corrupt message")) {
        if (config.secure) {
          suggestion = "Essayez de désactiver l'option TLS (secure: false) dans les paramètres SMTP.";
        } else {
          suggestion = "Essayez d'activer l'option TLS (secure: true) dans les paramètres SMTP.";
        }
      } else if (errorStr.includes("BadResource") || errorStr.includes("startTls")) {
        if (isOvhServer && isPort587) {
          if (config.secure) {
            suggestion = "Pour les serveurs OVH sur le port 587, essayez de désactiver l'option TLS.";
          } else {
            suggestion = "Pour les serveurs OVH sur le port 587, essayez d'activer l'option TLS.";
          }
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
          status: 200, // Use 200 to properly return the error message to client
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
        details: error.toString()
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
