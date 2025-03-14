import { useState, useEffect } from "react";
import { getOffers, deleteOffer, updateOfferStatus } from "@/services/offerService";
import { toast } from "sonner";

interface Offer {
  id: string;
  client_name: string;
  client_id?: string;
  clients?: {
    name: string;
    email: string;
    company: string;
  } | null;
  amount: number;
  monthly_payment: number;
  commission: number;
  status: string;
  workflow_status?: string;
  created_at: string;
  type: string;
  converted_to_contract?: boolean;
}

// Statuts de workflow disponibles
export const workflowStatuses = {
  DRAFT: "draft",
  CLIENT_WAITING: "client_waiting",
  CLIENT_APPROVED: "client_approved",
  CLIENT_NO_RESPONSE: "client_no_response",
  INTERNAL_REVIEW: "internal_review",
  NEED_INFO: "need_info",
  INTERNAL_REJECTED: "internal_rejected",
  LEASER_SENT: "leaser_sent",
  LEASER_REVIEW: "leaser_review",
  LEASER_APPROVED: "leaser_approved",
  LEASER_REJECTED: "leaser_rejected"
};

export const useOffers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [activeType, setActiveType] = useState("all");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [includeConverted, setIncludeConverted] = useState(true);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);
    
    try {
      console.log("Fetching offers with includeConverted =", includeConverted);
      const offersData = await getOffers(includeConverted);
      
      if (Array.isArray(offersData)) {
        const offersWithWorkflow = offersData.map(offer => {
          if (!offer.workflow_status) {
            let workflowStatus;
            switch (offer.status) {
              case "accepted":
                workflowStatus = workflowStatuses.CLIENT_APPROVED;
                break;
              case "rejected":
                workflowStatus = workflowStatuses.CLIENT_NO_RESPONSE;
                break;
              case "pending":
                workflowStatus = workflowStatuses.DRAFT;
                break;
              default:
                workflowStatus = workflowStatuses.DRAFT;
            }
            return { ...offer, workflow_status: workflowStatus };
          }
          return offer;
        });
        
        const offersWithType = offersWithWorkflow.map(offer => {
          if (!offer.type) {
            return {
              ...offer,
              type: offer.client_id ? 'client_request' : 'admin_offer'
            };
          }
          return offer;
        });
        
        console.log(`Loaded ${offersWithType.length} offers. Includes converted: ${includeConverted}`);
        console.log("Converted offers:", offersWithType.filter(o => o.converted_to_contract).length);
        
        setOffers(offersWithType);
      } else {
        console.error("Offers data is not an array:", offersData);
        setLoadingError("Format de données incorrect");
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      setLoadingError("Impossible de charger les offres");
      toast.error("Erreur lors du chargement des offres");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ?")) {
      const success = await deleteOffer(offerId);
      if (success) {
        toast.success("L'offre a été supprimée avec succès");
        setOffers(offers.filter(offer => offer.id !== offerId));
      } else {
        toast.error("Erreur lors de la suppression de l'offre");
      }
    }
  };

  const handleUpdateWorkflowStatus = async (offerId: string, newStatus: string, reason?: string): Promise<void> => {
    console.log(`Starting workflow status update for offer ${offerId} to ${newStatus}`);
    
    // Vérifier que le statut est valide
    if (!Object.values(workflowStatuses).includes(newStatus)) {
      console.error(`Invalid workflow status: ${newStatus}`);
      toast.error("Statut de workflow invalide");
      return;
    }

    setIsUpdatingStatus(true);
    
    try {
      // Find the current offer
      const currentOffer = offers.find(offer => offer.id === offerId);
      if (!currentOffer) {
        console.error(`Offer with ID ${offerId} not found`);
        toast.error("Erreur: offre introuvable");
        setIsUpdatingStatus(false);
        return;
      }
      
      // Get the current status from the workflow_status field
      const currentStatus = currentOffer.workflow_status && 
        Object.values(workflowStatuses).includes(currentOffer.workflow_status) ?
          currentOffer.workflow_status : workflowStatuses.DRAFT;
      
      console.log(`Current status: ${currentStatus}, New status: ${newStatus}`);
      
      // Skip update if status hasn't changed
      if (currentStatus === newStatus) {
        console.log("Status unchanged, skipping update");
        toast.info("Le statut est déjà à cette valeur");
        setIsUpdatingStatus(false);
        return;
      }
      
      // Update the status in the database
      const success = await updateOfferStatus(offerId, newStatus, currentStatus, reason);
      
      if (success) {
        console.log(`Status update successful for offer ${offerId} to ${newStatus}`);
        
        // Update the local state immediately for better reactivity
        setOffers(prevOffers => 
          prevOffers.map(offer => 
            offer.id === offerId 
              ? { 
                  ...offer, 
                  workflow_status: newStatus,
                  // Mark as converted to contract if approved by leaser
                  converted_to_contract: newStatus === workflowStatuses.LEASER_APPROVED ? true : offer.converted_to_contract
                } 
              : offer
          )
        );
        
        // Show appropriate toast based on the status change
        if (newStatus === workflowStatuses.LEASER_APPROVED) {
          toast.success("L'offre a été approuvée et convertie en contrat");
          // Refresh offers to ensure we get the latest data including conversion status
          setTimeout(() => fetchOffers(), 1000);
        } else {
          toast.success("Statut de l'offre mis à jour");
        }
      } else {
        console.error(`Status update failed for offer ${offerId}`);
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      console.error("Error updating offer status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleResendOffer = (offerId: string) => {
    toast.success("L'offre a été renvoyée avec succès");
  };

  const handleDownloadPdf = (offerId: string) => {
    toast.success("Le PDF a été téléchargé");
  };

  const filteredOffers = offers.filter((offer) => {
    const clientName = offer.client_name.toLowerCase();
    const clientCompany = offer.clients?.company?.toLowerCase() || '';
    
    const matchesSearch = 
      clientName.includes(searchTerm.toLowerCase()) ||
      clientCompany.includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || offer.status === activeTab;
    
    const matchesType = activeType === "all" || offer.type === activeType;
    
    return matchesSearch && matchesTab && matchesType;
  });

  return {
    offers,
    filteredOffers,
    loading,
    loadingError,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    activeType,
    setActiveType,
    isUpdatingStatus,
    includeConverted,
    setIncludeConverted,
    fetchOffers,
    handleDeleteOffer,
    handleResendOffer,
    handleDownloadPdf,
    handleUpdateWorkflowStatus
  };
};
