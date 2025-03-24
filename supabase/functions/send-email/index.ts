
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

    console.log(`Configuration SMTP: ${smtp.host}:${smtp.port}, sécurisé: ${smtp.secure}`);
    console.log(`Envoi d'email à: ${to}, de: ${from.email} (${from.name})`);

    // Initialiser le client SMTP avec les paramètres détaillés et timeout
    try {
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
        debug: true, // Active le débogage SMTP
      });

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
          setTimeout(() => reject(new Error("Délai d'envoi d'email dépassé")), 15000)
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
      return new Response(
        JSON.stringify({ 
          error: "Erreur de connexion SMTP",
          details: smtpError.toString(),
          message: smtpError.message
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
