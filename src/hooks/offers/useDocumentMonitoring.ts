import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processInfoResponse } from "@/services/offers/offerWorkflow";
import { updateOfferStatus } from "@/services/offers/offerStatus";

interface UseDocumentMonitoringProps {
  offerId: string;
  currentStatus: string;
  analysisType: 'internal' | 'leaser'; // Nouveau: spécifier le type d'analyse
  onStatusChange?: (newStatus: string) => void;
}

export const useDocumentMonitoring = ({ 
  offerId, 
  currentStatus, 
  analysisType,
  onStatusChange 
}: UseDocumentMonitoringProps) => {
  
  // Vérifier si tous les documents requis sont approuvés
  const checkAllDocumentsApproved = useCallback(async (): Promise<boolean> => {
    try {
      console.log("🔍 Vérification des documents pour l'offre:", offerId);
      
      const { data: documents, error } = await supabase
        .from('offer_documents')
        .select('id, document_type, status, requested_by')
        .eq('offer_id', offerId)
        .eq('requested_by', analysisType);

      if (error) {
        console.error("Erreur lors de la récupération des documents:", error);
        return false;
      }

      if (!documents || documents.length === 0) {
        console.log("Aucun document trouvé pour cette offre");
        return false;
      }

      console.log("Documents trouvés:", documents);

      // Vérifier si tous les documents sont approuvés
      const allApproved = documents.every(doc => doc.status === 'approved');
      const hasRejected = documents.some(doc => doc.status === 'rejected');

      console.log(`Documents - Total: ${documents.length}, Tous approuvés: ${allApproved}, Certains rejetés: ${hasRejected}`);

      return allApproved && !hasRejected && documents.length > 0;
    } catch (error) {
      console.error("Erreur lors de la vérification des documents:", error);
      return false;
    }
  }, [offerId]);

  // Déclencher la transition automatique vers le score A
  const triggerAutoApproval = useCallback(async () => {
    try {
      console.log("🚀 Déclenchement de l'approbation automatique pour l'offre:", offerId);
      
      // Déterminer le nouveau statut selon le contexte
      let newStatus = '';
      if (currentStatus === 'internal_docs_requested') {
        newStatus = 'internal_approved';
      } else if (currentStatus === 'leaser_docs_requested') {
        newStatus = 'leaser_approved';
      } else {
        console.log("Statut actuel ne nécessite pas de transition automatique:", currentStatus);
        return;
      }

      // Mettre à jour le statut de l'offre
      const success = await updateOfferStatus(
        offerId,
        newStatus,
        currentStatus,
        "Approbation automatique - Tous les documents requis ont été validés"
      );

      if (success) {
        console.log("✅ Transition automatique réussie vers:", newStatus);
        
        // Notifier l'utilisateur
        toast.success("Documents validés ! Passage automatique au score A.", {
          description: "Tous les documents requis ont été approuvés."
        });

        // Notifier le parent du changement de statut
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
      } else {
        console.error("❌ Échec de la transition automatique");
        toast.error("Erreur lors de la transition automatique");
      }
    } catch (error) {
      console.error("Erreur lors de la transition automatique:", error);
      toast.error("Erreur lors de la transition automatique");
    }
  }, [offerId, currentStatus, onStatusChange]);

  // Surveiller les changements de documents en temps réel
  useEffect(() => {
    // Ne surveiller que si l'offre est en attente de documents
    if (!currentStatus.includes('docs_requested')) {
      return;
    }

    console.log("📡 Mise en place de la surveillance en temps réel des documents pour l'offre:", offerId);

    const channel = supabase
      .channel(`offer-documents-${offerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offer_documents',
          filter: `offer_id=eq.${offerId}`
        },
        async (payload) => {
          console.log("📨 Changement détecté dans les documents:", payload);
          
          // Petite temporisation pour s'assurer que la transaction DB est terminée
          setTimeout(async () => {
            const allApproved = await checkAllDocumentsApproved();
            
            if (allApproved) {
              console.log("🎉 Tous les documents sont approuvés ! Déclenchement de la transition automatique");
              await triggerAutoApproval();
            } else {
              console.log("⏳ Certains documents ne sont pas encore approuvés");
            }
          }, 1000);
        }
      )
      .subscribe();

    // Vérification initiale au cas où les documents seraient déjà tous approuvés
    const initialCheck = async () => {
      const allApproved = await checkAllDocumentsApproved();
      if (allApproved) {
        console.log("🎉 Vérification initiale: Tous les documents sont déjà approuvés !");
        await triggerAutoApproval();
      }
    };

    initialCheck();

    // Cleanup à la fin du cycle de vie
    return () => {
      console.log("🔌 Arrêt de la surveillance des documents");
      supabase.removeChannel(channel);
    };
  }, [offerId, currentStatus, checkAllDocumentsApproved, triggerAutoApproval]);

  return {
    checkAllDocumentsApproved
  };
};