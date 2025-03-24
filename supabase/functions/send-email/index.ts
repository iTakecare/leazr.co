
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
  // Gestion des requêtes CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    // Récupération et validation des données
    const requestData = await req.json();
    console.log("Données de la requête reçues:", {
      to: requestData.to,
      subject: requestData.subject,
      from: requestData.from?.email,
      smtp_host: requestData.smtp?.host
    });
    
    const { to, subject, html, text, from, smtp } = requestData as EmailRequest;

    // Validation des entrées
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

    // Pour les serveurs OVH sur le port 587, il faut utiliser STARTTLS
    // Modification importante: le port 587 nécessite généralement STARTTLS mais pas TLS direct
    const isStartTLS = smtp.port === 587 && !smtp.secure;
    
    console.log(`Configuration SMTP: ${smtp.host}:${smtp.port}, sécurisé: ${smtp.secure}, STARTTLS: ${isStartTLS}`);
    console.log(`Envoi d'email à: ${to}, de: ${from.email} (${from.name})`);

    // Initialiser le client SMTP avec les paramètres détaillés et timeout
    try {
      const client = new SMTPClient({
        connection: {
          hostname: smtp.host,
          port: smtp.port,
          // Si on utilise le port 587, on utilise STARTTLS même si secure est false
          tls: smtp.secure,
          // Important: ne pas forcer TLS directement sur le port 587
          // On laisse STARTTLS se faire automatiquement
          auth: {
            username: smtp.username,
            password: smtp.password,
          },
        },
        debug: true, // Active le débogage SMTP
      });

      console.log("Client SMTP initialisé, tentative d'envoi...");

      // Envoyer l'email avec timeout
      const sendResult = await Promise.race([
        client.send({
          from: `${from.name} <${from.email}>`,
          to: to,
          subject: subject,
          content: text,
          html: html,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Délai d'envoi d'email dépassé")), 20000)
        )
      ]);
      
      console.log("Résultat de l'envoi:", sendResult);

      // Fermer la connexion
      await client.close();

      console.log("Email envoyé avec succès");
      return new Response(
        JSON.stringify({ success: true, message: "Email envoyé avec succès" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (smtpError) {
      console.error("Erreur SMTP spécifique:", smtpError);
      
      // Vérifier si l'erreur est liée à TLS
      const errorStr = smtpError.toString();
      let suggestion = "";
      
      if (errorStr.includes("BadResource") && errorStr.includes("startTls")) {
        suggestion = "Problème avec la connexion TLS. Pour OVH sur le port 587, essayez avec l'option 'secure' à true.";
      } else if (errorStr.includes("invalid cmd")) {
        suggestion = "Commande SMTP invalide. Vérifiez les paramètres de connexion et les credentials.";
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Erreur de connexion SMTP",
          details: errorStr,
          message: smtpError.message,
          suggestion: suggestion
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de l'envoi de l'email",
        details: error.toString(),
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
