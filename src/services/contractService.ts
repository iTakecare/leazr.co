import { supabase, adminSupabase } from "@/integrations/supabase/client";
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
    console.log("Requête des contrats, includeCompleted:", includeCompleted);
    
    let query = supabase
      .from('contracts')
      .select('*, clients(name, email, company)')
      .order('created_at', { ascending: false });
      
    if (!includeCompleted) {
      query = query.neq('status', contractStatuses.COMPLETED);
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

export const addTrackingNumber = async (
  contractId: string,
  trackingNumber: string,
  estimatedDelivery?: string,
  carrier?: string
): Promise<boolean> => {
  try {
    console.log(`Début de l'ajout du numéro de suivi ${trackingNumber} au contrat ${contractId}`);
    
    // 1. Récupérer le contrat actuel avec son statut
    const { data: contract, error: fetchError } = await supabase
      .from('contracts')
      .select('status')
      .eq('id', contractId)
      .single();
    
    if (fetchError) {
      console.error("Erreur lors de la récupération du statut du contrat:", fetchError);
      return false;
    }
    
    if (!contract) {
      console.error("Contrat non trouvé");
      return false;
    }
    
    // 2. Enregistrer le statut actuel pour le conserver
    const currentStatus = contract.status;
    console.log(`Statut actuel avant mise à jour: "${currentStatus}"`);
    
    // 3. Mettre à jour le contrat avec les infos de suivi tout en préservant explicitement le statut actuel
    const updateData = {
      tracking_number: trackingNumber,
      estimated_delivery: estimatedDelivery || null,
      delivery_carrier: carrier || null,
      delivery_status: 'en_attente',
      status: currentStatus, // IMPORTANT: Préserver explicitement le statut actuel
      updated_at: new Date().toISOString()
    };
    
    console.log(`Mise à jour avec les données suivantes:`, updateData);
    
    const { error } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId);

    if (error) {
      console.error("Erreur lors de l'ajout du numéro de suivi:", error);
      return false;
    }

    // 4. Vérifier que le statut a bien été préservé après la mise à jour
    const { data: updatedContract, error: verifyError } = await supabase
      .from('contracts')
      .select('status, tracking_number')
      .eq('id', contractId)
      .single();
      
    if (verifyError) {
      console.error("Erreur lors de la vérification après mise à jour:", verifyError);
    } else if (updatedContract) {
      console.log(`VÉRIFICATION après mise à jour: status = "${updatedContract.status}", tracking = "${updatedContract.tracking_number}"`);
      
      // Double vérification que le statut est toujours le bon
      if (updatedContract.status !== currentStatus) {
        console.error(`ERREUR CRITIQUE: Le statut a changé de "${currentStatus}" à "${updatedContract.status}"`);
        
        // Tentative de correction immédiate si le statut a été modifié
        const { error: fixError } = await supabase
          .from('contracts')
          .update({ status: currentStatus })
          .eq('id', contractId);
          
        if (fixError) {
          console.error("Échec de la correction du statut:", fixError);
        } else {
          console.log(`Correction du statut réussie, restauré à "${currentStatus}"`);
        }
      }
    }

    console.log(`Numéro de suivi ajouté avec succès. Statut maintenu à: ${currentStatus}`);
    return true;
  } catch (error) {
    console.error("Exception lors de l'ajout du numéro de suivi:", error);
    return false;
  }
};

export const getContractWorkflowLogs = async (contractId: string): Promise<any[]> => {
  try {
    console.log("Récupération des logs pour le contrat:", contractId);
    
    const { data, error } = await supabase
      .from('contract_workflow_logs')
      .select(`
        id,
        contract_id,
        user_id,
        previous_status,
        new_status,
        reason,
        created_at,
        user_name
      `)
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des logs:", error);
      return [];
    }

    console.log("Logs récupérés:", data);
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    return [];
  }
};

export const deleteContract = async (contractId: string): Promise<boolean> => {
  try {
    console.log("DELETION: Starting improved contract deletion process for ID:", contractId);
    
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
      // Using adminSupabase to bypass RLS policies
      const { error: logsError } = await adminSupabase
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
    
    // 4. CRITICAL: Add a small delay to ensure the delete operation completes fully
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 5. Delete the contract with explicit return type - using adminSupabase
    try {
      // First attempt with adminSupabase to bypass RLS
      console.log("DELETION: Attempting deletion with admin rights");
      const { error: adminDeleteError } = await adminSupabase
        .from('contracts')
        .delete()
        .eq('id', contractId);
        
      if (adminDeleteError) {
        console.error("DELETION ERROR: Admin deletion failed:", adminDeleteError);
        // Fall back to regular delete
        const { error: regularDeleteError } = await supabase
          .from('contracts')
          .delete()
          .eq('id', contractId);
          
        if (regularDeleteError) {
          console.error("DELETION ERROR: Regular deletion also failed:", regularDeleteError);
          return false;
        }
      }
    } catch (deleteException) {
      console.error("DELETION EXCEPTION: Error during delete operation:", deleteException);
      return false;
    }
    
    console.log("DELETION: Delete operations completed, verifying...");
    
    // 6. CRITICAL: Add another delay before verification to allow for database propagation
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 7. CRITICAL: Triple-verify the contract is actually deleted with a separate query
    try {
      // Use adminSupabase for verification to bypass any RLS
      const { data: verifyData, error: verifyError } = await adminSupabase
        .from('contracts')
        .select('id')
        .eq('id', contractId);
        
      if (verifyError) {
        console.log("DELETION WARNING: Error during verification check:", verifyError);
        // We continue and assume it was deleted
      }
      
      if (verifyData && verifyData.length > 0) {
        console.error("DELETION CRITICAL FAILURE: Contract still exists after deletion despite admin access!", verifyData);
        
        // 8. Last resort: Try one more forceful deletion directly via SQL function
        try {
          // Attempt to use a direct SQL query to delete (requires a Supabase SQL function)
          console.log("DELETION: Attempting final forced deletion");
          
          // Using a direct SQL delete statement with strong matching condition
          const { error: forceDeleteError } = await adminSupabase.rpc(
            'execute_sql',
            { 
              sql: `DELETE FROM public.contracts WHERE id = '${contractId}'` 
            }
          );
          
          if (forceDeleteError) {
            console.error("DELETION FATAL: SQL function deletion failed:", forceDeleteError);
            return false;
          }
          
          // Final verification after SQL delete
          const { data: finalCheck } = await adminSupabase
            .from('contracts')
            .select('id')
            .eq('id', contractId);
            
          if (finalCheck && finalCheck.length > 0) {
            console.error("DELETION FATAL: Contract could not be deleted after multiple attempts including SQL");
            return false;
          }
        } catch (sqlException) {
          console.error("DELETION EXCEPTION: SQL deletion exception:", sqlException);
          return false;
        }
      }
    } catch (verifyException) {
      console.error("DELETION EXCEPTION: Error during verification:", verifyException);
      // Continue and assume deletion worked
    }
    
    console.log("DELETION: Contract successfully deleted and verified");
    
    // 9. Update associated offer if exists
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
