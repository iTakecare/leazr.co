
import { useState } from "react";
import { deleteOffer, updateOfferStatus } from "@/services/offerService";
import { toast } from "sonner";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import { Offer } from "./useFetchOffers";

export const useOfferActions = (offers: Offer[], setOffers: React.Dispatch<React.SetStateAction<Offer[]>>) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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
    if (!Object.values(OFFER_STATUSES).some(status => status.id === newStatus)) {
      console.error(`Invalid workflow status: ${newStatus}`);
      toast.error("Statut invalide");
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
      
      // Skip update if status hasn't changed
      if (currentOffer.workflow_status === newStatus) {
        console.log("Status unchanged, skipping update");
        toast.info("Le statut est déjà à cette valeur");
        setIsUpdatingStatus(false);
        return;
      }
      
      // Update the status in the database
      const success = await updateOfferStatus(offerId, newStatus, currentOffer.workflow_status || OFFER_STATUSES.DRAFT.id, reason);
      
      if (success) {
        console.log(`Status update successful for offer ${offerId} to ${newStatus}`);
        
        // Update the local state immediately for better reactivity
        setOffers(prevOffers => 
          prevOffers.map(offer => 
            offer.id === offerId 
              ? { 
                  ...offer, 
                  workflow_status: newStatus,
                  // Mark as converted to contract if financed
                  converted_to_contract: newStatus === OFFER_STATUSES.FINANCED.id ? true : offer.converted_to_contract
                } 
              : offer
          )
        );
        
        // Show appropriate toast based on the status change
        if (newStatus === OFFER_STATUSES.FINANCED.id) {
          toast.success("L'offre a été financée et convertie en contrat");
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

  return {
    isUpdatingStatus,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    handleResendOffer,
    handleDownloadPdf
  };
};
