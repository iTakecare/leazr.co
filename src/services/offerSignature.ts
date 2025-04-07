
import { supabase } from "@/integrations/supabase/client";

interface SignatureData {
  signature: string;
  name: string;
}

export const signOffer = async (offerId: string, signatureData: SignatureData) => {
  const { data, error } = await supabase
    .from('offers')
    .update({
      signature: signatureData.signature,
      signature_name: signatureData.name,
      signed_at: new Date().toISOString(),
      status: 'signed',
      workflow_status: 'signed',
    })
    .eq('id', offerId)
    .select();

  if (error) {
    console.error("Erreur lors de la signature:", error);
    throw error;
  }

  return data;
};

export const generateOfferPdf = async (offerId: string) => {
  try {
    // Appel à la fonction Edge pour générer le PDF
    const { data, error } = await supabase.functions.invoke('generate-offer-pdf', {
      body: { offerId }
    });

    if (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      throw error;
    }

    return data.pdfUrl;
  } catch (error) {
    console.error("Erreur lors de la génération du PDF:", error);
    throw error;
  }
};
