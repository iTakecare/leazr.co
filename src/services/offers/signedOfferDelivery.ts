import { supabase, getFileUploadClient } from '@/integrations/supabase/client';
import { generateCommercialOfferPDF } from '@/services/commercialOfferPdfService';

export interface SignedOfferDeliveryResult {
  archived: boolean;
  clientEmailSent: boolean;
  internalEmailSent: boolean;
}

/**
 * Après signature en ligne : génère le PDF (certificat de signature inclus),
 * l'archive dans les documents du dossier, et déclenche les envois au client et
 * à l'équipe.
 *
 * Le PDF ne peut être produit que dans le navigateur — le rendu s'appuie sur
 * html2canvas — d'où cette orchestration côté client. Mais rien n'est écrit en
 * base ni envoyé d'ici : tout passe par l'edge function, qui vérifie que
 * l'offre est bien signée avant d'agir.
 *
 * Si la génération ou l'upload échoue, on déclenche quand même les envois sans
 * pièce jointe : une signature doit toujours prévenir quelqu'un.
 */
export const archiveAndSendSignedOffer = async (
  offerId: string
): Promise<SignedOfferDeliveryResult> => {
  let pdfPath: string | null = null;

  try {
    const { data: prepared, error: prepareError } = await supabase.functions.invoke(
      'signed-offer-delivery',
      { body: { action: 'prepare', offer_id: offerId } }
    );

    if (prepareError || !prepared?.token) {
      throw new Error(prepareError?.message ?? "URL d'upload indisponible");
    }

    const blob = await generateCommercialOfferPDF(offerId);

    // getFileUploadClient : le client principal impose des en-têtes globaux qui
    // font stocker le Blob en multipart brut au lieu du PDF.
    const { error: uploadError } = await getFileUploadClient()
      .storage.from('offer-documents')
      .uploadToSignedUrl(prepared.path, prepared.token, blob, {
        contentType: 'application/pdf',
      });

    if (uploadError) throw uploadError;
    pdfPath = prepared.path;
  } catch (error) {
    // Volontairement non bloquant : on continue vers l'envoi sans pièce jointe.
    console.error('❌ Archivage du PDF signé impossible:', error);
  }

  const { data, error } = await supabase.functions.invoke('signed-offer-delivery', {
    body: { action: 'send', offer_id: offerId, pdf_path: pdfPath },
  });

  if (error) {
    console.error("❌ Envoi de l'offre signée impossible:", error);
    return { archived: false, clientEmailSent: false, internalEmailSent: false };
  }

  return {
    archived: !!data?.archived,
    clientEmailSent: !!data?.client_email_sent,
    internalEmailSent: !!data?.internal_email_sent,
  };
};
