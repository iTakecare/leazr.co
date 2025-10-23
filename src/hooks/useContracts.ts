
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getContracts, 
  updateContractStatus, 
  deleteContract, 
  addTrackingNumber, 
  Contract,
  contractStatuses
} from "@/services/contractService";

export const useContracts = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      setLoadingError(null);
      const data = await getContracts(includeCompleted);
      setContracts(data);
    } catch (error: any) {
      console.error("Error fetching contracts:", error);
      setLoadingError("Erreur lors du chargement des contrats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, [includeCompleted]);

  useEffect(() => {
    filterContracts();
  }, [contracts, activeStatusFilter, searchTerm]);

  const filterContracts = () => {
    let filtered = [...contracts];
    
    // Filtre par statut/onglet
    if (activeStatusFilter === "in_progress") {
      // En cours : contract_sent, equipment_ordered, delivered
      filtered = filtered.filter(contract => 
        [contractStatuses.CONTRACT_SENT, contractStatuses.EQUIPMENT_ORDERED, contractStatuses.DELIVERED].includes(contract.status as any)
      );
    } else if (activeStatusFilter === "expiring_soon") {
      // Expiration prochaine : actifs dont la date de fin est dans les 3 prochains mois
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      filtered = filtered.filter(contract => 
        contract.status === contractStatuses.ACTIVE &&
        contract.contract_end_date &&
        new Date(contract.contract_end_date) <= threeMonthsFromNow &&
        new Date(contract.contract_end_date) >= new Date()
      );
    } else if (activeStatusFilter !== "all") {
      // Filtres simples par statut (signed, active)
      filtered = filtered.filter(contract => contract.status === activeStatusFilter);
    }
    
    // Filtre par terme de recherche
    if (searchTerm.trim() !== "") {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(contract => 
        contract.client_name.toLowerCase().includes(lowerCaseSearch) ||
        contract.equipment_description?.toLowerCase().includes(lowerCaseSearch) ||
        contract.leaser_name.toLowerCase().includes(lowerCaseSearch)
      );
    }
    
    setFilteredContracts(filtered);
  };

  const handleUpdateContractStatus = async (contractId: string, newStatus: string, reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      // Trouver le contrat pour obtenir son statut actuel
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) {
        toast.error("Contrat non trouvé");
        return;
      }
      
      const success = await updateContractStatus(
        contractId,
        newStatus,
        contract.status,
        reason
      );
      
      if (success) {
        // Mettre à jour l'état local
        setContracts(prevContracts => 
          prevContracts.map(c => 
            c.id === contractId ? { ...c, status: newStatus } : c
          )
        );
        toast.success(`Statut du contrat mis à jour avec succès`);
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
  ) => {
    try {
      setIsUpdatingStatus(true);
      
      const success = await addTrackingNumber(
        contractId,
        trackingNumber,
        estimatedDelivery,
        carrier
      );
      
      if (success) {
        // Mettre à jour l'état local
        setContracts(prevContracts => 
          prevContracts.map(c => 
            c.id === contractId ? { 
              ...c, 
              tracking_number: trackingNumber,
              estimated_delivery: estimatedDelivery,
              delivery_carrier: carrier,
              delivery_status: 'en_attente'
            } : c
          )
        );
        toast.success(`Informations de suivi ajoutées avec succès`);
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
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const success = await deleteContract(contractId);
      
      if (success) {
        // Mettre à jour l'état local
        setContracts(prevContracts => 
          prevContracts.filter(c => c.id !== contractId)
        );
        toast.success("Contrat supprimé avec succès");
      } else {
        toast.error("Erreur lors de la suppression du contrat");
      }
    } catch (error) {
      console.error("Error deleting contract:", error);
      toast.error("Erreur lors de la suppression du contrat");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    contracts,
    filteredContracts,
    loading,
    loadingError,
    isUpdatingStatus,
    isDeleting,
    searchTerm,
    setSearchTerm,
    activeStatusFilter,
    setActiveStatusFilter,
    viewMode,
    setViewMode,
    includeCompleted,
    setIncludeCompleted,
    fetchContracts,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    handleDeleteContract
  };
};
