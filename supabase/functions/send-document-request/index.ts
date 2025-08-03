import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Créer un client Supabase
const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RequestDocumentsData {
  offerId: string;
  clientEmail: string;
  clientName: string;
  requestedDocs: string[];
  customMessage?: string;
  uploadToken?: string;
}

console.log("=== Function Edge send-document-request initialisée ===");

serve(async (req) => {
  console.log("===== NOUVELLE REQUÊTE REÇUE =====");
  console.log("Méthode:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Requête OPTIONS (CORS preflight) reçue, réponse avec headers CORS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Debug: Afficher les variables d'environnement disponibles
    console.log("=== DEBUG VARIABLES D'ENVIRONNEMENT ===");
    console.log("SUPABASE_URL présent:", !!Deno.env.get("SUPABASE_URL"));
    console.log("SUPABASE_SERVICE_ROLE_KEY présent:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    console.log("RESEND_API_KEY présent:", !!Deno.env.get("RESEND_API_KEY"));
    console.log("APP_URL présent:", !!Deno.env.get("APP_URL"));
    
    // Lister toutes les variables d'environnement qui commencent par "RESEND"
    const envKeys = Object.keys(Deno.env.toObject()).filter(key => key.includes("RESEND"));
    console.log("Variables d'environnement contenant 'RESEND':", envKeys);
    
    // Récupérer le corps de la requête
    let requestData: RequestDocumentsData;
    
    if (req.headers.get("content-type")?.includes("application/json")) {
      const bodyText = await req.text();
      console.log("Corps de la requête brut:", bodyText);
      
      try {
        requestData = JSON.parse(bodyText);
      } catch (parseError) {
        console.error("Erreur lors du parsing JSON:", parseError);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erreur de parsing JSON: ${parseError.message}`,
            receivedBody: bodyText
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } else {
      console.error("Type de contenu non supporté:", req.headers.get("content-type"));
      return new Response(
        JSON.stringify({
          success: false,
          message: "Type de contenu non supporté. Utilisez application/json",
          contentType: req.headers.get("content-type")
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Données de la requête parsed:", JSON.stringify(requestData, null, 2));
    
    const { 
      offerId,
      clientEmail,
      clientName,
      requestedDocs,
      customMessage,
      uploadToken
    } = requestData;
    
    // Validation des données
    if (!offerId) {
      console.error("Offre ID manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Offre ID manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!clientEmail) {
      console.error("Email client manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Email client manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!clientName) {
      console.error("Nom client manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Nom client manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    if (!requestedDocs || !Array.isArray(requestedDocs) || requestedDocs.length === 0) {
      console.error("Documents demandés manquants ou invalides");
      return new Response(
        JSON.stringify({ success: false, message: "Documents demandés manquants ou invalides" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!uploadToken) {
      console.error("Token d'upload manquant");
      return new Response(
        JSON.stringify({ success: false, message: "Token d'upload manquant" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Requête validée pour envoyer un email à:", clientEmail);
    console.log("Documents demandés:", requestedDocs);
    console.log("Token d'upload:", uploadToken);
    
    // Construire l'URL d'upload avec l'URL de base de l'application
    let appUrl = Deno.env.get("APP_URL");
    
    // Fallback : construire l'URL depuis les headers de la requête si APP_URL n'est pas définie
    if (!appUrl) {
      const origin = req.headers.get('origin') || req.headers.get('referer');
      if (origin) {
        try {
          const url = new URL(origin);
          appUrl = `${url.protocol}//${url.host}`;
          console.log("APP_URL non définie, utilisation de l'origin:", appUrl);
        } catch (e) {
          console.warn("Impossible de parser l'origin, utilisation URL par défaut");
          appUrl = 'https://ad498fde-39d4-4047-b0b8-05fb528da9c9.lovableproject.com';
        }
      } else {
        console.warn("APP_URL et origin non disponibles, utilisation URL par défaut");
        appUrl = 'https://ad498fde-39d4-4047-b0b8-05fb528da9c9.lovableproject.com';
      }
    }
    
    // Construire l'URL d'upload avec le company slug (sera déplacé après récupération de l'offre)
    // Cette variable sera définie plus tard une fois qu'on aura le slug de l'entreprise
    
    // Récupérer l'offre pour obtenir le company_id
    console.log("Récupération de l'offre pour obtenir le company_id...");
    const { data: offer, error: offerError } = await supabase
      .from('offers')
      .select('company_id')
      .eq('id', offerId)
      .maybeSingle();
      
    if (offerError || !offer) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Offre non trouvée",
          debug: {
            offerId,
            error: offerError?.message || 'Offer not found'
          }
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Company ID de l'offre:", offer.company_id);
    
    // Récupérer le slug de l'entreprise séparément
    console.log("Récupération du company slug...");
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('slug')
      .eq('id', offer.company_id)
      .maybeSingle();
      
    if (companyError) {
      console.error("Erreur lors de la récupération du company:", companyError);
      // Continuer sans le slug si erreur - fallback sur URL sans slug
      console.log("Continuant sans company slug - utilisation URL par défaut");
    }
    
    const companySlug = company?.slug;
    console.log("Company slug de l'offre:", companySlug);
    
     // Créer une URL de redirection courte pour éviter les problèmes Mac
     const shortUrl = `${appUrl.replace(/\/$/, '')}/r/${uploadToken}`;
     console.log("URL courte générée:", shortUrl);
    
    // Récupérer les paramètres email spécifiques à l'entreprise de l'offre
    console.log("Récupération de la configuration email pour company_id:", offer.company_id);
    const { data: emailConfig, error: emailError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('company_id', offer.company_id)
      .eq('enabled', true)
      .maybeSingle();
      
    if (emailError || !emailConfig) {
      console.error("Erreur lors de la récupération des paramètres email:", emailError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuration email non trouvée ou désactivée",
          details: emailError,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Configuration email récupérée:", {
      from_email: emailConfig.from_email,
      from_name: emailConfig.from_name,
      use_resend: emailConfig.use_resend,
      has_resend_api_key_in_db: !!emailConfig.resend_api_key
    });
    
    // Vérifier que Resend est activé
    if (!emailConfig.use_resend) {
      console.error("Resend n'est pas activé dans la configuration");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Service d'email Resend non activé",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Récupérer la clé API Resend spécifique à l'entreprise
    console.log("=== RÉCUPÉRATION CLÉ API RESEND ===");
    let resendApiKey: string | undefined;
    const companyId = offer.company_id;
    
    // 1. Priorité à la clé API de l'entreprise stockée en BDD
    if (emailConfig.resend_api_key) {
      console.log("Utilisation de la clé API depuis les paramètres SMTP de l'entreprise");
      resendApiKey = emailConfig.resend_api_key;
    }
    // 2. Fallback pour iTakecare uniquement
    else if (companyId === 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0') {
      resendApiKey = Deno.env.get("ITAKECARE_RESEND_API");
      console.log("Utilisation de la clé API iTakecare depuis les secrets:", !!resendApiKey);
    }
    
    // Validation de la clé API
    if (!resendApiKey) {
      console.error("Clé API Resend non configurée pour cette entreprise");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend non configurée. Veuillez configurer vos paramètres SMTP dans les paramètres de l'application.",
          error: "MISSING_RESEND_API_KEY",
          guidance: "Allez dans Paramètres > Email > Configuration d'envoi pour configurer votre clé API Resend"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Vérifier le format de la clé API Resend
    if (!resendApiKey.startsWith('re_')) {
      console.log("Clé API Resend invalide: ne commence pas par 're_'");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend invalide. Veuillez vérifier votre configuration dans les paramètres SMTP.",
          error: "INVALID_RESEND_API_KEY_FORMAT"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Clé API Resend récupérée avec succès");
    
    // Formater les documents demandés pour l'email
    const formattedDocs = requestedDocs.map(doc => {
      if (doc.startsWith('custom:')) {
        return `- ${doc.substring(7)}`;
      } else {
        const docNameMap: {[key: string]: string} = {
          balance_sheet: "Bilan financier",
          tax_notice: "Avertissement extrait de rôle",
          id_card_front: "Carte d'identité - Recto",
          id_card_back: "Carte d'identité - Verso",
          id_card: "Copie de la carte d'identité (recto et verso)",
          company_register: "Extrait de registre d'entreprise",
          vat_certificate: "Attestation TVA",
          bank_statement: "Relevé bancaire des 3 derniers mois"
        };
        return `- ${docNameMap[doc] || doc}`;
      }
    }).join('\n');
    
    // Initialiser Resend
    const resend = new Resend(resendApiKey);
    
    try {
      // Préparer le contenu de l'email
      const emailSubject = "Documents requis - Offre de leasing";
      
      const emailBody = `Bonjour ${clientName},\n\nDocuments requis:\n${formattedDocs}\n\n${customMessage || ''}\n\nVeuillez utiliser ce lien pour uploader vos documents: ${shortUrl}`;
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #2d618f; border-bottom: 1px solid #eee; padding-bottom: 10px;">Bonjour ${clientName},</h2>
          <p>Nous avons besoin des documents suivants pour traiter votre demande de financement :</p>
          <ul style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            ${requestedDocs.map(doc => {
              if (doc.startsWith('custom:')) {
                return `<li>${doc.substring(7)}</li>`;
              } else {
                const docNameMap: {[key: string]: string} = {
                  balance_sheet: "Bilan financier",
                  tax_notice: "Avertissement extrait de rôle",
                  id_card_front: "Carte d'identité - Recto",
                  id_card_back: "Carte d'identité - Verso", 
                  id_card: "Copie de la carte d'identité (recto et verso)",
                  company_register: "Extrait de registre d'entreprise",
                  vat_certificate: "Attestation TVA",
                  bank_statement: "Relevé bancaire des 3 derniers mois"
                };
                return `<li>${docNameMap[doc] || doc}</li>`;
              }
            }).join('')}
          </ul>
          ${customMessage ? `<p><strong>Message personnalisé :</strong><br>${customMessage}</p>` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${shortUrl}" 
               target="_blank" 
               rel="noopener noreferrer"
               style="display: inline-block; background-color: #2d618f; color: white; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px; word-wrap: break-word;">
              📎 Uploader mes documents
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <span style="color: #2d618f; word-break: break-all; font-family: monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">${shortUrl}</span></p>
          
          <p>Merci de nous faire parvenir ces documents dans les meilleurs délais.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">
            Cordialement,<br>
            L'équipe ${emailConfig.from_name || 'iTakecare'}
          </p>
        </div>
      `;
      
      console.log("Préparation de l'email pour:", clientEmail);
      console.log("Sujet:", emailSubject);
      
      // Format RFC-compliant pour le champ From
      const fromField = `${emailConfig.from_name || 'iTakecare'} <${emailConfig.from_email}>`;
      console.log("From field format:", fromField);
      
      console.log("Tentative d'envoi d'email via Resend...");
      
      // Envoi de l'email avec Resend
      const emailResult = await resend.emails.send({
        from: fromField,
        to: clientEmail,
        subject: emailSubject,
        text: emailBody,
        html: htmlBody,
      });
      
      if (emailResult.error) {
        console.error("Erreur lors de l'envoi via Resend:", emailResult.error);
        return new Response(
          JSON.stringify({
            success: false,
            message: `Erreur lors de l'envoi de l'email: ${emailResult.error.message}`,
            details: emailResult.error,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      console.log("Email envoyé avec succès via Resend:", emailResult.data);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email envoyé avec succès",
          details: emailResult.data
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email via Resend:", emailError);
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur lors de l'envoi de l'email: ${emailError.message}`,
          details: JSON.stringify(emailError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    console.error("Détails de l'erreur:", JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Erreur: ${error.message}`,
        details: JSON.stringify(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
