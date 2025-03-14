
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
  console.log("Méthode: ", req.method);
  console.log("URL: ", req.url);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Requête OPTIONS (CORS preflight) reçue, réponse avec headers CORS");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Récupérer les données de la requête
    const requestBody = await req.text();
    console.log("Corps de la requête brut:", requestBody);
    
    const requestData = JSON.parse(requestBody);
    console.log("Données de la requête parsed:", JSON.stringify(requestData, null, 2));
    
    const { 
      offerId,
      clientEmail,
      clientName,
      requestedDocs,
      customMessage
    } = requestData as RequestDocumentsData;
    
    if (!offerId || !clientEmail || !clientName || !requestedDocs) {
      console.error("Données manquantes dans la requête");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Données manquantes: offerId, clientEmail, clientName et requestedDocs sont requis",
        }),
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
      
      // Vérifier que toutes les propriétés nécessaires sont définies
      if (!clientEmail || !fromField || !emailSubject || !emailBody) {
        throw new Error("Propriétés d'email manquantes");
      }
      
      console.log("Tentative d'envoi d'email...");
      
      // Envoi de l'email avec des options simples pour maximiser la compatibilité
      const emailResult = await client.send({
        from: fromField,
        to: clientEmail,
        subject: emailSubject,
        // Inclure les deux formats: text et html
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
