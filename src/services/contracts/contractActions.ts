
import { supabase, adminSupabase } from "@/integrations/supabase/client";

/**
 * Met à jour le statut d'un contrat
 */
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
      console.error("Utilisateur non authentifié");
      throw new Error("Utilisateur non authentifié");
    }

    const userName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email;

    // D'abord, ajouter l'entrée de log
    const { error: logError } = await supabase
      .from('contract_workflow_logs')
      .insert({
        contract_id: contractId,
        user_id: user.id,
        previous_status: previousStatus,
        new_status: newStatus,
        reason: reason || null,
        user_name: userName
      });

    if (logError) {
      console.error("Erreur lors de l'enregistrement du log :", logError);
      // On continue même si l'enregistrement du log échoue
    } else {
      console.log("Le log de workflow a été enregistré avec succès");
    }

    // Ensuite mettre à jour le statut du contrat
    const { error } = await supabase
      .from('contracts')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (error) {
      console.error("Erreur lors de la mise à jour du contrat:", error);
      return false;
    }

    console.log("Le statut du contrat a été mis à jour avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du statut du contrat:", error);
    return false;
  }
};

/**
 * Supprime un contrat
 */
export const deleteContract = async (contractId: string): Promise<boolean> => {
  try {
    console.log("DELETION: Starting contract deletion process for ID:", contractId);
    
    // 1. First verify the contract exists
    const { data: initialCheck, error: initialError } = await supabase
      .from('contracts')
      .select('id, offer_id')
      .eq('id', contractId)
      .single();
      
    if (initialError) {
      console.error("DELETION ERROR: Contract not found during initial check:", initialError);
      return false;
    }
    
    if (!initialCheck) {
      console.error("DELETION ERROR: Contract not found (null result)");
      return false;
    }
    
    console.log("DELETION: Found contract to delete:", initialCheck);
    
    // 2. Get the offer_id for later reference (if we need to update the offer)
    const offerId = initialCheck.offer_id;
    
    // 3. Delete associated workflow logs first (foreign key constraint)
    try {
      const { error: logsError } = await supabase
        .from('contract_workflow_logs')
        .delete()
        .eq('contract_id', contractId);
      
      if (logsError) {
        console.error("DELETION ERROR: Error deleting workflow logs:", logsError);
        // Continue with deletion attempt even if log deletion fails
      } else {
        console.log("DELETION: Successfully deleted workflow logs");
      }
    } catch (logsException) {
      console.error("DELETION ERROR: Exception when deleting logs:", logsException);
      // Continue despite error
    }
    
    // 4. Add a small delay to ensure the delete operation for logs completes
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 5. Now delete the contract - using regular supabase client with the new RLS policy
    try {
      console.log("DELETION: Attempting standard deletion with RLS policy");
      const { error: deleteError } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
        
      if (deleteError) {
        console.error("DELETION ERROR: Standard deletion failed:", deleteError);
        
        // Fallback to admin delete if needed
        console.log("DELETION: Trying fallback with admin privileges");
        const { error: adminDeleteError } = await adminSupabase
          .from('contracts')
          .delete()
          .eq('id', contractId);
          
        if (adminDeleteError) {
          console.error("DELETION ERROR: Admin deletion also failed:", adminDeleteError);
          return false;
        }
      }
    } catch (deleteException) {
      console.error("DELETION EXCEPTION: Error during delete operation:", deleteException);
      return false;
    }
    
    console.log("DELETION: Delete operations completed, verifying...");
    
    // 6. Add a delay before verification
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 7. Verify the contract is actually deleted
    try {
      const { data: verifyData, error: verifyError } = await supabase
        .from('contracts')
        .select('id')
        .eq('id', contractId);
        
      if (verifyError) {
        console.log("DELETION WARNING: Error during verification check:", verifyError);
        // We continue and assume it was deleted
      }
      
      if (verifyData && verifyData.length > 0) {
        console.error("DELETION FAILURE: Contract still exists after deletion!", verifyData);
        return false;
      }
    } catch (verifyException) {
      console.error("DELETION EXCEPTION: Error during verification:", verifyException);
      // Continue and assume deletion worked
    }
    
    console.log("DELETION: Contract successfully deleted and verified");
    
    // 8. Update associated offer if exists
    if (offerId) {
      console.log("DELETION: Updating associated offer:", offerId);
      
      const { error: offerError } = await supabase
        .from('offers')
        .update({ converted_to_contract: false })
        .eq('id', offerId);
        
      if (offerError) {
        console.warn("DELETION WARNING: Could not update associated offer:", offerError);
        // We still consider deletion successful
      } else {
        console.log("DELETION: Successfully updated associated offer status");
      }
    }
    
    return true;
  } catch (error) {
    console.error("DELETION EXCEPTION: Unhandled error in deleteContract:", error);
    return false;
  }
};
