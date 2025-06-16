
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createContractFromOffer } from "../contractService";

export const deleteOffer = async (offerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', offerId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting offer:", error);
    return false;
  }
};

export const updateOfferStatus = async (
  offerId: string, 
  newStatus: string, 
  previousStatus: string | null,
  reason?: string
): Promise<boolean> => {
  try {
    console.log(`Updating offer ${offerId} from ${previousStatus || 'draft'} to ${newStatus} with reason: ${reason || 'Aucune'}`);

    // Vérifier que les statuts sont valides
    if (!newStatus) {
      throw new Error("Le nouveau statut est requis");
    }

    // Get the user for logging the change
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    console.log("Authenticated user:", user.id);

    // Ensure the previous status is never null for database constraints
    const safePreviousStatus = previousStatus || 'draft';
    
    // First, update the offer's workflow_status
    const { error: updateError } = await supabase
      .from('offers')
      .update({ workflow_status: newStatus })
      .eq('id', offerId);
      
    if (updateError) {
      console.error("Erreur lors de la mise à jour du statut:", updateError);
      throw new Error("Erreur lors de la mise à jour du statut");
    }
    
    console.log("Offer status updated successfully");

    // Then, log the status change
    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        user_id: user.id,
        previous_status: safePreviousStatus,
        new_status: newStatus,
        reason: reason || null
      });

    if (logError) {
      console.error("Erreur lors de l'enregistrement du log:", logError);
      // Don't throw here, the status update was successful
    } else {
      console.log("Log created successfully");
    }

    // Si le statut est financed, créer automatiquement un contrat
    if (newStatus === 'financed') {
      try {
        // Récupérer les infos nécessaires pour créer le contrat
        const { data: offerData, error: offerDataError } = await supabase
          .from('offers')
          .select('*')
          .eq('id', offerId)
          .single();
        
        if (offerDataError || !offerData) {
          throw new Error("Impossible de récupérer les détails de l'offre");
        }
        
        // Récupérer le bailleur (ici, on utilise une valeur par défaut)
        const leaserName = "Grenke"; // Par défaut, devrait idéalement être récupéré depuis l'offre
        const leaserLogo = "https://logo.clearbit.com/grenke.com";
        
        const contractId = await createContractFromOffer(offerId, leaserName, leaserLogo);
        
        if (contractId) {
          console.log("Contrat créé avec l'ID:", contractId);
          
          // Marquer l'offre comme convertie en contrat
          const { error: conversionError } = await supabase
            .from('offers')
            .update({ converted_to_contract: true })
            .eq('id', offerId);
            
          if (conversionError) {
            console.error("Erreur lors de la mise à jour du statut de conversion:", conversionError);
          } else {
            toast.success("L'offre a été convertie en contrat");
          }
        }
      } catch (contractError) {
        console.error("Erreur lors de la création du contrat:", contractError);
        toast.error("L'offre a été marquée comme financée mais nous n'avons pas pu créer le contrat");
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating offer status:", error);
    return false;
  }
};

export const getWorkflowHistory = async (offerId: string) => {
  try {
    console.log("Fetching workflow history for offer:", offerId);
    
    // Récupérer les logs avec les informations utilisateur via une jointure
    const { data: logs, error: logsError } = await supabase
      .from('offer_workflow_logs')
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    
    if (logsError) {
      console.error("Error fetching workflow logs:", logsError);
      throw logsError;
    }
    
    console.log("Retrieved logs with profiles:", logs);
    
    // Si nous n'avons pas de logs du tout
    if (!logs || logs.length === 0) {
      console.log("No workflow logs found for offer:", offerId);
      return [];
    }
    
    // Les données sont déjà enrichies avec les profils grâce à la jointure
    const enhancedLogs = logs.map(log => {
      if (log.profiles && log.profiles.first_name && log.profiles.last_name) {
        return {
          ...log,
          user_name: `${log.profiles.first_name} ${log.profiles.last_name}`
        };
      }
      
      // Fallback si pas de profil trouvé
      return {
        ...log,
        user_name: `Utilisateur (${log.user_id.substring(0, 6)})`
      };
    });
    
    console.log("Enhanced logs:", enhancedLogs);
    return enhancedLogs;
  } catch (error) {
    console.error("Error in getWorkflowHistory:", error);
    return [];
  }
};

export const getCompletedStatuses = async (offerId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('offer_workflow_logs')
      .select('new_status')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error fetching completed statuses:", error);
      throw error;
    }
    
    // Extraire les statuts uniques dans l'ordre chronologique
    const uniqueStatuses = new Set<string>();
    data?.forEach(log => uniqueStatuses.add(log.new_status));
    
    return Array.from(uniqueStatuses);
  } catch (error) {
    console.error("Error in getCompletedStatuses:", error);
    return [];
  }
};
