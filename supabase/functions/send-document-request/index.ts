
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Récupérer les données de la requête
    const { 
      offerId,
      clientEmail,
      clientName,
      requestedDocs,
      customMessage
    } = await req.json() as RequestDocumentsData;
    
    // Récupérer les paramètres SMTP depuis la base de données
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
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
    
    // Formater la liste des documents demandés pour l'email
    let docsHtml = '<ul>';
    requestedDocs.forEach(doc => {
      // Extraire le nom du document personnalisé si présent (format "custom:Nom du document")
      if (doc.startsWith('custom:')) {
        docsHtml += `<li>${doc.substring(7)}</li>`;
      } else {
        // Mapper les identifiants standard à des noms lisibles
        const docNameMap: {[key: string]: string} = {
          balance_sheet: "Bilan financier",
          tax_notice: "Avertissement extrait de rôle",
          id_card: "Copie de la carte d'identité",
          company_register: "Extrait de registre d'entreprise",
          vat_certificate: "Attestation TVA",
          bank_statement: "Relevé bancaire des 3 derniers mois"
        };
        docsHtml += `<li>${docNameMap[doc] || doc}</li>`;
      }
    });
    docsHtml += '</ul>';
    
    // Créer un client SMTP avec configuration explicite
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
      // Construire le contenu de l'email
      const subject = "Demande de documents complémentaires pour votre offre de leasing";
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Documents complémentaires requis</h2>
          <p>Bonjour ${clientName},</p>
          <p>Nous avons besoin des documents suivants pour poursuivre l'analyse de votre offre de leasing :</p>
          ${docsHtml}
          ${customMessage ? `<p><strong>Message de l'équipe :</strong></p><p>${customMessage}</p>` : ''}
          <p>Merci de nous fournir ces documents dès que possible afin que nous puissions finaliser votre dossier.</p>
          <p>Vous pouvez répondre directement à cet email en attachant les documents demandés.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">
            Cet email est envoyé automatiquement par l'application de gestion de leasing.
          </p>
        </div>
      `;
      
      // Envoyer l'email avec headers explicites
      await client.send({
        from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
        to: clientEmail,
        subject: subject,
        content: "Veuillez activer l'affichage HTML pour visualiser correctement ce message.",
        html: htmlContent,
        headers: {
          "Content-Type": "text/html; charset=UTF-8"
        }
      });

      // Fermer la connexion
      await client.close();
      
      console.log("Email envoyé avec succès à:", clientEmail);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "Email envoyé avec succès",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError);
      
      // Fermer la connexion en cas d'erreur
      await client.close();
      
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
    console.error("Erreur lors de l'envoi de l'email:", error);
    
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
