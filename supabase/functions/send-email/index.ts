
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
    
    console.log(`Serveur détecté: ${isOvhServer ? 'OVH' : 'Autre'}, Port: ${smtp.port}, Sécurisé: ${smtp.secure}`);
    
    // For debugging purposes, log more details about the connection attempt
    console.log(`Envoi d'email à: ${to}, de: ${from.email} (${from.name})`);
    
    // Initialize client with appropriate settings
    // For OVH servers, we'll try different combinations if needed
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Determine TLS settings based on attempt number and server type
      let useTLS = smtp.secure;
      
      // On subsequent attempts, toggle TLS setting if we have an OVH server
      if (attempts > 1 && isOvhServer) {
        useTLS = !useTLS;
        console.log(`Tentative #${attempts}: Changement du mode TLS à ${useTLS}`);
      }
      
      // Configure SMTP client with current attempt settings
      const clientConfig = {
        connection: {
          hostname: smtp.host,
          port: smtp.port,
          tls: useTLS,
          auth: {
            username: smtp.username,
            password: smtp.password,
          },
        },
        debug: true // Enable SMTP debugging
      };
      
      console.log(`Tentative #${attempts} - Configuration SMTP:`, {
        host: smtp.host,
        port: smtp.port,
        tls: clientConfig.connection.tls
      });
      
      try {
        // Create SMTP client
        const client = new SMTPClient(clientConfig);
        
        // Set a timeout for the entire operation
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Délai de connexion SMTP dépassé (15s)")), 15000);
        });
        
        // Format email address according to RFC
        const fromField = from.name ? `"${from.name}" <${from.email}>` : from.email;
        
        // Try to send the email with a timeout
        console.log(`Tentative d'envoi d'email #${attempts}...`);
        
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
        
        // If we reach here, the email was sent successfully
        console.log(`Email envoyé avec succès à la tentative #${attempts}:`, emailResult);
        
        try {
          await client.close();
        } catch (closeErr) {
          console.warn("Erreur non critique lors de la fermeture du client:", closeErr);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Email envoyé avec succès",
            attempts: attempts
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      } catch (smtpError) {
        lastError = smtpError;
        console.error(`Échec de la tentative #${attempts}:`, smtpError);
        
        // If this is not the last attempt, we'll try again with different settings
        if (attempts < maxAttempts) {
          console.log(`Attente avant la tentative #${attempts + 1}...`);
          // Add a small delay before the next attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // If we're here, all attempts failed
    console.error(`Échec de toutes les tentatives (${maxAttempts}). Dernière erreur:`, lastError);
    
    // Prepare specific suggestions based on the error
    let suggestion = "";
    const errorStr = lastError.toString();
    
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
        error: "Erreur de connexion SMTP après plusieurs tentatives",
        details: errorStr,
        message: lastError.message || "Erreur de connexion au serveur SMTP",
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
