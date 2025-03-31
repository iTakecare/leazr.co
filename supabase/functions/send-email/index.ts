
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

// Configurations prédéfinies pour différents serveurs SMTP courants
const getServerConfigurations = (smtpHost: string, port: number, secure: boolean) => {
  if (smtpHost.includes('gmail.com')) {
    return [
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
  }
  
  return [
    { 
      tls: secure,
      description: "Configuration par défaut basée sur les paramètres fournis",
      tlsOptions: null
    },
    {
      tls: !secure,
      description: "Configuration inverse des paramètres fournis",
      tlsOptions: null
    }
  ];
};

// Fonction pour envoyer un email avec une configuration donnée
const tryToSendEmail = async (
  reqData: EmailRequest,
  config: { tls: boolean; description: string; tlsOptions: any | null }
) => {
  try {
    console.log(`Tentative #${config.description} d'envoi d'email en cours...`);
    
    const smtpConfig = {
      connection: {
        hostname: reqData.smtp.host,
        port: reqData.smtp.port,
        tls: config.tls,
        auth: {
          username: reqData.smtp.username,
          password: reqData.smtp.password
        },
        ...(config.tlsOptions ? { tlsOptions: config.tlsOptions } : {})
      },
      debug: true
    };
    
    console.log(`Configuration client:`, JSON.stringify(smtpConfig, null, 2));
    
    const client = new SMTPClient(smtpConfig);
    
    await client.send({
      from: `${reqData.from.name} <${reqData.from.email}>`,
      to: reqData.to,
      subject: reqData.subject,
      content: reqData.text || "",
      html: reqData.html,
    });
    
    await client.close();
    return { success: true };
  } catch (error) {
    console.error(`Échec de la tentative: ${error.message}`);
    console.error(`Détails de l'erreur:`, error);
    
    // Traitement spécifique pour certaines erreurs
    if (error.name === "BadResource" || error.name === "InvalidData") {
      const errorDetails = {
        errorName: error.name,
        message: error.message,
        stack: error.stack
      };
      console.error(`Erreur ${error.name} détectée. Détails:`, errorDetails);
    }
    
    return { success: false, error };
  }
};

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

    // Détection du type de serveur SMTP
    const isSecure = reqData.smtp.secure;
    console.log(`Serveur détecté: ${reqData.smtp.host.includes('gmail.com') ? 'Gmail' : reqData.smtp.host}, Port: ${reqData.smtp.port}, Sécurisé: ${isSecure}`);
    
    // Récupérer les configurations à essayer pour ce serveur
    const configurations = getServerConfigurations(
      reqData.smtp.host,
      reqData.smtp.port,
      isSecure
    );
    
    // Essayer chaque configuration jusqu'à ce qu'une réussisse
    for (let i = 0; i < configurations.length; i++) {
      const config = configurations[i];
      console.log(`Tentative #${i+1} - Configuration:`, config);
      
      const result = await tryToSendEmail(reqData, {
        ...config,
        description: `${i+1}`
      });
      
      if (result.success) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        });
      }
      
      console.log("Erreur détectée, essai avec la configuration suivante...");
    }
    
    // Si toutes les tentatives échouent
    throw new Error(`Toutes les tentatives (${configurations.length}) ont échoué.`);
    
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
