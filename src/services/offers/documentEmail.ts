
import { supabase } from "@/integrations/supabase/client";
import { createUploadLink, DOCUMENT_TYPES } from "./offerDocuments";

interface SendDocumentRequestParams {
  offerClientEmail: string;
  offerClientName: string;
  offerId: string;
  requestedDocuments: string[];
  customMessage?: string;
  requestedBy?: 'internal' | 'leaser'; // Nouveau: identifier qui demande les documents
}

export const sendDocumentRequestEmail = async ({
  offerClientEmail,
  offerClientName,
  offerId,
  requestedDocuments,
  customMessage,
  requestedBy = 'internal'
}: SendDocumentRequestParams): Promise<boolean> => {
  try {
    console.log("📧 Envoi de la demande de documents:", {
      email: offerClientEmail,
      offerId,
      documents: requestedDocuments
    });

    // Créer le lien d'upload sécurisé
    const token = await createUploadLink(offerId, requestedDocuments, customMessage, requestedBy);
    if (!token) {
      throw new Error("Impossible de créer le lien d'upload");
    }

    console.log("🔐 Token d'upload créé:", token);

    // Préparer la liste des documents demandés
    const documentsList = requestedDocuments.map(doc => {
      const isCustom = doc.startsWith('custom:');
      const docName = isCustom ? doc.replace('custom:', '') : DOCUMENT_TYPES[doc] || doc;
      return isCustom ? `custom:${docName}` : doc;
    });

    console.log("📋 Documents à demander:", documentsList);

    // Appeler l'edge function send-document-request avec le token
    const { data, error } = await supabase.functions.invoke('send-document-request', {
      body: {
        offerId,
        clientEmail: offerClientEmail,
        clientName: offerClientName,
        requestedDocs: documentsList,
        customMessage: customMessage || undefined,
        uploadToken: token
      }
    });

    if (error) {
      console.error("❌ Erreur lors de l'envoi de l'email:", error);
      return false;
    }

    if (data && data.success) {
      console.log("✅ Email de demande de documents envoyé avec succès avec lien d'upload");
      return true;
    } else {
      console.error("❌ Échec de l'envoi:", data?.message || "Raison inconnue");
      console.error("❌ Détails debug:", data?.debug || "Aucun détail");
      return false;
    }

  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de la demande de documents:", error);
    return false;
  }
};
