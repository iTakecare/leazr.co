
import { useState, useEffect } from "react";
import { Contract, contractStatuses, getContracts, updateContractStatus, addTrackingNumber } from "@/services/contractService";
import { toast } from "sonner";

export const useContracts = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [includeCompleted, setIncludeCompleted] = useState(true);

  useEffect(() => {
    fetchContracts();
  }, [includeCompleted]);

  const fetchContracts = async () => {
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
  };

  const handleUpdateContractStatus = async (contractId: string, newStatus: string, reason?: string) => {
    setIsUpdatingStatus(true);
    try {
      // Obtenir le statut actuel pour pouvoir l'enregistrer dans l'historique
      const currentContract = contracts.find(contract => contract.id === contractId);
      const currentStatus = currentContract?.status || contractStatuses.CONTRACT_SENT;
      
      // Appeler l'API pour mettre à jour le statut
      const success = await updateContractStatus(contractId, newStatus, currentStatus, reason);
      
      if (success) {
        // Mettre à jour localement
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
        // Mettre à jour localement
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

  const filteredContracts = contracts.filter((contract) => {
    // Rechercher dans le nom du client ou le nom de la société du client s'il est lié
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
    fetchContracts,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    viewMode,
    setViewMode,
    includeCompleted,
    setIncludeCompleted
  };
};
