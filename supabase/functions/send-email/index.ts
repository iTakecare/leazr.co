
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SMTPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  tls?: {
    minVersion?: string;
    maxVersion?: string;
  };
}

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from: {
    email: string;
    name: string;
  };
  smtp: SMTPConfig;
}

// Fonction pour essayer d'envoyer un email avec la configuration fournie
async function tryToSendEmail(reqData: EmailRequest) {
  try {
    // Configuration client SMTP avec détection du serveur
    const isGmail = reqData.smtp.host.includes('gmail');
    const isOffice365 = reqData.smtp.host.includes('office365') || reqData.smtp.host.includes('outlook');
    
    let useSecure = reqData.smtp.secure;
    let usePort = reqData.smtp.port;
    
    // Ajuster les paramètres en fonction du serveur
    if (isGmail && usePort === 587) {
      // Gmail avec STARTTLS
      useSecure = true;
    }
    
    console.log(`Serveur détecté: ${isGmail ? 'Gmail' : isOffice365 ? 'Office 365' : reqData.smtp.host}, Port: ${usePort}, Sécurisé: ${useSecure}`);
    
    // Configuration du client SMTP
    const clientConfig = {
      connection: {
        hostname: reqData.smtp.host,
        port: usePort,
        tls: useSecure,
        auth: {
          username: reqData.smtp.username,
          password: reqData.smtp.password
        }
      }
    };
    
    // Ajouter des options TLS si nécessaire
    if (reqData.smtp.tls) {
      clientConfig.connection.tls = true;
      clientConfig.connection.tlsOptions = reqData.smtp.tls;
    }
    
    console.log("Configuration client:", JSON.stringify(clientConfig, null, 2));
    
    // Créer le client SMTP
    const client = new SMTPClient(clientConfig);
    
    // Format RFC-compliant pour le champ From
    const fromField = `${reqData.from.name} <${reqData.from.email}>`;
    
    // Envoyer l'email
    await client.send({
      from: fromField,
      to: reqData.to,
      subject: reqData.subject,
      content: reqData.text || "",
      html: reqData.html
    });
    
    // Fermer la connexion
    await client.close();
    
    return { success: true };
  } catch (error) {
    // Journaliser l'erreur de façon détaillée
    console.error(`Échec de la tentative: ${error.message}`);
    console.error(`Détails de l'erreur: ${error}`);
    
    // Journaliser le type d'erreur pour aider au diagnostic
    const errorName = error.name || "Inconnu";
    console.error(`Erreur ${errorName} détectée. Détails: ${JSON.stringify({
      errorName,
      message: error.message,
      stack: error.stack
    })}`);
    
    throw error;
  }
}

serve(async (req) => {
  // Gestion des requêtes OPTIONS (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  // Vérification de la méthode
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non supportée' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }

  try {
    const reqData: EmailRequest = await req.json();
    console.log("Données de la requête reçues:", {
      to: reqData.to,
      subject: reqData.subject,
      from: reqData.from.email,
      smtp_host: reqData.smtp.host
    });

    // Définir les configurations à essayer
    const smtpConfigurations = [
      {
        tls: true,
        description: "Gmail avec TLS (recommandé)",
        tlsOptions: null
      },
      {
        tls: true,
        description: "Gmail avec TLS version explicite",
        tlsOptions: { minVersion: "TLSv1.2", maxVersion: "TLSv1.2" }
      },
      {
        tls: false,
        description: "Gmail sans TLS (non recommandé)",
        tlsOptions: null
      }
    ];
    
    let lastError = null;
    
    // Essayer chaque configuration jusqu'à ce qu'une réussisse
    for (let i = 0; i < smtpConfigurations.length; i++) {
      const config = smtpConfigurations[i];
      console.log(`Tentative #${i+1} - Configuration:`, JSON.stringify(config, null, 2));
      
      try {
        console.log(`Tentative #${i+1} d'envoi d'email en cours...`);
        
        // Modifier la configuration TLS
        const modifiedReqData = { ...reqData };
        modifiedReqData.smtp.secure = config.tls;
        if (config.tlsOptions) {
          modifiedReqData.smtp.tls = config.tlsOptions;
        } else {
          delete modifiedReqData.smtp.tls;
        }
        
        // Essayer d'envoyer l'email
        const result = await tryToSendEmail(modifiedReqData);
        
        // Si on arrive ici, l'envoi a réussi
        console.log(`Email envoyé avec succès à ${reqData.to} (configuration: ${config.description})`);
        
        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } catch (error) {
        lastError = error;
        console.log("Erreur détectée, essai avec la configuration suivante...");
      }
    }
    
    // Si on arrive ici, toutes les tentatives ont échoué
    throw new Error("Toutes les tentatives ont échoué.");
    
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(error),
        message: "Erreur de traitement de la requête d'envoi d'email"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Retourner 200 même en cas d'erreur pour éviter les erreurs HTTP
      }
    );
  }
});
