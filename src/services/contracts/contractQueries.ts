
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Contract } from "./contractTypes";

/**
 * Récupère tous les contrats, avec ou sans les contrats terminés
 */
export const getContracts = async (includeCompleted = true): Promise<Contract[]> => {
  try {
    console.log("Requête des contrats, includeCompleted:", includeCompleted);
    
    let query = supabase
      .from('contracts')
      .select('*, clients(name, email, company)')
      .order('created_at', { ascending: false });
      
    if (!includeCompleted) {
      query = query.neq('status', 'completed');
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur supabase lors de la récupération des contrats:", error);
      throw error;
    }

    console.log("Contrats récupérés:", data?.length || 0);
    return data || [];
  } catch (error) {
    console.error("Exception lors de la récupération des contrats:", error);
    toast.error("Erreur lors du chargement des contrats");
    return [];
  }
};

/**
 * Récupère un contrat par son ID
 */
export const getContractById = async (contractId: string): Promise<Contract | null> => {
  try {
    const { data, error } = await supabase
      .from('contracts')
      .select('*, clients(name, email, company)')
      .eq('id', contractId)
      .single();

    if (error) {
      console.error("Erreur lors de la récupération du contrat:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception lors de la récupération du contrat:", error);
    return null;
  }
};

/**
 * Crée un contrat à partir d'une offre
 */
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
      status: "contract_sent",
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
