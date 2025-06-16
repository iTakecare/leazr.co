
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
  console.log(`🔄 Starting status update for offer ${offerId}`);
  console.log(`📋 Status change: ${previousStatus || 'draft'} → ${newStatus}`);
  console.log(`💬 Reason: ${reason || 'Aucune'}`);

  try {
    // Vérifier que les statuts sont valides
    if (!newStatus) {
      throw new Error("Le nouveau statut est requis");
    }

    // Get the user for logging the change
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Error getting user:", userError);
      throw new Error("Utilisateur non authentifié");
    }

    console.log("✅ User authenticated:", user.id);

    // Ensure the previous status is never null for database constraints
    const safePreviousStatus = previousStatus || 'draft';
    
    console.log("📝 Inserting workflow log first...");
    
    // IMPORTANT: Insert the workflow log FIRST before updating the offer
    const { data: logData, error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        user_id: user.id,
        previous_status: safePreviousStatus,
        new_status: newStatus,
        reason: reason || null
      })
      .select('*');

    if (logError) {
      console.error("❌ Error inserting workflow log:", logError);
      toast.error("Erreur lors de l'enregistrement du changement de statut");
      return false;
    }

    console.log("✅ Workflow log inserted successfully:", logData);
    
    // Now update the offer's workflow_status
    console.log("📝 Updating offer status...");
    const { error: updateError } = await supabase
      .from('offers')
      .update({ 
        workflow_status: newStatus,
        previous_status: safePreviousStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', offerId);
      
    if (updateError) {
      console.error("❌ Error updating offer status:", updateError);
      // Try to rollback the log entry
      await supabase
        .from('offer_workflow_logs')
        .delete()
        .eq('id', logData[0].id);
      throw new Error("Erreur lors de la mise à jour du statut");
    }
    
    console.log("✅ Offer status updated successfully");

    // Si le statut est financed, créer automatiquement un contrat
    if (newStatus === 'financed') {
      try {
        console.log("💰 Status is 'financed', creating contract...");
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
          console.log("✅ Contract created with ID:", contractId);
          
          // Marquer l'offre comme convertie en contrat
          const { error: conversionError } = await supabase
            .from('offers')
            .update({ converted_to_contract: true })
            .eq('id', offerId);
            
          if (conversionError) {
            console.error("❌ Error updating conversion status:", conversionError);
          } else {
            toast.success("L'offre a été convertie en contrat");
          }
        }
      } catch (contractError) {
        console.error("❌ Error creating contract:", contractError);
        toast.error("L'offre a été marquée comme financée mais nous n'avons pas pu créer le contrat");
      }
    }
    
    console.log("🎉 Status update completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Error in updateOfferStatus:", error);
    return false;
  }
};

export const getWorkflowHistory = async (offerId: string) => {
  console.log(`📚 Fetching workflow history for offer: ${offerId}`);
  
  try {
    // Récupérer les logs avec les informations utilisateur en une seule requête
    const { data: logs, error: logsError } = await supabase
      .from('offer_workflow_logs')
      .select(`
        *,
        profiles!offer_workflow_logs_user_id_fkey (
          id,
          first_name,
          last_name,
          role
        )
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    
    if (logsError) {
      console.error("❌ Error fetching workflow logs:", logsError);
      throw logsError;
    }
    
    console.log(`📊 Retrieved ${logs?.length || 0} workflow logs:`, logs);
    
    if (!logs || logs.length === 0) {
      console.log("⚠️ No workflow logs found for this offer");
      return [];
    }
    
    // Enrichir les logs avec les informations des utilisateurs
    const enhancedLogs = logs.map(log => {
      const userProfile = log.profiles;
      
      if (userProfile && userProfile.first_name && userProfile.last_name) {
        return {
          ...log,
          user_name: `${userProfile.first_name} ${userProfile.last_name}`,
          profiles: userProfile
        };
      }
      
      // Fallback si pas de profil trouvé
      return {
        ...log,
        user_name: `Utilisateur (${log.user_id.substring(0, 6)})`,
        profiles: null
      };
    });
    
    console.log("✅ Enhanced logs prepared:", enhancedLogs);
    return enhancedLogs;
  } catch (error) {
    console.error("❌ Error in getWorkflowHistory:", error);
    return [];
  }
};

export const getCompletedStatuses = async (offerId: string): Promise<string[]> => {
  console.log(`📋 Fetching completed statuses for offer: ${offerId}`);
  
  try {
    const { data, error } = await supabase
      .from('offer_workflow_logs')
      .select('new_status')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("❌ Error fetching completed statuses:", error);
      throw error;
    }
    
    // Extraire les statuts uniques dans l'ordre chronologique
    const uniqueStatuses = new Set<string>();
    data?.forEach(log => uniqueStatuses.add(log.new_status));
    
    const statusArray = Array.from(uniqueStatuses);
    console.log("✅ Completed statuses:", statusArray);
    return statusArray;
  } catch (error) {
    console.error("❌ Error in getCompletedStatuses:", error);
    return [];
  }
};
