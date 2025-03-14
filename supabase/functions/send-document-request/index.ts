
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.3.0/mod.ts";

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
    
    // Récupérer les paramètres SMTP depuis la base de données
    console.log("Récupération de la configuration SMTP depuis la base de données...");
    const { data: smtpConfig, error: smtpError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('enabled', true)
      .single();
      
    if (smtpError) {
      console.error("Erreur lors de la récupération des paramètres SMTP:", smtpError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Configuration SMTP non trouvée ou désactivée",
          details: smtpError,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    console.log("Configuration SMTP récupérée:", {
      host: smtpConfig.host,
      port: smtpConfig.port,
      username: smtpConfig.username,
      secure: smtpConfig.secure,
      from_email: smtpConfig.from_email,
      from_name: smtpConfig.from_name
    });
    
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
    
    // Configurer le client SMTP
    console.log("Configuration du client SMTP avec les paramètres suivants:");
    console.log({
      hostname: smtpConfig.host,
      port: parseInt(smtpConfig.port),
      tls: smtpConfig.secure,
      auth: {
        username: smtpConfig.username,
        password: "***HIDDEN***" // Ne pas logger le mot de passe
      }
    });
    
    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.host,
        port: parseInt(smtpConfig.port),
        tls: smtpConfig.secure,
        auth: {
          username: smtpConfig.username,
          password: smtpConfig.password,
        },
      },
    });

    try {
      // Préparer le contenu de l'email
      const emailSubject = "Documents requis - Offre de leasing";
      const emailBody = `Bonjour ${clientName},\n\nDocuments requis:\n${formattedDocs}\n\n${customMessage || ''}`;
      const htmlBody = `<p>Bonjour ${clientName},</p><p>Documents requis:</p><ul>${requestedDocs.map(doc => {
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
      }).join('')}</ul>${customMessage ? `<p>${customMessage}</p>` : ''}`;
      
      console.log("Préparation de l'email pour:", clientEmail);
      console.log("Sujet:", emailSubject);
      console.log("Contenu texte (aperçu):", emailBody.substring(0, 100) + "...");
      
      // Format RFC-compliant pour le champ From
      const fromField = `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`;
      console.log("From field format:", fromField);
      
      console.log("Tentative d'envoi d'email...");
      
      // Envoi de l'email avec des options simples pour maximiser la compatibilité
      const emailResult = await client.send({
        from: fromField,
        to: clientEmail,
        subject: emailSubject,
        content: "text/plain; charset=utf-8",
        text: emailBody,
        html: htmlBody,
        // Ajouter des en-têtes supplémentaires pour éviter le spam
        headers: {
          "X-Priority": "1",
          "X-MSMail-Priority": "High",
          "Importance": "High"
        }
      });
      
      console.log("Résultat de l'envoi:", JSON.stringify(emailResult, null, 2));
      
      // Fermez proprement la connexion après utilisation
      await client.close();
      
      console.log("Email envoyé avec succès à:", clientEmail);
      console.log("Connexion SMTP fermée");
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email envoyé avec succès",
          details: emailResult
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError);
      console.error("Détails de l'erreur:", JSON.stringify(emailError, null, 2));
      
      try {
        await client.close();
        console.log("Connexion SMTP fermée après erreur");
      } catch (closeError) {
        console.error("Erreur supplémentaire lors de la fermeture du client:", closeError);
      }
      
      return new Response(
        JSON.stringify({
          success: false,
          message: `Erreur lors de l'envoi de l'email: ${emailError.message}`,
          details: JSON.stringify(emailError),
        }),
        {
          status: 200,
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
