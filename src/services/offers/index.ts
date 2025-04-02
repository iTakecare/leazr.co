// Exporter toutes les fonctions de services des offres
export * from './createOffer';
export * from './getOffers';
export * from './offerDetail';
export * from './offerStatus';
export * from './offerWorkflow';
export * from './clientRequests';
export * from './types';

// Exportations spécifiques pour éviter l'ambiguïté
import { generateAndDownloadOfferPdf, getOfferDataForPdf, generateSamplePdf } from './offerPdf';
import { isOfferSigned, saveOfferSignature, generateSignatureLink } from './offerSignature';

// Ré-exporter explicitement pour résoudre l'ambiguïté
export {
  generateAndDownloadOfferPdf,
  getOfferDataForPdf,
  generateSamplePdf,
  isOfferSigned,
  saveOfferSignature,
  generateSignatureLink
};

import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

export const createOffer = async (offerData: OfferData) => {
  try {
    // Ajout de ambassador_id à l'offre si c'est une offre d'ambassadeur
    if (offerData.type === 'ambassador_offer' && offerData.user_id) {
      // Récupérer l'ambassador_id associé à cet utilisateur
      const { data: ambassadorData, error: ambassadorError } = await supabase
        .from('ambassadors')
        .select('id')
        .eq('user_id', offerData.user_id)
        .single();
        
      if (!ambassadorError && ambassadorData) {
        offerData.ambassador_id = ambassadorData.id;
      }
    }
    
    const { data, error } = await supabase
      .from('offers')
      .insert(offerData)
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    console.error("Error in createOffer:", error);
    return { data: null, error };
  }
};
