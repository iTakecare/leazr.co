
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

    // Essayer d'envoyer directement avec un seul ensemble de paramètres simplifiés
    try {
      console.log("Tentative d'envoi d'email avec configuration simplifiée");
      
      const client = new SMTPClient({
        connection: {
          hostname: reqData.smtp.host,
          port: reqData.smtp.port,
          tls: reqData.smtp.secure,
          auth: {
            username: reqData.smtp.username,
            password: reqData.smtp.password
          }
        }
      });

      // Format RFC-compliant pour le champ From
      const fromField = `${reqData.from.name} <${reqData.from.email}>`;
      
      await client.send({
        from: fromField,
        to: reqData.to,
        subject: reqData.subject,
        content: reqData.text || "",
        html: reqData.html
      });
      
      await client.close();
      console.log("Email envoyé avec succès à", reqData.to);
      
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    } catch (emailError) {
      console.error("Échec de l'envoi d'email:", emailError);
      
      // Fallback: essayer avec une autre configuration en cas d'erreur
      try {
        console.log("Tentative de secours avec une configuration alternative");
        
        const fallbackClient = new SMTPClient({
          connection: {
            hostname: reqData.smtp.host,
            port: reqData.smtp.port,
            tls: false, // Essayer sans TLS
            auth: {
              username: reqData.smtp.username,
              password: reqData.smtp.password
            }
          }
        });
        
        // Format RFC-compliant pour le champ From
        const fromField = `${reqData.from.name} <${reqData.from.email}>`;
        
        await fallbackClient.send({
          from: fromField,
          to: reqData.to,
          subject: reqData.subject,
          content: "text/plain; charset=utf-8", // Format explicite
          text: reqData.text || reqData.html.replace(/<[^>]*>?/gm, ''),
          html: reqData.html
        });
        
        await fallbackClient.close();
        console.log("Email envoyé avec succès (configuration alternative) à", reqData.to);
        
        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      } catch (fallbackError) {
        console.error("Échec de la tentative de secours:", fallbackError);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Configuration email incorrecte ou serveur inaccessible",
            details: String(fallbackError)
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 // Retourner 200 même en cas d'erreur pour éviter les erreurs HTTP
          }
        );
      }
    }
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    
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
