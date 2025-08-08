
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Configuration CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Fonction helper pour récupérer le company_id depuis le JWT
async function getUserCompanyId(supabase: any, authHeader: string | null): Promise<string | null> {
  if (!authHeader) {
    console.error("Header d'autorisation manquant");
    return null;
  }

  try {
    // Extraire le token du header
    const token = authHeader.replace('Bearer ', '');
    
    // Récupérer l'utilisateur depuis le token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return null;
    }

    // Récupérer le profil utilisateur pour obtenir le company_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error("Erreur lors de la récupération du profil:", profileError);
      return null;
    }

    console.log("Company ID récupéré avec succès:", profile.company_id);
    return profile.company_id;
  } catch (error) {
    console.error("Erreur lors de l'extraction du company_id:", error);
    return null;
  }
}

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
    
    // Récupérer le company_id de l'utilisateur authentifié
    const authHeader = req.headers.get('authorization');
    const companyId = await getUserCompanyId(supabase, authHeader);
    
    if (!companyId) {
      console.error("Impossible de récupérer le company_id de l'utilisateur");
      throw new Error("Utilisateur non authentifié ou company_id manquant");
    }
    
    console.log("Récupération des paramètres SMTP pour company_id:", companyId);
    
    // Récupérer les paramètres SMTP spécifiques à l'entreprise de l'utilisateur
    const { data: smtpSettings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('resend_api_key, from_email, from_name, company_id')
      .eq('company_id', companyId)
      .eq('enabled', true)
      .single();
    
    if (settingsError) {
      console.log("Paramètres SMTP spécifiques non trouvés, utilisation du fallback:", settingsError.message);
    }
    
    // Déterminer quelle clé API Resend utiliser (source de base)
    const FALLBACK_FROM_EMAIL = 'noreply@leazr.co';
    const FALLBACK_FROM_NAME = 'Leazr';
    const fallbackApiKey = Deno.env.get("LEAZR_RESEND_API") || '';

    let fromEmailDefault = FALLBACK_FROM_EMAIL;
    let fromNameDefault = FALLBACK_FROM_NAME;

    const rawCompanyKey = (smtpSettings?.resend_api_key || '').trim();
    const isValidCompanyKey = rawCompanyKey !== '' && !/(placeholder|your|demo)/i.test(rawCompanyKey);

    let baseApiKey = isValidCompanyKey ? rawCompanyKey : fallbackApiKey;

    if (isValidCompanyKey) {
      console.log("Utilisation de la clé API Resend de l'entreprise");
      fromEmailDefault = smtpSettings?.from_email || fromEmailDefault;
      fromNameDefault = smtpSettings?.from_name || fromNameDefault;
    } else {
      console.log("Utilisation de la clé API Resend de fallback (LEAZR_RESEND_API)");
    }

    if (!baseApiKey) {
      console.error("Aucune clé API Resend disponible");
      throw new Error("Configuration API Resend manquante");
    }

    // Sélection intelligente du FROM et de la clé en fonction du domaine demandé
    const requestedFromName = reqData.from?.name;
    const requestedFromEmail = reqData.from?.email;
    const requestedDomain = requestedFromEmail?.split('@')[1]?.toLowerCase();

    let finalFromName = fromNameDefault;
    let finalFromEmail = fromEmailDefault;
    let usedApiKey = baseApiKey as string;
    let usedKeySource: 'company' | 'itakecare' | 'fallback' = isValidCompanyKey ? 'company' : 'fallback';

    if (usedKeySource === 'fallback') {
      // Si la clé fallback est utilisée, on ne peut pas envoyer avec un domaine non vérifié
      if (requestedDomain) {
        // Cas spécifique: domaine itakecare.be avec clé dédiée optionnelle
        if (requestedDomain === 'itakecare.be') {
          const itakecareKey = Deno.env.get('ITAKECARE_RESEND_API');
          if (itakecareKey && itakecareKey.trim() !== '') {
            console.log("Clé spécifique ITAKECARE_RESEND_API détectée, utilisation de cette clé et du FROM demandé");
            usedApiKey = itakecareKey;
            usedKeySource = 'itakecare';
            finalFromName = requestedFromName || fromNameDefault;
            finalFromEmail = requestedFromEmail || fromEmailDefault;
          } else {
            console.log("Domaine itakecare.be non vérifié avec la clé fallback: override du FROM vers noreply@leazr.co");
            finalFromName = fromNameDefault;
            finalFromEmail = fromEmailDefault;
          }
        } else if (requestedDomain !== 'leazr.co' && requestedDomain !== 'resend.dev') {
          console.log(`Domaine ${requestedDomain} non vérifié pour la clé fallback: override du FROM vers ${fromEmailDefault}`);
          finalFromName = fromNameDefault;
          finalFromEmail = fromEmailDefault;
        } else {
          finalFromName = requestedFromName || fromNameDefault;
          finalFromEmail = requestedFromEmail || fromEmailDefault;
        }
      } else {
        // Pas de FROM fourni, on utilise le fallback par défaut
        finalFromName = fromNameDefault;
        finalFromEmail = fromEmailDefault;
      }
    } else {
      // Avec la clé entreprise, on respecte le FROM demandé
      finalFromName = requestedFromName || fromNameDefault;
      finalFromEmail = requestedFromEmail || fromEmailDefault;
    }

    // Initialiser Resend avec la clé finale
    const resend = new Resend(usedApiKey);

    // Construire le From final
    const from = `${finalFromName} <${finalFromEmail}>`;

    console.log("Configuration d'envoi finale:", {
      keySource: usedKeySource,
      from
    });

    // Préparer le contenu texte si non fourni
    const textContent = reqData.text || stripHtml(reqData.html);

    console.log(`Tentative d'envoi d'email via Resend à ${reqData.to} depuis ${from}`);
    
    // Nettoyer le HTML pour éviter les doubles logos et autres problèmes
    let htmlContent = cleanupHtmlContent(reqData.html);
    
    // Log Deno env variables pour le débogage
    console.log("LEAZR_RESEND_API environment variable check:", !!Deno.env.get("LEAZR_RESEND_API"));
    
    let sendData: any = null;
    try {
      const { data, error } = await resend.emails.send({
        from,
        to: reqData.to,
        subject: reqData.subject,
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        throw error;
      }
      sendData = data;
    } catch (err: any) {
      const msg = `${err?.error || err?.message || ''}`.toLowerCase();
      const status = err?.statusCode || err?.status || 0;
      console.error("Erreur Resend:", err);

      if (status === 403 && msg.includes('not verified')) {
        // Retry with LEAZR fallback key and FROM
        const retryKey = Deno.env.get("LEAZR_RESEND_API");
        if (retryKey) {
          const retryFrom = `${FALLBACK_FROM_NAME} <${FALLBACK_FROM_EMAIL}>`;
          console.log("Retry envoi avec clé fallback et FROM:", retryFrom);
          const retryClient = new Resend(retryKey);
          const { data: retryData, error: retryError } = await retryClient.emails.send({
            from: retryFrom,
            to: reqData.to,
            subject: reqData.subject,
            html: htmlContent,
            text: textContent,
          });
          if (retryError) {
            console.error("Erreur lors du retry Resend:", retryError);
            throw retryError;
          }
          sendData = retryData;
        } else {
          console.error("Clé fallback LEAZR_RESEND_API manquante pour le retry");
          throw err;
        }
      } else {
        throw err;
      }
    }

    console.log("Email envoyé avec succès via Resend:", sendData);
    
    return new Response(
      JSON.stringify({ success: true, data: sendData }),
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
