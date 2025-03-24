
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

    // Determine if it's a Gmail server
    const isGmailServer = config.host.toLowerCase() === 'smtp.gmail.com';
    const isOvhServer = config.host.includes('.mail.ovh.');
    const isPort587 = parseInt(config.port) === 587;
    
    console.log(`Serveur détecté: ${isGmailServer ? 'Gmail' : isOvhServer ? 'OVH' : 'Autre'}, Port: ${config.port}, secure: ${config.secure}`);

    // Vérifier si l'utilisation d'un mot de passe d'application est probable pour Gmail
    let isAppPasswordLikely = false;
    if (isGmailServer && config.password) {
      // Les mots de passe d'application Gmail sont généralement 16 caractères sans espaces
      // ou 4 groupes de 4 caractères avec ou sans espaces
      isAppPasswordLikely = config.password.replace(/\s/g, '').length === 16;
      console.log(`Détection mot de passe d'application: ${isAppPasswordLikely ? "Probable" : "Improbable"}`);
    }

    // Initialize attempt configurations to test
    const attempts = [];
    
    // Gmail servers should always use TLS on port 587
    if (isGmailServer) {
      // For Gmail, force TLS to true and try that first
      attempts.push({
        tls: true,
        description: "Gmail avec TLS (recommandé)",
        clientOptions: { connectionTimeout: 15000 }
      });
      // Try without TLS only as a last resort, though it will likely fail
      attempts.push({
        tls: false,
        description: "Gmail sans TLS (non recommandé)",
        clientOptions: { connectionTimeout: 15000 }
      });
    }
    // OVH servers on port 587 are known to behave differently
    else if (isOvhServer && isPort587) {
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
        
        // Try sending test email with error handling for specific errors
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
          const errorString = sendError.toString();
          
          // Gmail specific error handling
          if (isGmailServer) {
            // Check for common Gmail error codes
            if (errorString.includes("5.7.9") && errorString.includes("log in with your web browser")) {
              // This error happens when Google detects an unusual sign-in or security issue
              lastResult = {
                message: "Google a bloqué la connexion - Authentification nécessaire via navigateur",
                details: errorString,
                isGmailWebLoginRequired: true
              };
              
              console.log("Détection d'une erreur de sécurité Gmail nécessitant une connexion web");
              
              try {
                await client.close();
              } catch (e) {
                // Ignore close errors in case of failure
              }
              
              // No need to continue trying with Gmail - it's a security issue
              break;
            }
            else if (errorString.includes("535") || errorString.includes("5.7.8") || errorString.includes("credentials")) {
              // Authentication error
              const appPasswordMessage = isAppPasswordLikely 
                ? "Le mot de passe fourni semble être un mot de passe d'application, mais Google refuse la connexion. Assurez-vous que ce mot de passe d'application est récent et valide."
                : "Le mot de passe fourni ne semble pas être un mot de passe d'application. Pour Gmail, vous devez utiliser un mot de passe d'application généré spécifiquement pour cette application.";
              
              lastResult = {
                message: "Erreur d'authentification Gmail",
                details: errorString,
                appPasswordMessage
              };
              
              console.log("Détection d'une erreur d'authentification Gmail");
              
              try {
                await client.close();
              } catch (e) {
                // Ignore close errors in case of failure
              }
              
              // No need to continue trying with Gmail - it's a credentials issue
              break;
            }
          }
          
          // Check for specific InvalidContentType or BadResource error which is common with OVH
          if (sendError.name === "InvalidData" || sendError.name === "BadResource" || 
              errorString.includes("InvalidContentType") || 
              errorString.includes("BadResource")) {
            
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
      let errorMessage = "";
      
      if (isGmailServer) {
        if (lastResult?.isGmailWebLoginRequired) {
          errorMessage = "Connexion refusée par Google - Action supplémentaire requise";
          suggestion = "Google a détecté une activité inhabituelle et nécessite une vérification supplémentaire:\n\n" +
                      "1. Connectez-vous à votre compte Gmail dans un navigateur\n" +
                      "2. Allez à https://accounts.google.com/DisplayUnlockCaptcha pour autoriser l'accès\n" +
                      "3. Vérifiez si vous avez reçu un email de Google concernant une tentative de connexion bloquée\n" +
                      "4. Assurez-vous d'utiliser un mot de passe d'application récent créé spécifiquement pour cette application";
        } 
        else if (lastResult?.appPasswordMessage) {
          errorMessage = "Erreur d'authentification Gmail";
          suggestion = lastResult.appPasswordMessage + "\n\n" +
                      "Instructions pour créer un mot de passe d'application:\n" +
                      "1. Allez sur https://myaccount.google.com/security\n" +
                      "2. Assurez-vous que l'authentification à 2 facteurs est activée\n" +
                      "3. Allez sur https://myaccount.google.com/apppasswords\n" +
                      "4. Sélectionnez 'Autre (nom personnalisé)' et donnez un nom à cette application\n" +
                      "5. Copiez le mot de passe généré (16 caractères sans espaces) et utilisez-le ici";
        }
        else {
          const errorStr = lastResult ? (lastResult.toString ? lastResult.toString() : String(lastResult)) : "";
          errorMessage = `Échec de connexion Gmail: ${errorStr}`;
          suggestion = "Pour utiliser Gmail comme serveur SMTP, assurez-vous que:\n" +
                      "1. L'authentification à 2 facteurs est activée sur votre compte Google\n" +
                      "2. Vous utilisez un mot de passe d'application créé spécifiquement pour cette application\n" +
                      "3. Vous avez vérifié que votre adresse email dans le champ 'De' correspond exactement à votre compte Gmail";
        }
      } else {
        const errorStr = lastResult ? (lastResult.toString ? lastResult.toString() : String(lastResult)) : "";
        errorMessage = `Échec de connexion SMTP après plusieurs tentatives: ${errorStr}`;
        
        if (errorStr.includes("InvalidContentType") || errorStr.includes("corrupt message")) {
          if (isOvhServer && isPort587) {
            suggestion = "Pour les serveurs OVH sur le port 587, nous recommandons de désactiver l'option TLS/SSL dans les paramètres SMTP. Les serveurs OVH gèrent généralement le chiffrement automatiquement sur ce port.";
          } else if (config.secure) {
            suggestion = "Essayez de désactiver l'option TLS (secure: false) dans les paramètres SMTP.";
          } else {
            suggestion = "Essayez d'activer l'option TLS (secure: true) dans les paramètres SMTP.";
          }
        } else if (errorStr.includes("BadResource") || errorStr.includes("startTls")) {
          if (isOvhServer && isPort587) {
            suggestion = "Ce problème est courant avec les serveurs OVH sur le port 587. Essayez de désactiver l'option TLS et vérifiez que votre nom d'utilisateur et mot de passe sont corrects.";
          }
        } else if (errorStr.includes("Auth") || errorStr.includes("535") || errorStr.includes("credentials")) {
          suggestion = "Vérifiez que votre nom d'utilisateur et mot de passe sont corrects.";
        }
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: errorMessage,
          details: lastResult ? (lastResult.details || lastResult.toString()) : "Erreur inconnue",
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
