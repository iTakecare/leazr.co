
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
    
    // Vérifier si la clé API n'est pas vide et ne contient pas de placeholder comme "YOUR_API_KEY"
    const apiKey = smtpSettings.resend_api_key.trim();
    if (apiKey === "" || apiKey.includes("YOUR_API_KEY") || apiKey.includes("RESEND_API_KEY")) {
      console.error("Clé API Resend invalide ou non configurée correctement");
      throw new Error("Clé API Resend invalide");
    }
    
    const resend = new Resend(apiKey);

    // Format d'expéditeur par défaut si non fourni
    const fromName = reqData.from?.name || smtpSettings.from_name || "iTakecare";
    const fromEmail = reqData.from?.email || smtpSettings.from_email || "noreply@itakecare.app";
    
    // Format de from pour resend
    const from = `${fromName} <${fromEmail}>`;

    // Préparer le contenu texte si non fourni
    const textContent = reqData.text || stripHtml(reqData.html);

    console.log(`Tentative d'envoi d'email via Resend à ${reqData.to} depuis ${from}`);
    
    // Nettoyer le HTML pour éviter les doubles logos et autres problèmes
    let htmlContent = cleanupHtmlContent(reqData.html);
    
    // Log Deno env variables pour le débogage
    console.log("RESEND_API environment variable check:", !!Deno.env.get("RESEND_API"));
    
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

// Fonction pour nettoyer le contenu HTML et éviter les doubles logos
function cleanupHtmlContent(html: string): string {
  // Vérifier et corriger le contenu HTML si nécessaire
  let cleanedHtml = html;
  
  if (!cleanedHtml.trim().startsWith('<')) {
    // Si le contenu HTML ne commence pas par une balise, on l'enveloppe dans un div
    cleanedHtml = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">${cleanedHtml}</div>`;
    console.log("HTML ajusté pour s'assurer du bon format");
  }
  
  // Traiter les chaînes JSON potentielles dans le contenu HTML
  cleanedHtml = cleanupJsonStrings(cleanedHtml);
  
  // Supprimer les logos dupliqués - rechercher les patterns de logos répétés
  cleanedHtml = removeDuplicateLogos(cleanedHtml);
  
  return cleanedHtml;
}

// Fonction pour supprimer les logos dupliqués
function removeDuplicateLogos(html: string): string {
  // Patterns pour détecter les logos dupliqués
  const logoPatterns = [
    /<img[^>]*src[^>]*logo[^>]*>/gi,
    /<img[^>]*alt[^>]*logo[^>]*>/gi,
    /<div[^>]*logo[^>]*>.*?<\/div>/gi
  ];
  
  let cleanedHtml = html;
  let logoCount = 0;
  
  // Compter et supprimer les logos en trop
  logoPatterns.forEach(pattern => {
    const matches = cleanedHtml.match(pattern);
    if (matches && matches.length > 1) {
      console.log(`Détection de ${matches.length} logos, suppression des doublons`);
      // Garder seulement le premier logo
      for (let i = 1; i < matches.length; i++) {
        cleanedHtml = cleanedHtml.replace(matches[i], '');
      }
    }
  });
  
  return cleanedHtml;
}

// Fonction pour nettoyer les chaînes JSON dans le contenu HTML
function cleanupJsonStrings(html: string): string {
  // Rechercher les chaînes qui ressemblent à du JSON en considérant les caractères d'échappement
  const jsonPattern = /(\[{&#34;|\[{")(.*?)("}\]|&#34;}\])/g;
  
  return html.replace(jsonPattern, (match) => {
    try {
      // Convertir les caractères HTML en leurs équivalents
      let cleaned = match
        .replace(/&#34;/g, '"')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      // Tentative de parsing JSON
      const jsonData = JSON.parse(cleaned);
      
      // Si c'est un tableau d'objets avec des détails d'équipement
      if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].title) {
        // Formater en HTML lisible
        let formattedHtml = '<ul style="list-style-type:none; padding:0; margin:10px 0; background-color:#f9f9f9; border-radius:5px; padding:15px;">';
        
        jsonData.forEach(item => {
          formattedHtml += `
            <li style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #eee;">
              <strong>${item.title || 'Équipement'}</strong><br>
              ${item.quantity ? `Quantité: ${item.quantity}<br>` : ''}
              ${item.purchasePrice ? `Prix: ${item.purchasePrice}€<br>` : ''}
              ${item.monthlyPayment ? `Mensualité: ${item.monthlyPayment}€` : ''}
            </li>`;
        });
        
        formattedHtml += '</ul>';
        return formattedHtml;
      }
      
      // Si on ne peut pas formater spécifiquement, au moins rendre lisible
      return JSON.stringify(jsonData, null, 2)
        .replace(/\n/g, '<br>')
        .replace(/ /g, '&nbsp;');
        
    } catch (e) {
      console.log("Erreur lors du traitement JSON:", e);
      // Si erreur de parsing, laisser tel quel
      return match;
    }
  });
}
