
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: {
    email: string;
    name: string;
  };
  smtp: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    // Get and validate data
    const requestData = await req.json();
    console.log("Données de la requête reçues:", {
      to: requestData.to,
      subject: requestData.subject,
      from: requestData.from?.email,
      smtp_host: requestData.smtp?.host
    });
    
    const { to, subject, html, text, from, smtp } = requestData as EmailRequest;

    // Validate inputs
    if (!to || !subject || !html || !from?.email || !smtp?.host || !smtp?.username) {
      console.error("Paramètres d'email incomplets:", {
        to_present: !!to,
        subject_present: !!subject,
        html_present: !!html,
        from_email_present: !!from?.email,
        smtp_host_present: !!smtp?.host,
        smtp_username_present: !!smtp?.username
      });
      
      return new Response(
        JSON.stringify({ error: "Paramètres d'email incomplets" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if it's an OVH server or Gmail server
    const isOvhServer = smtp.host.includes('.mail.ovh.') || smtp.host.includes('.ovh.');
    const isGmailServer = smtp.host.toLowerCase() === 'smtp.gmail.com';
    const isPort587 = smtp.port === 587;
    
    console.log(`Serveur détecté: ${isGmailServer ? 'Gmail' : isOvhServer ? 'OVH' : 'Autre'}, Port: ${smtp.port}, Sécurisé: ${smtp.secure}`);
    
    // Initialize attempt configurations to test
    const attempts = [];
    
    // Gmail servers should always use TLS
    if (isGmailServer) {
      // First try with TLS enabled (forced for Gmail)
      attempts.push({
        tls: true,
        description: "Gmail avec TLS (recommandé)",
        tlsOptions: null,
        waitBeforeAttempt: 0
      });
      
      // Second attempt with explicit TLS version
      attempts.push({
        tls: true,
        description: "Gmail avec TLS version explicite",
        tlsOptions: { 
          minVersion: "TLSv1.2",
          maxVersion: "TLSv1.2"
        },
        waitBeforeAttempt: 1000
      });
      
      // Last resort - try without TLS (not recommended but kept for backward compatibility)
      attempts.push({
        tls: false, 
        description: "Gmail sans TLS (non recommandé)",
        tlsOptions: null,
        waitBeforeAttempt: 1000
      });
    }
    // OVH servers on port 587 are known to behave differently
    else if (isOvhServer && isPort587) {
      // First try with TLS disabled for OVH
      attempts.push({
        tls: false,
        description: "OVH Port 587 sans TLS",
        tlsOptions: null,
        waitBeforeAttempt: 0
      });
      // Second attempt with TLS
      attempts.push({
        tls: true, 
        description: "OVH Port 587 avec TLS",
        tlsOptions: null,
        waitBeforeAttempt: 1000
      });
      // Third attempt with explicit TLS version
      attempts.push({
        tls: true,
        description: "OVH avec TLS version explicite",
        tlsOptions: { 
          minVersion: "TLSv1.2",
          maxVersion: "TLSv1.2"
        },
        waitBeforeAttempt: 1000
      });
    } else {
      // First attempt: use the settings as provided
      attempts.push({
        tls: smtp.secure,
        description: "Configuration originale",
        tlsOptions: null,
        waitBeforeAttempt: 0
      });
      
      // Second attempt: Explicit TLS version with secure mode
      attempts.push({
        tls: smtp.secure,
        description: "TLS version explicite (v1.2)",
        tlsOptions: { 
          minVersion: "TLSv1.2",
          maxVersion: "TLSv1.2"
        },
        waitBeforeAttempt: 1000
      });
      
      // Third attempt: opposite TLS setting as fallback
      attempts.push({
        tls: !smtp.secure,
        description: "TLS inversé",
        tlsOptions: null,
        waitBeforeAttempt: 1000
      });
    }
    
    // Try sending with multiple configurations if needed
    let lastError = null;
    let attempts_count = 0;
    
    for (const attempt of attempts) {
      attempts_count++;
      
      // Wait before retry if specified
      if (attempt.waitBeforeAttempt > 0) {
        await new Promise(resolve => setTimeout(resolve, attempt.waitBeforeAttempt));
      }
      
      console.log(`Tentative #${attempts_count} - Configuration:`, {
        tls: attempt.tls,
        description: attempt.description,
        tlsOptions: attempt.tlsOptions
      });
      
      try {
        // Create SMTP client with current configuration
        const clientConfig = {
          connection: {
            hostname: smtp.host,
            port: smtp.port,
            tls: attempt.tls,
            auth: {
              username: smtp.username,
              password: smtp.password,
            },
            ...(attempt.tlsOptions && { tlsOptions: attempt.tlsOptions })
          },
          debug: true // For detailed logs
        };
        
        console.log(`Tentative #${attempts_count}: Configuration client:`, JSON.stringify(clientConfig, null, 2));
        
        const client = new SMTPClient(clientConfig);
        
        // Set a timeout for the operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Délai de connexion SMTP dépassé (15s)")), 15000);
        });
        
        // Format email address according to RFC
        const fromField = from.name ? `"${from.name}" <${from.email}>` : from.email;
        
        console.log(`Tentative #${attempts_count} d'envoi d'email en cours...`);
        
        // Try to send the email with a timeout
        const sendEmailPromise = client.send({
          from: fromField,
          to: to,
          subject: subject,
          content: text,
          html: html
        });
        
        const emailResult = await Promise.race([
          sendEmailPromise,
          timeoutPromise
        ]);
        
        // Email sent successfully
        console.log(`Email envoyé avec succès à la tentative #${attempts_count}:`, emailResult);
        
        try {
          await client.close();
        } catch (closeErr) {
          console.warn("Erreur non critique lors de la fermeture du client:", closeErr);
        }
        
        // Si c'est Gmail, on indique toujours que TLS est recommandé, même si l'envoi a réussi sans TLS
        if (isGmailServer && !attempt.tls) {
          console.log("Gmail: bien que l'email ait été envoyé sans TLS, nous recommandons TLS pour Gmail");
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Email envoyé avec succès - L'utilisation de TLS est recommandée pour Gmail",
              attempts: attempts_count,
              config: "Gmail avec TLS (recommandé)",
              recommendedConfig: {
                tls: true,
                description: "Gmail avec TLS (recommandé)"
              }
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            }
          );
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Email envoyé avec succès",
            attempts: attempts_count,
            config: attempt.description
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
        
      } catch (error) {
        const errorString = error.toString();
        lastError = error;
        
        console.error(`Échec de la tentative #${attempts_count}:`, errorString);
        console.error("Détails de l'erreur:", error);
        
        // Log more details about specific errors
        if (error.name === "BadResource") {
          console.error("Erreur BadResource détectée. Détails:", {
            errorName: error.name,
            stack: error.stack,
            message: error.message
          });
        }
        
        if (errorString.includes("invalid cmd")) {
          console.error("Erreur de commande SMTP invalide détectée. Détails:", {
            errorName: error.name,
            stack: error.stack,
            message: error.message
          });
        }
        
        // If it's the last attempt, continue to the final error handling
        if (attempts_count >= attempts.length) {
          break;
        }
        
        // If not the last attempt, wait before trying next configuration
        console.log(`Erreur détectée (${error.name}), essai avec la configuration suivante...`);
      }
    }
    
    // If we reach here, all attempts failed
    console.error(`Toutes les tentatives (${attempts_count}) ont échoué. Dernière erreur:`, lastError);
    
    // Provide specific advice based on the error
    let suggestion = "";
    const errorStr = lastError ? lastError.toString() : "";
    
    // Gmail specific suggestions
    if (isGmailServer) {
      suggestion = "Pour Gmail, nous recommandons:\n" +
                  "1. Activer l'authentification à 2 facteurs sur votre compte Google\n" +
                  "2. Utiliser un mot de passe d'application créé spécifiquement pour cette application\n" +
                  "3. Vérifier que l'adresse email dans le champ 'De' correspond à votre compte Gmail\n" +
                  "4. Essayer avec TLS activé (secure: true)";
    }
    else if (errorStr.includes("invalid cmd")) {
      suggestion = "Erreur de commande SMTP invalide. Recommandations:\n" +
                  "1. Vérifiez que les informations de connexion SMTP sont correctes\n" + 
                  "2. Si vous utilisez OVH, essayez de désactiver l'option TLS\n" +
                  "3. Vérifiez que votre serveur SMTP autorise l'authentification avec ce compte";
    }
    else if (errorStr.includes("ProtocolVersion") || errorStr.includes("protocol version")) {
      suggestion = "Erreur de version du protocole SSL/TLS. Recommandations:\n" +
                  "1. Essayez de modifier les paramètres de sécurité (activer/désactiver SSL/TLS)\n" +
                  "2. Utilisez le port 587 avec TLS désactivé si possible";
    }
    else if (errorStr.includes("BadResource")) {
      if (isOvhServer && isPort587) {
        suggestion = "Pour les serveurs OVH sur le port 587, essayez de désactiver l'option TLS dans les paramètres SMTP.";
      } else {
        suggestion = "Erreur de ressource TLS. Recommandations:\n" +
                    "1. Essayez de modifier l'option TLS (activée ou désactivée)\n" +
                    "2. Vérifiez que les ports nécessaires sont ouverts sur votre réseau";
      }
    }
    else if (errorStr.includes("InvalidContentType") || errorStr.includes("corrupt message")) {
      if (isOvhServer && isPort587) {
        suggestion = "Pour les serveurs OVH sur le port 587, essayez de désactiver l'option TLS dans les paramètres SMTP.";
      } else if (smtp.secure) {
        suggestion = "Essayez de désactiver l'option TLS (secure: false) dans les paramètres SMTP.";
      } else {
        suggestion = "Essayez d'activer l'option TLS (secure: true) dans les paramètres SMTP.";
      }
    } else if (errorStr.includes("Auth") || errorStr.includes("535") || errorStr.includes("credentials")) {
      suggestion = "Erreur d'authentification. Vérifiez que votre nom d'utilisateur et mot de passe sont corrects.";
    }
    
    return new Response(
      JSON.stringify({ 
        error: "Erreur de connexion SMTP après plusieurs tentatives",
        details: errorStr,
        message: lastError ? (lastError.message || "Erreur de connexion au serveur SMTP") : "Erreur inconnue",
        suggestion: suggestion
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
    
  } catch (error) {
    console.error("Erreur générale:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Erreur lors de l'envoi de l'email",
        details: error.toString(),
        message: error.message || "Erreur inconnue lors du traitement de la demande"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
