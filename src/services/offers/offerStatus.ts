
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createContractFromOffer } from "../contractService";

/**
 * Détermine si un statut est un statut final qui déclenche la conversion en contrat
 */
const isFinalStatus = (status: string): boolean => {
  const finalStatuses = ['validated', 'offer_validation', 'financed'];
  return finalStatuses.includes(status);
};

export const deleteOffer = async (offerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', offerId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting offer:", error);
    return false;
  }
};

export type RejectionCategory =
  | 'fraud'
  | 'young_company'
  | 'private_client'
  | 'financial_situation'
  | 'other';

export interface UpdateOfferStatusOptions {
  rejectionCategory?: RejectionCategory | null;
  previousOfferId?: string | null;
}

export const updateOfferStatus = async (
  offerId: string,
  newStatus: string,
  previousStatus: string | null,
  reason?: string,
  options?: UpdateOfferStatusOptions
): Promise<boolean> => {
  try {
    console.log(`Updating offer ${offerId} from ${previousStatus || 'draft'} to ${newStatus} with reason: ${reason || 'Aucune'}`);

    // Vérifier que les statuts sont valides
    if (!newStatus) {
      throw new Error("Le nouveau statut est requis");
    }

    // Get the user for logging the change
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    console.log("Authenticated user:", user.id);

    // Ensure the previous status is never null for database constraints
    const safePreviousStatus = previousStatus || 'draft';

    // First, update the offer's workflow_status and scores
    const updateData: any = { workflow_status: newStatus };

    // Update scores based on status transitions
    if (newStatus === 'internal_approved') {
      updateData.internal_score = 'A';
    } else if (newStatus === 'leaser_approved') {
      updateData.leaser_score = 'A';
    } else if (newStatus === 'internal_docs_requested') {
      updateData.internal_score = 'B';
    } else if (newStatus === 'leaser_docs_requested') {
      updateData.leaser_score = 'B';
    } else if (newStatus === 'internal_rejected') {
      updateData.internal_score = 'C';
    } else if (newStatus === 'leaser_rejected') {
      updateData.leaser_score = 'C';
    } else if (newStatus === 'without_follow_up') {
      // Score D for without_follow_up status
      updateData.internal_score = 'D';
    }

    if (options?.rejectionCategory !== undefined) {
      updateData.rejection_category = options.rejectionCategory;
    }
    if (options?.previousOfferId !== undefined) {
      updateData.previous_offer_id = options.previousOfferId;
    }
    
    const { error: updateError } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', offerId);
      
    if (updateError) {
      console.error("Erreur lors de la mise à jour du statut:", updateError);
      throw new Error("Erreur lors de la mise à jour du statut");
    }
    
    console.log("Offer status updated successfully");


    // Then, log the status change with more detailed logging
    console.log("Inserting workflow log:", {
      offer_id: offerId,
      user_id: user.id,
      previous_status: safePreviousStatus,
      new_status: newStatus,
      reason: reason || null
    });

    const { data: logData, error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        user_id: user.id,
        previous_status: safePreviousStatus,
        new_status: newStatus,
        reason: reason || null
      })
      .select();

    if (logError) {
      console.error("Erreur lors de l'enregistrement du log:", logError);
      // Don't throw here, the status update was successful
    } else {
      console.log("Log created successfully:", logData);
    }

    // NOTE: Email sending is now handled manually through EmailConfirmationModal
    // when transitioning from leaser_approved to offer_validation
    console.log("ℹ️ Transition de statut détectée:", safePreviousStatus, "->", newStatus);

    // Si le statut est un statut final (validated, offer_validation, financed), créer automatiquement un contrat ou une facture
    if (isFinalStatus(newStatus)) {
      console.log("🔄 DÉBUT: Conversion automatique pour l'offre:", offerId);
      console.log("🔄 Statut final détecté:", newStatus);
      console.log("🔄 Statut précédent:", safePreviousStatus, "-> Nouveau statut:", newStatus);
      
      try {
        // Récupérer les infos nécessaires pour créer le contrat ou la facture
        console.log("📋 ÉTAPE 1: Récupération des données de l'offre...");
        const { data: offerData, error: offerDataError } = await supabase
          .from('offers')
          .select('*')
          .eq('id', offerId)
          .single();
        
        if (offerDataError || !offerData) {
          console.error("❌ ERREUR ÉTAPE 1: Impossible de récupérer l'offre:", offerDataError);
          throw new Error("Impossible de récupérer les détails de l'offre");
        }

        // Vérifier si c'est une offre d'achat (pas de contrat, facturation directe)
        if (offerData.is_purchase === true) {
          console.log("🧾 Offre d'achat détectée - Passage à la facturation directe (pas de contrat)");
          toast.success("Offre d'achat finalisée ! Prêt pour la facturation directe.");
          // Note: La facturation sera créée manuellement par l'utilisateur depuis la page de l'offre
          return true;
        }

        // Vérifier et corriger l'user_id si nécessaire
        if (!offerData.user_id) {
          console.log("⚠️ CORRECTION: user_id manquant, attribution automatique...");
          const { data: adminUser } = await supabase
            .from('profiles')
            .select('id')
            .eq('company_id', offerData.company_id)
            .in('role', ['admin', 'super_admin'])
            .limit(1)
            .single();
          
          if (adminUser) {
            await supabase
              .from('offers')
              .update({ user_id: adminUser.id })
              .eq('id', offerId);
            offerData.user_id = adminUser.id;
            console.log("✅ user_id corrigé:", adminUser.id);
          }
        }
        
        console.log("✅ ÉTAPE 1: Données de l'offre récupérées:", {
          id: offerData.id,
          client_name: offerData.client_name,
          monthly_payment: offerData.monthly_payment,
          client_id: offerData.client_id,
          company_id: offerData.company_id,
          user_id: offerData.user_id,
          is_purchase: offerData.is_purchase
        });
        
        // Récupérer le leaser sélectionné dans l'offre
        console.log("🏢 ÉTAPE 2: Récupération du bailleur sélectionné...");
        console.log("📋 leaser_id de l'offre:", offerData.leaser_id);
        
        let leaserName = "Leaser par défaut";
        let leaserLogo = null;
        
        if (offerData.leaser_id) {
          // Utiliser le leaser sélectionné dans l'offre
          const { data: selectedLeaser } = await supabase
            .from('leasers')
            .select('name, company_name, logo_url')
            .eq('id', offerData.leaser_id)
            .single();
          
          if (selectedLeaser) {
            leaserName = selectedLeaser.name || selectedLeaser.company_name;
            leaserLogo = selectedLeaser.logo_url;
            console.log("✅ Bailleur trouvé depuis l'offre:", leaserName);
          } else {
            console.warn("⚠️ Leaser ID dans l'offre mais leaser introuvable, utilisation du fallback");
          }
        } else {
          // Fallback: récupérer le premier leaser disponible de l'entreprise
          console.warn("⚠️ Aucun leaser_id dans l'offre, utilisation du premier disponible");
          const { data: availableLeasers } = await supabase
            .from('leasers')
            .select('name, company_name, logo_url')
            .eq('company_id', offerData.company_id)
            .limit(1);
          
          if (availableLeasers?.[0]) {
            leaserName = availableLeasers[0].name || availableLeasers[0].company_name;
            leaserLogo = availableLeasers[0].logo_url;
            console.log("✅ Bailleur fallback utilisé:", leaserName);
          }
        }
        
        console.log("🏢 ÉTAPE 2: Création du contrat avec le bailleur:", leaserName);
        
        const contractId = await createContractFromOffer(offerId, leaserName, leaserLogo);
        
        if (contractId) {
          console.log("✅ ÉTAPE 2: Contrat créé avec succès - ID:", contractId);
          console.log("✅ SUCCÈS: Conversion automatique terminée avec succès");
          toast.success(`Offre financée avec succès ! Contrat créé (ID: ${contractId.substring(0, 8)})`);
        } else {
          console.error("❌ ÉTAPE 2: Échec de la création du contrat - contractId est null");
          throw new Error("La fonction createContractFromOffer a retourné null");
        }
      } catch (contractError) {
        console.error("❌ ERREUR GLOBALE: Erreur lors de la création du contrat:", contractError);
        console.error("❌ Stack trace:", contractError.stack);
        toast.error(`Erreur lors de la conversion en contrat: ${contractError.message}`);
        
        // Optionnel : revenir au statut précédent en cas d'échec
        console.log("🔄 Tentative de restauration du statut précédent...");
        try {
          await supabase.from('offers').update({ workflow_status: safePreviousStatus }).eq('id', offerId);
          console.log("✅ Statut restauré vers:", safePreviousStatus);
        } catch (rollbackError) {
          console.error("❌ Impossible de restaurer le statut:", rollbackError);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating offer status:", error);
    return false;
  }
};

export const getWorkflowHistory = async (offerId: string) => {
  try {
    console.log("Fetching workflow history for offer:", offerId);
    
    // Récupérer d'abord tous les logs pour cette offre
    const { data: logs, error: logsError } = await supabase
      .from('offer_workflow_logs')
      .select('*')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    
    if (logsError) {
      console.error("Error fetching workflow logs:", logsError);
      throw logsError;
    }
    
    console.log("Raw logs retrieved:", logs);
    
    if (!logs || logs.length === 0) {
      console.log("No workflow logs found for offer:", offerId);
      return [];
    }
    
    // Récupérer les informations des utilisateurs pour tous les logs
    const userIds = [...new Set(logs.map(log => log.user_id))];
    console.log("Unique user IDs:", userIds);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .in('id', userIds);
    
    if (profilesError) {
      console.error("Error fetching user profiles:", profilesError);
    }
    
    console.log("User profiles retrieved:", profiles);
    
    // Enrichir les logs avec les informations des utilisateurs
    const enhancedLogs = logs.map(log => {
      const userProfile = profiles?.find(profile => profile.id === log.user_id);
      
      if (userProfile && userProfile.first_name && userProfile.last_name) {
        return {
          ...log,
          user_name: `${userProfile.first_name} ${userProfile.last_name}`,
          profiles: userProfile
        };
      }
      
      // Fallback si pas de profil trouvé
      return {
        ...log,
        user_name: `Utilisateur (${log.user_id.substring(0, 6)})`,
        profiles: null
      };
    });
    
    console.log("Enhanced logs:", enhancedLogs);
    return enhancedLogs;
  } catch (error) {
    console.error("Error in getWorkflowHistory:", error);
    return [];
  }
};

export const getCompletedStatuses = async (offerId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('offer_workflow_logs')
      .select('new_status')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error fetching completed statuses:", error);
      throw error;
    }
    
    // Extraire les statuts uniques dans l'ordre chronologique
    const uniqueStatuses = new Set<string>();
    data?.forEach(log => uniqueStatuses.add(log.new_status));
    
    return Array.from(uniqueStatuses);
  } catch (error) {
    console.error("Error in getCompletedStatuses:", error);
    return [];
  }
};
