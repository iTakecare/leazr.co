
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: {
    email: string;
    name: string;
  };
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
      from: reqData.from?.email || "default-from@email.com"
    });

    // Récupérer la clé API Resend depuis les variables d'environnement
    // Modification ici: Utiliser le nom correct du secret "RESEND_API"
    const resendApiKey = Deno.env.get("RESEND_API");
    if (!resendApiKey) {
      console.error("Clé API Resend non configurée");
      throw new Error("Clé API Resend non configurée");
    }

    const resend = new Resend(resendApiKey);

    // Format d'expéditeur par défaut si non fourni
    const fromName = reqData.from?.name || "iTakecare";
    const fromEmail = reqData.from?.email || "noreply@itakecare.app";
    
    // Format de from pour resend
    const from = `${fromName} <${fromEmail}>`;

    // Préparer le contenu texte si non fourni
    const textContent = reqData.text || stripHtml(reqData.html);

    console.log(`Tentative d'envoi d'email via Resend à ${reqData.to} depuis ${from}`);
    
    // Envoyer l'email avec Resend
    const { data, error } = await resend.emails.send({
      from,
      to: reqData.to,
      subject: reqData.subject,
      html: reqData.html,
      text: textContent,
    });

    if (error) {
      console.error("Erreur Resend:", error);
      throw error;
    }

    console.log("Email envoyé avec succès via Resend:", data);
    
    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
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

// Utilitaire pour supprimer les balises HTML d'une chaîne
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}
