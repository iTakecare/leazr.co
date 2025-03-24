
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

    // Check if it's an OVH server on port 587
    const isOvhServer = smtp.host.includes('.mail.ovh.');
    const isPort587 = smtp.port === 587;
    console.log(`Configuration SMTP: ${smtp.host}:${smtp.port}, sécurisé: ${smtp.secure}, STARTTLS: ${isPort587 && !smtp.secure}`);
    
    // For OVH servers specifically
    let useStartTLS = false;
    if (isOvhServer && isPort587) {
      useStartTLS = true;
      console.log("Serveur OVH sur port 587 détecté, utilisation du mode STARTTLS");
    }
    
    try {
      console.log(`Initialisation du client SMTP avec: ${smtp.host}:${smtp.port}, TLS: ${smtp.secure}, STARTTLS: ${useStartTLS}`);
      
      // Initialize SMTP client
      const client = new SMTPClient({
        connection: {
          hostname: smtp.host,
          port: smtp.port,
          tls: smtp.secure,
          auth: {
            username: smtp.username,
            password: smtp.password,
          },
        },
        debug: true, // Enable SMTP debugging
      });

      console.log("Client SMTP initialisé, tentative d'envoi...");

      // Compose email with simple properties for maximum compatibility
      const emailConfig = {
        from: `${from.name} <${from.email}>`,
        to: to,
        subject: subject,
        content: text,
        html: html,
      };
      
      console.log("Configuration d'email:", {
        from: emailConfig.from,
        to: emailConfig.to,
        subject: emailConfig.subject
      });

      // Send email with timeout
      const sendResult = await Promise.race([
        client.send(emailConfig),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Délai d'envoi d'email dépassé")), 20000)
        )
      ]);
      
      console.log("Résultat de l'envoi:", sendResult);

      // Close connection
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
      
      // Specific advice based on error message
      const errorStr = smtpError.toString();
      let suggestion = "";
      
      if (isOvhServer && isPort587) {
        if (smtp.secure) {
          suggestion = "Pour les serveurs OVH sur le port 587, essayez avec l'option 'secure' à false.";
        } else if (errorStr.includes("BadResource") || errorStr.includes("startTls")) {
          suggestion = "Pour les serveurs OVH sur le port 587, essayez avec l'option 'secure' à true.";
        }
      } else if (errorStr.includes("corrupt message") || errorStr.includes("InvalidContentType")) {
        if (smtp.secure) {
          suggestion = "Essayez de désactiver l'option TLS (secure: false).";
        } else {
          suggestion = "Essayez d'activer l'option TLS (secure: true).";
        }
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
