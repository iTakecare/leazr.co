import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const contractStatuses = {
  CONTRACT_SENT: "contract_sent",
  CONTRACT_SIGNED: "contract_signed",
  EQUIPMENT_ORDERED: "equipment_ordered",
  DELIVERED: "delivered",
  ACTIVE: "active",
  COMPLETED: "completed"
};

export interface Contract {
  id: string;
  offer_id: string;
  client_name: string;
  client_id?: string;
  client_email?: string;
  client_phone?: string;
  clients?: {
    name: string;
    email: string;
    company: string;
  } | null;
  monthly_payment: number;
  amount?: number;
  lease_duration?: number;
  equipment_description?: string;
  status: string;
  leaser_name: string;
  leaser_logo?: string;
  created_at: string;
  updated_at?: string;
  tracking_number?: string;
  estimated_delivery?: string;
  delivery_status?: string;
  delivery_carrier?: string;
}

export interface ContractCreateData {
  offer_id: string;
  client_name: string;
  client_id?: string;
  monthly_payment: number;
  equipment_description?: string;
  leaser_name: string;
  leaser_logo?: string;
  user_id: string;
}

export const createContractFromOffer = async (
  offerId: string,
  leaserName: string,
  leaserLogo?: string
): Promise<string | null> => {
  try {
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .eq('id', offerId)
      .single();

    if (offerError || !offerData) {
      console.error("Erreur lors de la récupération de l'offre:", offerError);
      toast.error("Impossible de créer le contrat : offre non trouvée");
      return null;
    }

    const contractData = {
      offer_id: offerId,
      client_name: offerData.client_name,
      client_id: offerData.client_id,
      monthly_payment: offerData.monthly_payment,
      equipment_description: offerData.equipment_description,
      leaser_name: leaserName,
      leaser_logo: leaserLogo || null,
      status: contractStatuses.CONTRACT_SENT,
      user_id: offerData.user_id
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert(contractData)
      .select();

    if (error) {
      console.error("Erreur lors de la création du contrat:", error);
      toast.error("Erreur lors de la création du contrat");
      return null;
    }

    const { error: updateError } = await supabase
      .from('offers')
      .update({ converted_to_contract: true })
      .eq('id', offerId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour de l'offre:", updateError);
    }

    return data?.[0]?.id || null;
  } catch (error) {
    console.error("Erreur lors de la création du contrat:", error);
    toast.error("Erreur lors de la création du contrat");
    return null;
  }
};

export const getContracts = async (includeCompleted = true): Promise<Contract[]> => {
  try {
    let query = supabase
      .from('contracts')
      .select('*, clients(name, email, company)')
      .order('created_at', { ascending: false });
      
    if (!includeCompleted) {
      query = query.neq('status', contractStatuses.COMPLETED);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des contrats:", error);
    toast.error("Erreur lors du chargement des contrats");
    return [];
  }
};

export const updateContractStatus = async (
  contractId: string,
  newStatus: string,
  previousStatus: string,
  reason?: string
): Promise<boolean> => {
  try {
    console.log(`Mise à jour du contrat ${contractId} de ${previousStatus} à ${newStatus} avec raison: ${reason || 'Aucune'}`);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { error: logError } = await supabase
      .from('contract_workflow_logs')
      .insert({
        contract_id: contractId,
        user_id: user.id,
        previous_status: previousStatus,
        new_status: newStatus,
        reason: reason || null
      });

    if (logError) {
      console.error("Erreur lors de l'enregistrement du log :", logError);
    }

    const { error } = await supabase
      .from('contracts')
      .update({ status: newStatus })
      .eq('id', contractId);

    if (error) {
      console.error("Erreur lors de la mise à jour du contrat:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut du contrat:", error);
    return false;
  }
};

export const addTrackingNumber = async (
  contractId: string,
  trackingNumber: string,
  estimatedDelivery?: string,
  carrier?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('contracts')
      .update({
        tracking_number: trackingNumber,
        estimated_delivery: estimatedDelivery,
        delivery_carrier: carrier,
        delivery_status: 'en_attente'
      })
      .eq('id', contractId);

    if (error) {
      console.error("Erreur lors de l'ajout du numéro de suivi:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de l'ajout du numéro de suivi:", error);
    return false;
  }
};

export const getContractWorkflowLogs = async (contractId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('contract_workflow_logs')
      .select(`
        *,
        profiles:user_id (first_name, last_name, email, avatar_url)
      `)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des logs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    return [];
  }
};

export const deleteContract = async (contractId: string): Promise<boolean> => {
  try {
    console.log("Début de la suppression du contrat:", contractId);
    
    // First, get the contract to find the associated offer
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('id, offer_id')
      .eq('id', contractId)
      .single();
    
    if (fetchError) {
      console.error("Erreur lors de la récupération des informations du contrat:", fetchError);
      return false;
    }
    
    // Delete workflow logs first (they have foreign key constraints)
    const { error: logsError } = await supabase
      .from('contract_workflow_logs')
      .delete()
      .eq('contract_id', contractId);
    
    if (logsError) {
      console.error("Erreur lors de la suppression des logs du contrat:", logsError);
      // Continue with deletion even if log deletion fails
    }
    
    // Delete the actual contract
    const { error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId);
    
    if (deleteError) {
      console.error("Erreur critique lors de la suppression du contrat:", deleteError);
      return false;
    }
    
    // Update the associated offer if it exists
    if (contract?.offer_id) {
      console.log("Mise à jour de l'offre associée:", contract.offer_id);
      const { error: offerError } = await supabase
        .from('offers')
        .update({ converted_to_contract: false })
        .eq('id', contract.offer_id);
      
      if (offerError) {
        console.error("Erreur lors de la mise à jour de l'offre associée:", offerError);
        // We still consider the deletion successful even if the offer update fails
      }
    }
    
    console.log("Contrat supprimé avec succès");
    return true;
  } catch (error) {
    console.error("Exception non gérée lors de la suppression du contrat:", error);
    return false;
  }
};
