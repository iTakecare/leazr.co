
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
    const { to, subject, html, text, from, smtp } = await req.json() as EmailRequest;

    // Validation des entrées
    if (!to || !subject || !html || !from.email || !smtp.host || !smtp.username) {
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

    // Initialiser le client SMTP
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
    });

    // Envoyer l'email
    await client.send({
      from: `${from.name} <${from.email}>`,
      to: to,
      subject: subject,
      content: text,
      html: html,
    });

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
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de l'envoi de l'email",
        details: error.toString() 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
