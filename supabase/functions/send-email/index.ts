
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

    // Check if it's an OVH server
    const isOvhServer = smtp.host.includes('.mail.ovh.');
    const isPort587 = smtp.port === 587;
    console.log(`Configuration SMTP: ${smtp.host}:${smtp.port}, sécurisé: ${smtp.secure}`);
    
    // For debugging purposes, log more details about the connection attempt
    console.log(`Envoi d'email à: ${to}, de: ${from.email} (${from.name})`);
    
    // Initialize client with appropriate settings
    let clientConfig = {
      connection: {
        hostname: smtp.host,
        port: smtp.port,
        tls: smtp.secure,
        auth: {
          username: smtp.username,
          password: smtp.password,
        },
      },
      debug: true // Enable SMTP debugging
    };
    
    // Special case for OVH on port 587
    if (isOvhServer && isPort587) {
      if (!smtp.secure) {
        console.log("Serveur OVH sur port 587 détecté avec TLS désactivé, forçage du mode sécurisé à TRUE");
        clientConfig.connection.tls = true;
      }
    }
    
    console.log("Configuration finale du client SMTP:", {
      host: smtp.host,
      port: smtp.port,
      tls: clientConfig.connection.tls
    });
    
    try {
      // Create SMTP client with timeout handling
      const client = new SMTPClient(clientConfig);
      
      // Set a timeout for the entire operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Délai de connexion SMTP dépassé (15s)")), 15000);
      });
      
      // Format email address according to RFC
      const fromField = from.name ? `"${from.name}" <${from.email}>` : from.email;
      
      // Try to send the email with a timeout
      const emailResult = await Promise.race([
        client.send({
          from: fromField,
          to: to,
          subject: subject,
          content: text,
          html: html
        }),
        timeoutPromise
      ]);
      
      console.log("Email envoyé avec succès:", emailResult);
      
      try {
        await client.close();
      } catch (closeErr) {
        console.warn("Erreur non critique lors de la fermeture du client:", closeErr);
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Email envoyé avec succès" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (smtpError) {
      console.error("Erreur SMTP spécifique:", smtpError);
      
      let suggestion = "";
      const errorStr = smtpError.toString();
      
      if (errorStr.includes("InvalidContentType") || errorStr.includes("corrupt message")) {
        if (smtp.secure) {
          suggestion = "Essayez de désactiver l'option TLS (secure: false) dans les paramètres SMTP.";
        } else {
          suggestion = "Essayez d'activer l'option TLS (secure: true) dans les paramètres SMTP.";
        }
      } else if (errorStr.includes("BadResource") || errorStr.includes("startTls")) {
        if (isOvhServer && isPort587) {
          if (smtp.secure) {
            suggestion = "Pour les serveurs OVH sur le port 587, essayez de désactiver l'option TLS.";
          } else {
            suggestion = "Pour les serveurs OVH sur le port 587, essayez d'activer l'option TLS.";
          }
        }
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Erreur de connexion SMTP",
          details: errorStr,
          message: smtpError.message || "Erreur de connexion au serveur SMTP",
          suggestion: suggestion
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
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
