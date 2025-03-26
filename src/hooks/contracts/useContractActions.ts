
import { useState } from "react";
import { toast } from "sonner";
import { 
  updateContractStatus, 
  deleteContract, 
  addTrackingNumber 
} from "@/services/contracts";
import { Contract } from "@/services/contracts/contractTypes";

export const useContractActions = (refreshContracts: () => Promise<void>, getContracts?: () => Contract[]) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);

  const handleUpdateContractStatus = async (contractId: string, newStatus: string, reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      // 1. Recherche du contrat actuel
      let contract: Contract | undefined;
      
      // Si getContracts est fourni, utiliser ça pour obtenir les contrats actuels
      if (getContracts) {
        const contracts = getContracts();
        contract = contracts.find(c => c.id === contractId);
      }
      
      // Si nous n'avons pas encore trouvé le contrat ou getContracts n'est pas fourni
      if (!contract) {
        // Rafraîchir les contrats et chercher à nouveau
        await refreshContracts();
        
        // Après le rafraîchissement, utiliser getContracts s'il est disponible
        if (getContracts) {
          const refreshedContracts = getContracts();
          contract = refreshedContracts.find(c => c.id === contractId);
        }
      }
      
      if (!contract) {
        toast.error("Contrat non trouvé");
        return;
      }
      
      console.log(`Tentative de mise à jour du contrat ${contractId} de ${contract.status} à ${newStatus}`);
      
      // 2. Mise à jour du statut
      const success = await updateContractStatus(
        contractId,
        newStatus,
        contract.status,
        reason
      );
      
      if (success) {
        toast.success(`Statut du contrat mis à jour avec succès`);
        
        // 3. Rechargement des contrats pour s'assurer que tout est synchronisé
        await refreshContracts();
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating contract status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddTrackingInfo = async (
    contractId: string, 
    trackingNumber: string, 
    estimatedDelivery?: string,
    carrier?: string
  ): Promise<void> => {
    try {
      setIsUpdatingStatus(true);
      
      const success = await addTrackingNumber(
        contractId,
        trackingNumber,
        estimatedDelivery,
        carrier
      );
      
      if (success) {
        toast.success(`Informations de suivi ajoutées avec succès`);
        
        // Attendre avant de recharger pour s'assurer que la BD est à jour
        setTimeout(async () => {
          await refreshContracts();
        }, 800);
      } else {
        toast.error("Erreur lors de l'ajout des informations de suivi");
      }
    } catch (error) {
      console.error("Error adding tracking info:", error);
      toast.error("Erreur lors de l'ajout des informations de suivi");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (isDeleting || deleteInProgress) {
      console.log("DELETE UI: Deletion already in progress");
      return;
    }
    
    try {
      // Set deletion states
      setIsDeleting(true);
      setDeleteInProgress(contractId);
      
      // Start with a loading toast
      const toastId = toast.loading("Suppression du contrat en cours...");
      
      // Call API to delete the contract
      const success = await deleteContract(contractId);
      
      if (success) {
        // Update toast to success
        toast.success("Contrat supprimé avec succès", { id: toastId });
        
        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Force a full reload to update the UI with accurate data
        await refreshContracts();
      } else {
        // Show error toast
        toast.error("Échec de la suppression du contrat", { id: toastId });
        
        // Force a full reload to ensure UI matches database state
        await refreshContracts();
      }
    } catch (error: any) {
      console.error("DELETE UI ERROR: Unexpected error in handleDeleteContract:", error);
      toast.error(`Erreur de suppression: ${error.message || "Erreur inconnue"}`);
      
      // Safety reload
      await refreshContracts();
    } finally {
      // Reset all deletion states
      setIsDeleting(false);
      setDeleteInProgress(null);
    }
  };

  return {
    isUpdatingStatus,
    isDeleting,
    deleteInProgress,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    handleDeleteContract
  };
};
