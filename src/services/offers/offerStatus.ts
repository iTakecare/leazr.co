
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createContractFromOffer } from "../contractService";
import { logStatusChange } from "./offerHistory";

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

export const updateOfferStatus = async (
  offerId: string, 
  newStatus: string, 
  previousStatus: string | null,
  reason?: string
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
    
    // First, update the offer's workflow_status
    const { error: updateError } = await supabase
      .from('offers')
      .update({ workflow_status: newStatus })
      .eq('id', offerId);
      
    if (updateError) {
      console.error("Erreur lors de la mise à jour du statut:", updateError);
      throw new Error("Erreur lors de la mise à jour du statut");
    }
    
    console.log("Offer status updated successfully");

    // NOUVEAU : Utiliser le nouveau système d'historique pour enregistrer le changement de statut
    try {
      await logStatusChange(offerId, user.id, safePreviousStatus, newStatus, reason);
      console.log("✅ Changement de statut ajouté à l'historique complet");
    } catch (historyError) {
      console.error("❌ Erreur lors de l'ajout à l'historique complet:", historyError);
      // Ne pas faire échouer la mise à jour pour un problème d'historique
    }

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

    // Si le statut est financed, créer automatiquement un contrat
    if (newStatus === 'financed') {
      console.log("🔄 DÉBUT: Conversion automatique vers contrat pour l'offre:", offerId);
      console.log("🔄 Statut précédent:", safePreviousStatus, "-> Nouveau statut:", newStatus);
      
      try {
        // Récupérer les infos nécessaires pour créer le contrat
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
          user_id: offerData.user_id
        });
        
        // Utiliser un bailleur par défaut (pourrait être amélioré pour permettre le choix)
        const leaserName = "Grenke";
        const leaserLogo = "https://logo.clearbit.com/grenke.com";
        
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
