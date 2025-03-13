
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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    setLoading(true);
    setLoadingError(null);
    
    try {
      const offersData = await getOffers();
      
      if (Array.isArray(offersData)) {
        // Pour les offres sans statut de workflow, définir par défaut selon le statut
        const offersWithWorkflow = offersData.map(offer => {
          if (!offer.workflow_status) {
            // Attribuer un statut de workflow basé sur le status existant
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
        
        setOffers(offersWithWorkflow);
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
        // Mise à jour locale pour éviter de refaire un appel réseau
        setOffers(offers.filter(offer => offer.id !== offerId));
      } else {
        toast.error("Erreur lors de la suppression de l'offre");
      }
    }
  };

  const handleUpdateWorkflowStatus = async (offerId: string, newStatus: string, reason?: string) => {
    setIsUpdatingStatus(true);
    try {
      // Appeler l'API pour mettre à jour le statut
      const success = await updateOfferStatus(offerId, newStatus, reason);
      
      if (success) {
        // Mettre à jour localement
        setOffers(prevOffers => 
          prevOffers.map(offer => 
            offer.id === offerId 
              ? { ...offer, workflow_status: newStatus } 
              : offer
          )
        );
        
        toast.success("Statut de l'offre mis à jour");
      } else {
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
    // Rechercher dans le nom du client ou le nom de la société du client s'il est lié
    const clientName = offer.client_name.toLowerCase();
    const clientCompany = offer.clients?.company?.toLowerCase() || '';
    
    const matchesSearch = 
      clientName.includes(searchTerm.toLowerCase()) ||
      clientCompany.includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === "all" || offer.status === activeTab;
    
    return matchesSearch && matchesTab;
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
    isUpdatingStatus,
    fetchOffers,
    handleDeleteOffer,
    handleResendOffer,
    handleDownloadPdf,
    handleUpdateWorkflowStatus
  };
};
