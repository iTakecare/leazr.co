
import { supabase } from "@/integrations/supabase/client";

/**
 * Ajoute ou met à jour les informations de suivi d'un contrat
 */
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
