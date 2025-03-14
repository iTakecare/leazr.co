
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RequestInfoData {
  offerId: string;
  requestedDocs: string[];
  customMessage?: string;
  previousStatus: string;
}

// Cette fonction simule l'envoi d'un email au client
export const sendInfoRequest = async (data: RequestInfoData): Promise<boolean> => {
  try {
    console.log("Sending info request to client for offer:", data.offerId);
    console.log("Requested documents:", data.requestedDocs);
    
    // Normalement, on enverrait un email ici via une fonction Edge
    // Pour l'instant, on simule juste l'envoi
    
    // 1. Log la demande dans la base de données
    const { error } = await supabase
      .from('offer_info_requests')
      .insert({
        offer_id: data.offerId,
        requested_documents: data.requestedDocs,
        message: data.customMessage,
        status: 'pending'
      });
      
    if (error) {
      console.error("Error logging info request:", error);
      return false;
    }
    
    // 2. Mettre à jour le statut de l'offre
    await supabase
      .from('offers')
      .update({ 
        workflow_status: 'info_requested',
        previous_status: data.previousStatus
      })
      .eq('id', data.offerId);
    
    // Simuler un délai pour l'envoi d'email
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error("Error sending info request:", error);
    return false;
  }
};

// Cette fonction traite la réponse après réception des infos
export const processInfoResponse = async (
  offerId: string, 
  approve: boolean
): Promise<boolean> => {
  try {
    // Récupérer le statut précédent
    const { data: offerData, error: fetchError } = await supabase
      .from('offers')
      .select('previous_status')
      .eq('id', offerId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Définir le nouveau statut en fonction de la décision
    const newStatus = approve 
      ? 'leaser_review' // Approuvé, donc envoyé au bailleur
      : 'rejected';     // Refusé
    
    // Mettre à jour le statut de l'offre
    const { error } = await supabase
      .from('offers')
      .update({ 
        workflow_status: newStatus,
        previous_status: null
      })
      .eq('id', offerId);
      
    if (error) throw error;
    
    // Mettre à jour le statut de la demande d'informations
    await supabase
      .from('offer_info_requests')
      .update({ 
        status: approve ? 'approved' : 'rejected',
        response_date: new Date().toISOString()
      })
      .eq('offer_id', offerId)
      .eq('status', 'pending');
    
    return true;
  } catch (error) {
    console.error("Error processing info response:", error);
    return false;
  }
};
