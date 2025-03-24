
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

    // Initialize attempt configurations to test
    const attempts = [];
    
    // OVH servers on port 587 are known to behave differently
    if (isOvhServer && isPort587) {
      // For OVH on port 587, we'll try both TLS settings, but prioritize based on best practices
      attempts.push({
        tls: false,
        description: "OVH Port 587 sans TLS",
        clientOptions: { connectionTimeout: 15000 }
      });
      attempts.push({
        tls: true,
        description: "OVH Port 587 avec TLS",
        clientOptions: { connectionTimeout: 15000 }
      });
    } else {
      // First attempt: use the settings as provided
      attempts.push({
        tls: config.secure,
        description: "Configuration originale",
        clientOptions: { connectionTimeout: 15000 }
      });
      
      // Second attempt: opposite TLS setting
      attempts.push({
        tls: !config.secure,
        description: "TLS inversé",
        clientOptions: { connectionTimeout: 15000 }
      });
    }
    
    let success = false;
    let lastResult = null;
    let workingConfig = null;
    
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
        
        // Try sending test email with error handling for specific OVH errors
        try {
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
          
          success = true;
          lastResult = emailResult;
          workingConfig = attempt;
          
          // No need to try other configurations
          break;
        } catch (sendError) {
          console.error(`Tentative #${i+1}: Erreur d'envoi:`, sendError);
          
          // Check for specific InvalidContentType or BadResource error which is common with OVH
          if (sendError.name === "InvalidData" || sendError.name === "BadResource" || 
              sendError.toString().includes("InvalidContentType") || 
              sendError.toString().includes("BadResource")) {
            
            console.log(`Tentative #${i+1}: Erreur de protocole SSL/TLS détectée, essai suivant avec configuration différente`);
            lastResult = sendError;
            
            try {
              await client.close();
            } catch (e) {
              // Ignore close errors in case of failure
            }
            
            // Continue to the next attempt
            continue;
          }
          
          // For other errors, also continue but log them properly
          lastResult = sendError;
          
          try {
            await client.close();
          } catch (e) {
            // Ignore close errors in case of failure
          }
        }
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
      const errorStr = lastResult ? lastResult.toString() : "";
      
      if (errorStr.includes("InvalidContentType") || errorStr.includes("corrupt message")) {
        if (isOvhServer && isPort587) {
          suggestion = "Pour les serveurs OVH sur le port 587, nous recommandons de désactiver l'option TLS/SSL dans les paramètres. Les serveurs OVH gèrent généralement le chiffrement automatiquement sur ce port.";
        } else if (config.secure) {
          suggestion = "Essayez de désactiver l'option TLS (secure: false) dans les paramètres SMTP.";
        } else {
          suggestion = "Essayez d'activer l'option TLS (secure: true) dans les paramètres SMTP.";
        }
      } else if (errorStr.includes("BadResource") || errorStr.includes("startTls")) {
        if (isOvhServer && isPort587) {
          suggestion = "Ce problème est courant avec les serveurs OVH sur le port 587. Essayez de désactiver l'option TLS et vérifiez que votre nom d'utilisateur et mot de passe sont corrects.";
        }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Échec de connexion SMTP après plusieurs tentatives: ${lastResult ? lastResult.message || lastResult.toString() : "Erreur inconnue"}`,
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
