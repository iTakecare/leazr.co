
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RequestInfoData {
  offerId: string;
  requestedDocs: string[];
  customMessage?: string;
  previousStatus: string;
}

export const sendInfoRequest = async (data: RequestInfoData): Promise<boolean> => {
  try {
    console.log("Sending info request to client for offer:", data.offerId);
    console.log("Requested documents:", data.requestedDocs);
    
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
    
    // 2. Récupérer les informations du client à partir de l'offre
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select(`
        id,
        client_name,
        client_email,
        clients:client_id (
          id,
          name,
          email,
          company
        )
      `)
      .eq('id', data.offerId)
      .single();
      
    if (offerError) {
      console.error("Erreur lors de la récupération des données de l'offre:", offerError);
      return false;
    }
    
    // Récupérer l'email du client, soit directement, soit via la relation client
    const clientEmail = offerData.clients?.email || offerData.client_email;
    const clientName = offerData.clients?.name || offerData.client_name;
    
    if (!clientEmail) {
      console.error("Aucune adresse email trouvée pour le client");
      return false;
    }
    
    // 3. Mettre à jour le statut de l'offre
    // Attention: le champ 'previous_status' n'existe pas dans la table 'offers' selon l'erreur des logs
    // Nous allons donc mettre à jour uniquement le workflow_status
    await supabase
      .from('offers')
      .update({ 
        workflow_status: 'info_requested'
      })
      .eq('id', data.offerId);
    
    // 4. Envoyer l'email via la fonction Edge
    console.log("Appel de la fonction Edge avec les données:", {
      offerId: data.offerId,
      clientEmail,
      clientName,
      requestedDocs: data.requestedDocs,
      customMessage: data.customMessage
    });
    
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-document-request', {
      body: {
        offerId: data.offerId,
        clientEmail,
        clientName,
        requestedDocs: data.requestedDocs,
        customMessage: data.customMessage
      }
    });
    
    console.log("Résultat de l'appel à la fonction Edge:", emailResult);
    
    if (emailError) {
      console.error("Erreur lors de l'appel à la fonction Edge:", emailError);
      toast.error("Erreur lors de l'envoi de l'email");
      return false;
    }
    
    if (!emailResult.success) {
      console.error("Échec de l'envoi de l'email:", emailResult.message);
      toast.error(`Erreur: ${emailResult.message}`);
      return false;
    }
    
    console.log("Email envoyé avec succès");
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
    // Mettre à jour le statut de l'offre
    // Comme le champ previous_status n'existe pas, nous définissons directement le nouveau statut
    const newStatus = approve 
      ? 'leaser_review' // Approuvé, donc envoyé au bailleur
      : 'rejected';     // Refusé
    
    // Mettre à jour le statut de l'offre
    const { error } = await supabase
      .from('offers')
      .update({ 
        workflow_status: newStatus
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
