
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
    
    // Formater les documents demandés pour l'email en texte simple
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
      // Construire le contenu de l'email en texte simple uniquement
      const subject = "Demande de documents complémentaires pour votre offre de leasing";
      const emailContent = `
Bonjour ${clientName},

Nous avons besoin des documents suivants pour poursuivre l'analyse de votre offre de leasing :
${formattedDocs}

${customMessage ? `Message de l'équipe :\n${customMessage}\n\n` : ''}

Merci de nous fournir ces documents dès que possible afin que nous puissions finaliser votre dossier.
Vous pouvez répondre directement à cet email en attachant les documents demandés.

Cet email est envoyé automatiquement par l'application de gestion de leasing.
      `;
      
      // Envoyer l'email simplifié sans HTML
      await client.send({
        from: `${smtpConfig.from_name} <${smtpConfig.from_email}>`,
        to: clientEmail,
        subject: subject,
        content: emailContent
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
