import { useState, useEffect, useCallback } from "react";
import { Contract, contractStatuses, getContracts, updateContractStatus, addTrackingNumber, deleteContract } from "@/services/contractService";
import { toast } from "sonner";

export const useContracts = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [includeCompleted, setIncludeCompleted] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setLoadingError(null);
    
    try {
      const contractsData = await getContracts(includeCompleted);
      
      if (Array.isArray(contractsData)) {
        setContracts(contractsData);
      } else {
        console.error("Les données des contrats ne sont pas un tableau:", contractsData);
        setLoadingError("Format de données incorrect");
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des contrats:", error);
      setLoadingError("Impossible de charger les contrats");
      toast.error("Erreur lors du chargement des contrats");
    } finally {
      setLoading(false);
    }
  }, [includeCompleted]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleUpdateContractStatus = async (contractId: string, newStatus: string, reason?: string) => {
    setIsUpdatingStatus(true);
    try {
      const currentContract = contracts.find(contract => contract.id === contractId);
      const currentStatus = currentContract?.status || contractStatuses.CONTRACT_SENT;
      
      const success = await updateContractStatus(contractId, newStatus, currentStatus, reason);
      
      if (success) {
        setContracts(prevContracts => 
          prevContracts.map(contract => 
            contract.id === contractId 
              ? { ...contract, status: newStatus } 
              : contract
          )
        );
        
        toast.success("Statut du contrat mis à jour");
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut du contrat:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddTrackingInfo = async (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => {
    try {
      const success = await addTrackingNumber(contractId, trackingNumber, estimatedDelivery, carrier);
      
      if (success) {
        setContracts(prevContracts => 
          prevContracts.map(contract => 
            contract.id === contractId 
              ? { 
                  ...contract, 
                  tracking_number: trackingNumber,
                  estimated_delivery: estimatedDelivery,
                  delivery_carrier: carrier,
                  delivery_status: 'en_attente'
                } 
              : contract
          )
        );
        
        toast.success("Informations de suivi ajoutées");
      } else {
        toast.error("Erreur lors de l'ajout des informations de suivi");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout des informations de suivi:", error);
      toast.error("Erreur lors de l'ajout des informations de suivi");
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    if (isDeleting) {
      console.log("Une suppression est déjà en cours, opération ignorée");
      return false;
    }
    
    setIsDeleting(true);
    console.log("Début de la suppression du contrat dans le hook:", contractId);
    
    try {
      const success = await deleteContract(contractId);
      
      if (success) {
        console.log("Contrat supprimé avec succès dans le backend");
        
        setContracts(prevContracts => 
          prevContracts.filter(contract => contract.id !== contractId)
        );
        
        setTimeout(() => {
          fetchContracts();
        }, 1000);
        
        return true;
      } else {
        console.error("Échec de la suppression du contrat dans le backend");
        toast.error("Erreur lors de la suppression du contrat");
        return false;
      }
    } catch (error) {
      console.error("Exception dans handleDeleteContract:", error);
      toast.error("Erreur lors de la suppression du contrat");
      return false;
    } finally {
      console.log("Fin de la procédure de suppression, réinitialisation de isDeleting");
      setIsDeleting(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const clientName = contract.client_name.toLowerCase();
    const clientCompany = contract.clients?.company?.toLowerCase() || '';
    
    const matchesSearch = 
      clientName.includes(searchTerm.toLowerCase()) ||
      clientCompany.includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeStatusFilter === "all" || contract.status === activeStatusFilter;
    
    return matchesSearch && matchesFilter;
  });

  return {
    contracts,
    filteredContracts,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeStatusFilter,
    setActiveStatusFilter,
    isUpdatingStatus,
    isDeleting,
    fetchContracts,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    handleDeleteContract,
    viewMode,
    setViewMode,
    includeCompleted,
    setIncludeCompleted
  };
};
