// Hooks for offer actions including PDF generation
import React, { useState } from "react";
import { toast } from "sonner";
import { createRoot } from 'react-dom/client';
import CommercialOffer from '@/components/offers/CommercialOffer';
import { 
  deleteOffer, 
  updateOfferStatus, 
  sendInfoRequest, 
  processInfoResponse
} from "@/services/offerService";
import { Offer } from "./useFetchOffers";
import { sendOfferReadyEmail } from "@/services/emailService";
import { supabase } from "@/integrations/supabase/client";
import { fetchOfferCompanyBranding } from "@/services/offers/offerCompanyBranding";

export const useOfferActions = (offers: Offer[], setOffers: React.Dispatch<React.SetStateAction<Offer[]>>) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRequestingInfo, setIsRequestingInfo] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

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
      setIsSendingEmail(true);
      const offer = offers.find(o => o.id === id);
      if (!offer) throw new Error("Offre non trouvée");
      
      console.log("🚀 DÉBUT PROCESSUS ENVOI EMAIL");
      console.log("📋 Détails de l'offre:", {
        id: offer.id,
        client_name: offer.client_name,
        client_email: offer.client_email,
        workflow_status: offer.workflow_status
      });
      
      // Construire le lien de signature côté client
      const offerLink = `${window.location.origin}/client/offer/${offer.id}/sign`;
      console.log("🔗 Lien de signature généré:", offerLink);
      
      // Formatter la description de l'équipement si nécessaire
      let equipmentDescription = offer.equipment_description || "Votre équipement";
      
      // Vérifier si la description est un JSON et le formater proprement
      try {
        if (equipmentDescription.startsWith('[{') && equipmentDescription.endsWith('}]')) {
          const equipmentItems = JSON.parse(equipmentDescription);
          if (Array.isArray(equipmentItems) && equipmentItems.length > 0) {
            if (equipmentItems.length === 1) {
              equipmentDescription = equipmentItems[0].title || "Votre équipement";
            } else {
              equipmentDescription = `${equipmentItems.length} équipements dont ${equipmentItems[0].title}`;
            }
          }
        }
      } catch (e) {
        console.error("Erreur lors du parsing de la description de l'équipement:", e);
        // En cas d'erreur, conserver la description originale
      }
      
      console.log("📦 Description équipement formatée:", equipmentDescription);
      console.log("💰 Données financières:", {
        amount: offer.amount || 0,
        monthlyPayment: Number(offer.monthly_payment) || 0
      });
      
      // Mettre à jour le statut de l'offre si nécessaire
      if (offer.workflow_status === 'draft') {
        console.log("📝 Mise à jour du statut de brouillon vers envoyé");
        await handleUpdateWorkflowStatus(id, 'sent', 'Offre envoyée au client');
      }
      
      // Envoyer l'email "offre prête à consulter"
      console.log("📧 Tentative d'envoi de l'email avec sendOfferReadyEmail");
      const success = await sendOfferReadyEmail(
        offer.client_email,
        offer.client_name,
        {
          id: offer.id,
          description: equipmentDescription,
          amount: typeof offer.amount === 'string' ? Number(offer.amount) : (offer.amount || 0),
          monthlyPayment: Number(offer.monthly_payment || 0)
        },
        offerLink // Passer le lien en paramètre
      );
      
      if (success) {
        console.log("✅ Email envoyé avec succès");
        toast.success("L'offre a été envoyée au client avec succès");
      } else {
        console.error("❌ Échec de l'envoi de l'email");
        console.error("Vérifiez les logs de la fonction edge send-resend-email");
        toast.error("Erreur lors de l'envoi de l'offre par email. Vérifiez la configuration email.");
      }
    } catch (error) {
      console.error("💥 Erreur générale lors de l'envoi de l'offre:", error);
      toast.error("Erreur lors de l'envoi de l'offre");
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  const handleGenerateOffer = async (id: string): Promise<void> => {
    const toastId = toast.loading('Génération du PDF...');
    try {
      // Moteur de rendu PDF unique (cf. commercialOfferPdfService).
      const { downloadCommercialOfferPDF } = await import('@/services/commercialOfferPdfService');
      await downloadCommercialOfferPDF(id);
      toast.success('PDF téléchargé avec succès !', { id: toastId });
    } catch (error) {
      console.error('❌ Erreur génération PDF:', error);
      toast.error(`Erreur: ${(error as Error).message}`, { id: toastId });
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

  const handleInternalScoring = async (offerId: string, score: 'A' | 'B' | 'C', reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      let newStatus: string;
      let statusReason: string;
      
      switch (score) {
        case 'A':
          newStatus = 'internal_approved';
          statusReason = `Analyse interne - Score A (Approuvé)${reason ? `: ${reason}` : ''}`;
          break;
        case 'B':
          newStatus = 'internal_docs_requested';
          statusReason = `Analyse interne - Score B (Documents requis): ${reason}`;
          break;
        case 'C':
          newStatus = 'internal_rejected';
          statusReason = `Analyse interne - Score C (Refusé): ${reason}`;
          break;
      }
      
      const success = await updateOfferStatus(offerId, newStatus, offer.workflow_status, statusReason);
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        toast.success(`Score ${score} attribué avec succès`);
      } else {
        toast.error("Erreur lors de l'attribution du score");
      }
    } catch (error) {
      console.error("Error scoring offer internally:", error);
      toast.error("Erreur lors de l'attribution du score");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLeaserScoring = async (offerId: string, score: 'A' | 'B' | 'C', reason?: string) => {
    try {
      setIsUpdatingStatus(true);
      
      const offer = offers.find(o => o.id === offerId);
      if (!offer) throw new Error("Offre non trouvée");
      
      let newStatus: string;
      let statusReason: string;
      
      switch (score) {
        case 'A':
          // Étape 1: Passer à leaser_approved
          newStatus = 'leaser_approved';
          statusReason = `Analyse Leaser - Score A (Approuvé)${reason ? `: ${reason}` : ''}`;
          
          // Mettre à jour vers leaser_approved
          const stepOneSuccess = await updateOfferStatus(offerId, newStatus, offer.workflow_status, statusReason);
          
          if (stepOneSuccess) {
            // Étape 2: Transition automatique vers validated (Contrat prêt)
            const { error: validatedError } = await supabase
              .from('offers')
              .update({ 
                workflow_status: 'validated',
                status: 'accepted' // Mettre le status général à accepted
              })
              .eq('id', offerId);
            
            if (!validatedError) {
              // Logger la transition vers validated
              await supabase
                .from('offer_workflow_logs')
                .insert({
                  offer_id: offerId,
                  user_id: (await supabase.auth.getUser()).data.user?.id,
                  previous_status: 'leaser_approved',
                  new_status: 'validated',
                  reason: 'Transition automatique après approbation leaser - Contrat prêt'
                });
              
              setOffers(prevOffers => prevOffers.map(o => 
                o.id === offerId ? { 
                  ...o, 
                  workflow_status: 'validated',
                  status: 'accepted'
                } : o
              ));
              toast.success(`Score ${score} attribué - Contrat prêt à être envoyé`);
            } else {
              console.error("Erreur lors de la transition vers validated:", validatedError);
              toast.error("Erreur lors de la transition vers Contrat prêt");
            }
          } else {
            toast.error("Erreur lors de l'attribution du score");
          }
          return;
          
        case 'B':
          newStatus = 'leaser_docs_requested';
          statusReason = `Analyse Leaser - Score B (Documents requis): ${reason}`;
          break;
        case 'C':
          newStatus = 'leaser_rejected';
          statusReason = `Analyse Leaser - Score C (Refusé): ${reason}`;
          break;
      }
      
      const success = await updateOfferStatus(offerId, newStatus, offer.workflow_status, statusReason);
      
      if (success) {
        setOffers(prevOffers => prevOffers.map(o => 
          o.id === offerId ? { ...o, workflow_status: newStatus } : o
        ));
        toast.success(`Score ${score} attribué avec succès`);
      } else {
        toast.error("Erreur lors de l'attribution du score");
      }
    } catch (error) {
      console.error("Error scoring offer by leaser:", error);
      toast.error("Erreur lors de l'attribution du score");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return {
    isUpdatingStatus,
    isRequestingInfo,
    isGeneratingPdf,
    isSendingEmail,
    handleDeleteOffer,
    handleUpdateWorkflowStatus,
    handleResendOffer,
    handleGenerateOffer,
    handleRequestInfo,
    handleProcessInfoResponse,
    handleInternalScoring,
    handleLeaserScoring
  };
};
