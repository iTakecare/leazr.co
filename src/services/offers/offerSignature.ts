
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Sauvegarde une signature pour une offre
 */
export const saveOfferSignature = async (
  offerId: string,
  signatureData: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .update({
        is_signed: true,
        signature_date: new Date().toISOString(),
        signature_data: signatureData,
        status: 'accepted',
        workflow_status: 'client_signed'
      })
      .eq('id', offerId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la signature:", error);
    toast.error("Une erreur est survenue lors de la signature de l'offre");
    return false;
  }
};

/**
 * Vérifie si une offre a déjà été signée
 */
export const checkOfferSignature = async (offerId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('is_signed')
      .eq('id', offerId)
      .single();

    if (error) throw error;
    
    return data?.is_signed || false;
  } catch (error) {
    console.error("Erreur lors de la vérification de la signature:", error);
    return false;
  }
};
