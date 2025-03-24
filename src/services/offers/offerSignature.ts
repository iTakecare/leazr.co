import { getSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Récupère une offre pour affichage et signature par le client
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        client:client_id (name, email),
        equipment:equipment (*)
      `)
      .eq('id', offerId)
      .single();
      
    if (error) {
      console.error("Error fetching offer for client:", error);
      return null;
    }
    
    // Transformer les données pour une utilisation plus facile
    const offer = {
      id: data.id,
      client_name: data.client?.name || "Client inconnu",
      client_email: data.client?.email || "",
      amount: data.amount || 0,
      monthly_payment: data.monthly_payment || 0,
      equipment_list: data.equipment || [],
      // Autres champs nécessaires
    };
    
    return offer;
  } catch (error) {
    console.error("Exception getting offer for client:", error);
    return null;
  }
};

/**
 * Vérifie si une offre a déjà été signée
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('offer_signatures')
      .select('id')
      .eq('offer_id', offerId)
      .maybeSingle();
      
    if (error) {
      console.error("Error checking if offer is signed:", error);
      return false;
    }
    
    return !!data;
  } catch (error) {
    console.error("Exception checking if offer is signed:", error);
    return false;
  }
};

/**
 * Génère un lien de signature pour une offre
 */
export const generateSignatureLink = (offerId: string): string => {
  if (!offerId) return "";
  
  // Générer l'URL complète pour la signature de l'offre
  const baseUrl = window.location.origin;
  return `${baseUrl}/signature/${offerId}`;
};

/**
 * Enregistre la signature d'une offre
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureImage: string,
  signerName: string
): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    
    // Enregistrer l'image de signature dans le stockage
    const timestamp = new Date().getTime();
    const filePath = `signatures/${offerId}_${timestamp}.png`;
    
    // Convertir le Data URL en Blob
    const base64Data = signatureImage.split(',')[1];
    const blob = await fetch(`data:image/png;base64,${base64Data}`).then(res => res.blob());
    
    // Upload de l'image
    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (uploadError) {
      console.error("Error uploading signature:", uploadError);
      toast.error("Erreur lors de l'enregistrement de la signature");
      return false;
    }
    
    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from('signatures')
      .getPublicUrl(filePath);
      
    if (!urlData || !urlData.publicUrl) {
      console.error("Error getting signature public URL");
      toast.error("Erreur lors de la récupération de l'URL de signature");
      return false;
    }
    
    // Enregistrer la signature dans la base de données
    const { error: dbError } = await supabase
      .from('offer_signatures')
      .upsert({
        offer_id: offerId,
        signer_name: signerName,
        signature_url: urlData.publicUrl,
        signed_at: new Date().toISOString()
      });
      
    if (dbError) {
      console.error("Error saving signature record:", dbError);
      toast.error("Erreur lors de l'enregistrement de la signature");
      return false;
    }
    
    // Mettre à jour le statut de l'offre
    const { error: statusError } = await supabase
      .from('offers')
      .update({ status: 'signed', updated_at: new Date().toISOString() })
      .eq('id', offerId);
      
    if (statusError) {
      console.error("Error updating offer status:", statusError);
      // Ne pas échouer si seul le changement de statut échoue
    }
    
    return true;
  } catch (error) {
    console.error("Exception saving offer signature:", error);
    toast.error("Une erreur est survenue lors de l'enregistrement de la signature");
    return false;
  }
};
