
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    console.error("Méthode non supportée:", req.method);
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

    // Afficher un extrait du contenu HTML pour débogage
    console.log("Extrait du HTML à envoyer:", reqData.html.substring(0, 150) + "...");

    // Créer un client Supabase avec les variables d'environnement
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Variables d'environnement Supabase non configurées");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false } // Important: désactive la persistance de session
    });
    
    // Récupérer les paramètres SMTP depuis la base de données
    const { data: smtpSettings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name')
      .eq('id', 1)
      .single();
    
    if (settingsError) {
      console.error("Erreur lors de la récupération des paramètres SMTP:", settingsError);
      throw new Error(`Erreur de base de données: ${settingsError.message}`);
    }
    
    if (!smtpSettings || !smtpSettings.resend_api_key) {
      console.error("Clé API Resend non configurée dans la base de données");
      throw new Error("Clé API Resend non configurée");
    }

    console.log("Clé API Resend récupérée avec succès");
    const resend = new Resend(smtpSettings.resend_api_key);

    // Format d'expéditeur par défaut si non fourni
    const fromName = reqData.from?.name || smtpSettings.from_name || "iTakecare";
    const fromEmail = reqData.from?.email || smtpSettings.from_email || "noreply@itakecare.app";
    
    // Format de from pour resend
    const from = `${fromName} <${fromEmail}>`;

    // Préparer le contenu texte si non fourni
    const textContent = reqData.text || stripHtml(reqData.html);

    console.log(`Tentative d'envoi d'email via Resend à ${reqData.to} depuis ${from}`);
    
    // IMPORTANT: Ne pas modifier ou reformater le HTML ici
    // Nous prenons directement le HTML fourni par le client
    // Traiter uniquement les chaînes JSON potentielles dans le contenu HTML
    let htmlContent = reqData.html;
    htmlContent = formatJsonContent(htmlContent);
    
    // Envoyer l'email avec Resend
    const { data, error } = await resend.emails.send({
      from,
      to: reqData.to,
      subject: reqData.subject,
      html: htmlContent,
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

// Fonction pour formater le contenu JSON en HTML lisible
function formatJsonContent(html: string): string {
  // Fonction pour convertir une chaîne JSON en HTML formatté
  function formatJsonToHtml(jsonString: string): string {
    try {
      // Nettoyer la chaîne pour faciliter le parsing
      const cleaned = jsonString
        .replace(/&#34;/g, '"')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      // Analyser le JSON
      const data = JSON.parse(cleaned);
      
      // Formatter l'équipement
      if (Array.isArray(data) && data.length > 0 && data[0].title) {
        let result = '<div style="background-color: #f9f9f9; border-radius: 8px; padding: 15px; margin: 15px 0;">';
        result += '<h3 style="margin-top: 0; color: #2d618f;">Détails de l\'équipement</h3>';
        result += '<ul style="list-style-type: none; padding: 0; margin: 0;">';
        
        data.forEach((item: any) => {
          result += `<li style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">`;
          result += `<strong>${item.title || 'Équipement'}</strong><br>`;
          if (item.quantity) result += `Quantité: ${item.quantity}<br>`;
          if (item.purchasePrice) result += `Prix: ${item.purchasePrice}€<br>`;
          if (item.monthlyPayment) result += `Mensualité: ${item.monthlyPayment}€`;
          result += '</li>';
        });
        
        result += '</ul></div>';
        return result;
      }
      
      // Pour d'autres types de JSON
      return '<pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;">' + 
        JSON.stringify(data, null, 2) + 
        '</pre>';
    } catch (e) {
      console.log("Erreur formatage JSON:", e);
      return jsonString; // Retourner la chaîne originale en cas d'erreur
    }
  }
  
  // Patterns pour détecter le JSON dans le HTML
  const patterns = [
    /(\[{&#34;|\[{")(.*?)("}\]|&#34;}\])/g,  // Format avec caractères d'échappement HTML
    /\[\{.*?\}\]/g  // Format JSON brut
  ];
  
  let result = html;
  
  // Appliquer chaque pattern
  patterns.forEach(pattern => {
    result = result.replace(pattern, (match) => {
      return formatJsonToHtml(match);
    });
  });
  
  return result;
}
