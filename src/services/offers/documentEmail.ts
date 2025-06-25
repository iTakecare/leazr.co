
import { supabase } from "@/integrations/supabase/client";
import { createUploadLink, DOCUMENT_TYPES } from "./offerDocuments";

interface SendDocumentRequestParams {
  offerClientEmail: string;
  offerClientName: string;
  offerId: string;
  requestedDocuments: string[];
  customMessage?: string;
}

export const sendDocumentRequestEmail = async ({
  offerClientEmail,
  offerClientName,
  offerId,
  requestedDocuments,
  customMessage
}: SendDocumentRequestParams): Promise<boolean> => {
  try {
    console.log("📧 Envoi de la demande de documents:", {
      email: offerClientEmail,
      offerId,
      documents: requestedDocuments
    });

    // Créer le lien d'upload sécurisé
    const token = await createUploadLink(offerId, requestedDocuments, customMessage);
    if (!token) {
      throw new Error("Impossible de créer le lien d'upload");
    }

    // Construire l'URL d'upload
    const uploadUrl = `${window.location.origin}/offer/documents/upload/${token}`;

    // Préparer la liste des documents demandés
    const documentsList = requestedDocuments.map(doc => {
      const isCustom = doc.startsWith('custom:');
      const docName = isCustom ? doc.replace('custom:', '') : DOCUMENT_TYPES[doc] || doc;
      return `• ${docName}`;
    }).join('\n');

    // Préparer le contenu de l'email
    const emailSubject = `Documents requis pour votre dossier de financement`;
    
    const emailContent = `
Bonjour ${offerClientName},

Nous avons besoin de documents supplémentaires pour finaliser votre dossier de financement.

Documents demandés :
${documentsList}

${customMessage ? `Message personnalisé :\n${customMessage}\n\n` : ''}

Pour uploader vos documents, veuillez cliquer sur le lien suivant :
${uploadUrl}

Ce lien est valide pendant 7 jours. Tous vos documents seront sécurisés et traités en toute confidentialité.

Si vous avez des questions, n'hésitez pas à nous contacter.

Cordialement,
L'équipe iTakecare
    `.trim();

    // Appeler l'edge function pour envoyer l'email
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: offerClientEmail,
        subject: emailSubject,
        text: emailContent,
        html: emailContent.replace(/\n/g, '<br>')
      }
    });

    if (error) {
      console.error("❌ Erreur lors de l'envoi de l'email:", error);
      return false;
    }

    console.log("✅ Email de demande de documents envoyé avec succès");
    return true;

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la demande de documents:", error);
    return false;
  }
};
