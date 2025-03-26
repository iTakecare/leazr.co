
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getContracts, 
  updateContractStatus, 
  deleteContract, 
  addTrackingNumber, 
  Contract 
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
      console.log("Chargement des contrats, includeCompleted:", includeCompleted);
      const data = await getContracts(includeCompleted);
      console.log("Contrats chargés:", data);
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
    
    // Filtre par statut
    if (activeStatusFilter !== "all") {
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
      
      console.log(`Tentative de mise à jour du contrat ${contractId} de ${contract.status} à ${newStatus}`);
      
      const success = await updateContractStatus(
        contractId,
        newStatus,
        contract.status,
        reason
      );
      
      if (success) {
        console.log(`Mise à jour réussie, application des changements locaux`);
        
        // Mettre à jour l'état local immédiatement pour refléter le changement d'état
        setContracts(prevContracts => 
          prevContracts.map(c => 
            c.id === contractId ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
          )
        );
        
        toast.success(`Statut du contrat mis à jour avec succès`);
        
        // Forcer un rechargement complet des contrats pour s'assurer que tout est synchronisé
        await fetchContracts();
      } else {
        console.error("Échec de la mise à jour du statut");
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
      
      // Trouver le contrat pour obtenir son statut actuel
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) {
        toast.error("Contrat non trouvé");
        return;
      }
      
      // Stocker explicitement le statut actuel avant toute opération
      const currentStatus = contract.status;
      console.log(`Ajout de numéro de suivi pour le contrat ${contractId}, statut actuel: "${currentStatus}"`);
      
      // Appeler le service pour ajouter le numéro de suivi
      const success = await addTrackingNumber(
        contractId,
        trackingNumber,
        estimatedDelivery,
        carrier
      );
      
      if (success) {
        console.log(`Mise à jour locale du contrat, statut maintenu à: "${currentStatus}"`);
        
        // Mettre à jour l'état local en préservant explicitement le statut actuel
        setContracts(prevContracts => 
          prevContracts.map(c => 
            c.id === contractId ? { 
              ...c, 
              tracking_number: trackingNumber,
              estimated_delivery: estimatedDelivery,
              delivery_carrier: carrier,
              delivery_status: 'en_attente',
              status: currentStatus, // IMPORTANT: Préserver explicitement le statut actuel
              updated_at: new Date().toISOString()
            } : c
          )
        );
        
        toast.success(`Informations de suivi ajoutées avec succès`);
        
        // Attendre avant de recharger pour s'assurer que la BD est à jour
        setTimeout(async () => {
          // Recharger tous les contrats pour s'assurer que tout est synchronisé
          await fetchContracts();
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
