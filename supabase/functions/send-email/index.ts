
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

    // Détection du type de serveur
    const isGmailServer = smtp.host.toLowerCase() === 'smtp.gmail.com';
    const isOvhServer = smtp.host.includes('.mail.ovh.') || smtp.host.includes('.ovh.');
    const isPort587 = smtp.port === 587;
    
    console.log(`Serveur détecté: ${isGmailServer ? 'Gmail' : isOvhServer ? 'OVH' : 'Autre'}, Port: ${smtp.port}, Sécurisé: ${smtp.secure}`);
    
    // Configuration de base pour l'envoi
    let clientConfig = {
      connection: {
        hostname: smtp.host,
        port: smtp.port,
        auth: {
          username: smtp.username,
          password: smtp.password,
        },
        // Valeurs par défaut qui peuvent être remplacées ci-dessous
        tls: smtp.secure,
      },
      debug: true
    };
    
    // Pour Gmail, forcer l'utilisation de TLS
    if (isGmailServer) {
      console.log("Configuration spécifique pour Gmail détectée");
      clientConfig.connection.tls = true;
      
      // Ajouter des options TLS explicites pour Gmail
      Object.assign(clientConfig.connection, {
        tlsOptions: {
          rejectUnauthorized: false, // Aide à éviter les erreurs de certificat
        }
      });
      
      console.log("Configuration Gmail appliquée:", JSON.stringify(clientConfig, null, 2));
    }
    // Pour OVH sur le port 587, désactiver TLS par défaut
    else if (isOvhServer && isPort587) {
      console.log("Configuration spécifique pour OVH sur port 587");
      clientConfig.connection.tls = false;
      console.log("Configuration OVH appliquée:", JSON.stringify(clientConfig, null, 2));
    }
    
    let lastError = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    // Stratégies alternatives à essayer en cas d'échec
    const fallbackStrategies = [
      // Stratégie 1: Configuration de base (déjà appliquée)
      null,
      
      // Stratégie 2: Forcer TLS et ajouter des options TLS plus souples
      {
        tls: true,
        tlsOptions: {
          rejectUnauthorized: false,
        }
      },
      
      // Stratégie 3: Inverser le paramètre TLS
      (config: any) => ({
        tls: !config.connection.tls,
        tlsOptions: null
      }),
      
      // Stratégie 4: Spécifier explicitement la version TLS
      {
        tls: true,
        tlsOptions: {
          minVersion: "TLSv1.2",
          maxVersion: "TLSv1.3",
          rejectUnauthorized: false,
        }
      }
    ];
    
    // Tenter d'envoyer l'email avec les différentes stratégies
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        console.log(`Tentative d'envoi #${attempts}`);
        
        // Après la première tentative, essayer une stratégie alternative
        if (attempts > 1) {
          const strategy = fallbackStrategies[attempts - 1];
          
          if (strategy) {
            // Si c'est une fonction, l'appliquer à la configuration actuelle
            if (typeof strategy === 'function') {
              const strategyResult = strategy(clientConfig);
              
              if (strategyResult.tls !== undefined) {
                clientConfig.connection.tls = strategyResult.tls;
              }
              
              if (strategyResult.tlsOptions) {
                Object.assign(clientConfig.connection, { tlsOptions: strategyResult.tlsOptions });
              } else if (strategyResult.tlsOptions === null) {
                // Supprimer les options TLS si explicitement null
                delete clientConfig.connection.tlsOptions;
              }
            } 
            // Sinon, c'est un objet de configuration à fusionner
            else {
              if (strategy.tls !== undefined) {
                clientConfig.connection.tls = strategy.tls;
              }
              
              if (strategy.tlsOptions) {
                Object.assign(clientConfig.connection, { tlsOptions: strategy.tlsOptions });
              } else if (strategy.tlsOptions === null) {
                delete clientConfig.connection.tlsOptions;
              }
            }
            
            console.log(`Stratégie alternative #${attempts-1} appliquée:`, JSON.stringify(clientConfig, null, 2));
          }
        }
        
        // Créer un client avec la configuration actuelle
        const client = new SMTPClient(clientConfig);
          
        // Format email address according to RFC
        const fromField = from.name ? `"${from.name}" <${from.email}>` : from.email;
        
        console.log(`Tentative #${attempts} d'envoi d'email en cours...`);
        
        // Set a timeout for the operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Délai de connexion SMTP dépassé (15s)")), 15000);
        });
        
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
        console.log(`Email envoyé avec succès à la tentative #${attempts}:`, emailResult);
        
        try {
          await client.close();
        } catch (closeErr) {
          console.warn("Erreur non critique lors de la fermeture du client:", closeErr);
        }
        
        // Pour Gmail, vérifier si l'envoi a réussi avec TLS désactivé
        if (isGmailServer && !clientConfig.connection.tls) {
          console.log("Gmail: bien que l'email ait été envoyé sans TLS, nous recommandons TLS pour Gmail");
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Email envoyé avec succès - L'utilisation de TLS est recommandée pour Gmail",
              attempts,
              config: "Gmail sans TLS (non recommandé)",
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
            attempts,
            config: isGmailServer ? "Gmail avec TLS" : 
                    isOvhServer ? "OVH" : 
                    `Personnalisé (TLS: ${clientConfig.connection.tls ? "activé" : "désactivé"})`
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } catch (error) {
        console.error(`Échec de la tentative #${attempts}:`, error);
        
        lastError = error;
        
        // Si le délai d'attente est dépassé, ne pas réessayer
        if (error.message === "Délai de connexion SMTP dépassé (15s)") {
          console.error("Délai de connexion dépassé, abandon des tentatives");
          break;
        }
        
        // Attendre un peu avant la prochaine tentative
        if (attempts < maxAttempts) {
          console.log(`Attente avant la tentative #${attempts + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // Si on arrive ici, toutes les tentatives ont échoué
    console.error(`Toutes les tentatives (${attempts}) ont échoué. Dernière erreur:`, lastError);
    
    // Fournir des conseils spécifiques selon le type d'erreur
    let suggestion = "";
    const errorStr = lastError ? lastError.toString() : "";
    
    // Suggestions spécifiques pour Gmail
    if (isGmailServer) {
      suggestion = "Pour Gmail, nous recommandons:\n" +
                  "1. Vérifier que vous utilisez un mot de passe d'application généré via les paramètres de sécurité Google\n" +
                  "2. Vérifier que l'authentification à 2 facteurs est activée sur votre compte Google\n" +
                  "3. Vérifier que l'adresse email dans le champ 'De' correspond exactement à votre compte Gmail\n" +
                  "4. Vérifier que l'accès aux applications moins sécurisées est désactivé";
    }
    else if (errorStr.includes("BadResource") || errorStr.includes("Bad resource")) {
      suggestion = "Cette erreur est généralement liée à un problème de configuration TLS/SSL. Recommandations:\n" +
                  "1. Essayez de modifier les paramètres TLS (activer/désactiver)\n" + 
                  "2. Vérifiez que votre serveur SMTP est accessible et accepte les connexions\n" +
                  "3. Pour OVH, essayez spécifiquement de désactiver TLS sur le port 587";
    }
    else if (errorStr.includes("timeout") || errorStr.includes("time out") || errorStr.includes("Délai")) {
      suggestion = "Délai d'attente dépassé. Recommandations:\n" +
                  "1. Vérifiez que votre serveur SMTP est accessible et n'est pas bloqué par un pare-feu\n" +
                  "2. Vérifiez que le port SMTP est ouvert et accessible\n" +
                  "3. Essayez un autre serveur SMTP ou une autre connexion réseau";
    }
    else if (errorStr.includes("535") || errorStr.includes("Authentication")) {
      suggestion = "Erreur d'authentification. Vérifiez les identifiants SMTP (nom d'utilisateur/mot de passe).\n" +
                  "Pour Gmail, assurez-vous d'utiliser un mot de passe d'application spécifique.";
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
