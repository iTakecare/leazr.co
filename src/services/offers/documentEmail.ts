
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
      return docName;
    });

    // Appeler l'edge function send-document-request
    const { data, error } = await supabase.functions.invoke('send-document-request', {
      body: {
        offerId,
        clientEmail: offerClientEmail,
        clientName: offerClientName,
        requestedDocs: documentsList,
        customMessage: customMessage || undefined
      }
    });

    if (error) {
      console.error("❌ Erreur lors de l'envoi de l'email:", error);
      return false;
    }

    if (data && data.success) {
      console.log("✅ Email de demande de documents envoyé avec succès");
      return true;
    } else {
      console.error("❌ Échec de l'envoi:", data?.message || "Raison inconnue");
      return false;
    }

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la demande de documents:", error);
    return false;
  }
};
