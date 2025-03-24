
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

    // We'll try up to 3 different configurations to find one that works
    const attempts = [];
    let success = false;
    let lastResult = null;
    let workingConfig = null;
    
    // First attempt: use the settings as provided
    attempts.push({
      tls: config.secure,
      description: "Configuration originale"
    });
    
    // Second attempt: opposite TLS setting
    attempts.push({
      tls: !config.secure,
      description: "TLS inversé"
    });
    
    // Third attempt: Only for specific server types
    if (isOvhServer && isPort587) {
      attempts.push({
        tls: true,
        description: "OVH Port 587 avec TLS forcé"
      });
    }
    
    for (let i = 0; i < attempts.length && !success; i++) {
      const attempt = attempts[i];
      console.log(`Tentative #${i+1}: ${attempt.description}, TLS=${attempt.tls}`);
      
      try {
        const client = new SMTPClient({
          connection: {
            hostname: config.host,
            port: parseInt(config.port),
            tls: attempt.tls,
            auth: {
              username: config.username,
              password: config.password,
            },
          },
          debug: true,
        });
        
        console.log(`Tentative #${i+1}: Client SMTP initialisé`);
        
        // Set a timeout for the operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Délai de connexion SMTP dépassé (10s)")), 10000);
        });
        
        // Format RFC-compliant for the From field
        const fromField = `"${config.from_name}" <${config.from_email}>`;
        console.log(`Tentative #${i+1}: From field format: ${fromField}`);
        
        // Try sending test email
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
        
        console.log(`Tentative #${i+1}: Email envoyé avec succès:`, emailResult);
        
        try {
          await client.close();
        } catch (closeErr) {
          console.warn(`Tentative #${i+1}: Erreur non critique lors de la fermeture du client:`, closeErr);
        }
        
        // Record the success and working configuration
        success = true;
        lastResult = emailResult;
        workingConfig = attempt;
        
        // No need to try other configurations
        break;
      } catch (error) {
        console.error(`Tentative #${i+1}: Échec -`, error);
        lastResult = error;
        
        // Wait a bit before trying the next configuration
        if (i < attempts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Connexion SMTP réussie avec ${workingConfig.description}. Un email de test a été envoyé.`,
          details: lastResult,
          workingConfig: workingConfig
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          },
        }
      );
    } else {
      // All attempts failed
      console.error("Toutes les tentatives ont échoué. Dernière erreur:", lastResult);
      
      // Prepare specific suggestions based on the error
      let suggestion = "";
      const errorStr = lastResult.toString();
      
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
          message: `Échec de connexion SMTP après plusieurs tentatives: ${lastResult.message}`,
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
