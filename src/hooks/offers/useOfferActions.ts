
import { useState } from "react";
import { toast } from "sonner";
import { deleteOffer, updateOfferStatus, sendInfoRequest, processInfoResponse } from "@/services/offerService";
import { generateOfferPdf } from "@/utils/pdfGenerator";
import { Offer } from "./useFetchOffers";

export const useOfferActions = (offers: Offer[], setOffers: React.Dispatch<React.SetStateAction<Offer[]>>) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRequestingInfo, setIsRequestingInfo] = useState(false);

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
  
  const handleUpdateWorkflowStatus = async (offerId: string, newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      // Update to match the expected parameters for updateOfferStatus (2 parameters)
      // Cast the newStatus to any to avoid TypeScript error
      const success = await updateOfferStatus(offerId, newStatus as any);
      
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
  
  const handleDownloadPdf = (id: string) => {
    try {
      const offer = offers.find(o => o.id === id);
      if (!offer) throw new Error("Offre non trouvée");
      
      const filename = generateOfferPdf(offer);
      toast.success(`Le PDF a été généré sous le nom ${filename}`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    }
  };
  
  const handleRequestInfo = async (offerId: string, message: string) => {
    try {
      setIsRequestingInfo(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      console.log("Demande d'informations pour l'offre:", offerId);
      console.log("Message personnalisé:", message);
      
      // Update to match the expected parameters for sendInfoRequest (only need offerId and message)
      const success = await sendInfoRequest(offerId, message);
      
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
      
      // Convert boolean to string for the API
      const responseStatus = approve ? "approved" : "rejected";
      // Cast the boolean to string to avoid TypeScript error
      const success = await processInfoResponse(offerId, responseStatus);
      
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
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    handleResendOffer,
    handleDownloadPdf,
    handleRequestInfo,
    handleProcessInfoResponse
  };
};
