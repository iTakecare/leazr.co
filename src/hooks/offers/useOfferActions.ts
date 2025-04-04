
import { useState } from "react";
import { toast } from "sonner";
import { 
  deleteOffer, 
  updateOfferStatus, 
  sendInfoRequest, 
  processInfoResponse,
  generateAndDownloadOfferPdf 
} from "@/services/offerService";
import { Offer } from "./useFetchOffers";
import { useNavigate } from "react-router-dom";

export const useOfferActions = (offers: Offer[], setOffers: React.Dispatch<React.SetStateAction<Offer[]>>) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRequestingInfo, setIsRequestingInfo] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const navigate = useNavigate();

  const handleViewOffer = (offerId: string) => {
    console.log("Navigating to offer details:", offerId);
    navigate(`/offers/${offerId}`);
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      const success = await deleteOffer(id);
      
      if (success) {
        setOffers(prevOffers => prevOffers.filter(offer => offer.id !== id));
        toast.success("Offre supprimée avec succès");
      } else {
        toast.error("Erreur lors de la suppression de l'offre");
      }
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Erreur lors de la suppression de l'offre");
    }
  };
  
  const handleUpdateWorkflowStatus = async (offerId: string, newStatus: string, reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      const success = await updateOfferStatus(
        offerId, 
        newStatus, 
        offer.workflow_status,
        reason
      );
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        toast.success(`Statut mis à jour avec succès`);
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
  
  const handleResendOffer = async (id: string) => {
    try {
      toast.success("L'offre a été renvoyée au client");
      // Implémentation pour renvoyer l'offre par email à intégrer ici
    } catch (error) {
      console.error("Error resending offer:", error);
      toast.error("Erreur lors du renvoi de l'offre");
    }
  };
  
  const handleDownloadPdf = async (id: string) => {
    try {
      setIsGeneratingPdf(true);
      toast.info("Génération du PDF en cours...");
      
      const offer = offers.find(o => o.id === id);
      if (!offer) throw new Error("Offre non trouvée");
      
      const filename = await generateAndDownloadOfferPdf(id);
      
      if (filename) {
        toast.success(`PDF généré avec succès: ${filename}`);
      } else {
        throw new Error("Erreur lors de la génération du PDF");
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  const handleRequestInfo = async (offerId: string, requestedDocs: string[], customMessage: string) => {
    try {
      setIsRequestingInfo(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      console.log("Demande d'informations pour l'offre:", offerId);
      console.log("Documents demandés:", requestedDocs);
      console.log("Message personnalisé:", customMessage);
      
      const data = {
        offerId,
        requestedDocs,
        customMessage,
        previousStatus: offer.workflow_status
      };
      
      const success = await sendInfoRequest(data);
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: 'info_requested' } : o
        ));
        toast.success("Demande d'informations envoyée avec succès");
      } else {
        toast.error("Erreur lors de l'envoi de la demande");
      }
    } catch (error) {
      console.error("Error requesting information:", error);
      toast.error("Erreur lors de la demande d'informations");
    } finally {
      setIsRequestingInfo(false);
    }
  };
  
  const handleProcessInfoResponse = async (offerId: string, approve: boolean) => {
    try {
      setIsUpdatingStatus(true);
      
      const success = await processInfoResponse(offerId, approve);
      
      if (success) {
        const newStatus = approve ? 'leaser_review' : 'rejected';
        
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        
        toast.success(approve 
          ? "L'offre a été approuvée et envoyée au bailleur" 
          : "L'offre a été rejetée"
        );
      } else {
        toast.error("Erreur lors du traitement de la réponse");
      }
    } catch (error) {
      console.error("Error processing info response:", error);
      toast.error("Erreur lors du traitement de la réponse");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    isUpdatingStatus,
    isRequestingInfo,
    isGeneratingPdf,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    handleResendOffer,
    handleDownloadPdf,
    handleRequestInfo,
    handleProcessInfoResponse,
    handleViewOffer // Export the new function
  };
};
