
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
}

console.log("=== Function Edge send-document-request initialisée ===");

serve(async (req) => {
  console.log("===== NOUVELLE REQUÊTE REÇUE =====");
  console.log("Méthode:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Requête OPTIONS (CORS preflight) reçue, réponse avec headers CORS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Afficher le type de contenu
    console.log("Content-Type:", req.headers.get("content-type"));
    
    // Récupérer le corps de la requête selon le Content-Type
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
      // Fallback pour d'autres types de contenu
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
      customMessage
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
    
    console.log("Requête validée pour envoyer un email à:", clientEmail);
    console.log("Documents demandés:", requestedDocs);
    
    // Récupérer les paramètres email depuis la base de données
    console.log("Récupération de la configuration email depuis la base de données...");
    const { data: emailConfig, error: emailError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('enabled', true)
      .single();
      
    if (emailError) {
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
      use_resend: emailConfig.use_resend
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
    
    // Récupérer la clé API Resend depuis les secrets
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("Clé API Resend non configurée");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Clé API Resend non configurée",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Formater les documents demandés pour l'email
    const formattedDocs = requestedDocs.map(doc => {
      if (doc.startsWith('custom:')) {
        return `- ${doc.substring(7)}`;
      } else {
        const docNameMap: {[key: string]: string} = {
          balance_sheet: "Bilan financier",
          tax_notice: "Avertissement extrait de rôle",
          id_card: "Copie de la carte d'identité",
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
      const emailBody = `Bonjour ${clientName},\n\nDocuments requis:\n${formattedDocs}\n\n${customMessage || ''}`;
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
                  id_card: "Copie de la carte d'identité",
                  company_register: "Extrait de registre d'entreprise",
                  vat_certificate: "Attestation TVA",
                  bank_statement: "Relevé bancaire des 3 derniers mois"
                };
                return `<li>${docNameMap[doc] || doc}</li>`;
              }
            }).join('')}
          </ul>
          ${customMessage ? `<p><strong>Message personnalisé :</strong><br>${customMessage}</p>` : ''}
          <p>Merci de nous faire parvenir ces documents dans les meilleurs délais.</p>
          <p style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #eee;">
            Cordialement,<br>
            L'équipe ${emailConfig.from_name || 'iTakecare'}
          </p>
        </div>
      `;
      
      console.log("Préparation de l'email pour:", clientEmail);
      console.log("Sujet:", emailSubject);
      console.log("Contenu texte (aperçu):", emailBody.substring(0, 100) + "...");
      
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
