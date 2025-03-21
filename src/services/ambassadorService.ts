import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Définition du schéma pour les données d'ambassadeur
export const ambassadorSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().min(5, "Veuillez entrer un numéro de téléphone valide").optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
  region: z.string().optional(),
  company: z.string().optional(),
  vat_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  commission_level_id: z.string().uuid().optional()
});

// Type des données du formulaire d'ambassadeur
export type AmbassadorFormValues = z.infer<typeof ambassadorSchema>;

// Type complet d'un ambassadeur avec ID et données additionnelles
export interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  notes?: string;
  region?: string;
  company?: string;
  vat_number?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
  clients_count?: number;
  commissions_total?: number;
  last_commission?: number;
  commission_level_id?: string;
  has_user_account?: boolean;
  user_account_created_at?: string;
  user_id?: string;
}

// Récupérer tous les ambassadeurs
export const getAmbassadors = async (): Promise<Ambassador[]> => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching ambassadors:", error);
    return [];
  }
};

// Récupérer un ambassadeur par son ID
export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    console.log(`Ambassadeur récupéré avec succès. ID: ${id}, Barème: ${data.commission_level_id}`);
    return data;
  } catch (error) {
    console.error(`Error fetching ambassador with ID ${id}:`, error);
    throw error;
  }
};

// Créer un nouvel ambassadeur
export const createAmbassador = async (
  ambassadorData: AmbassadorFormValues
): Promise<Ambassador> => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .insert([ambassadorData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating ambassador:", error);
    throw error;
  }
};

// Mettre à jour un ambassadeur existant - version complètement réécrite pour résoudre le problème
export const updateAmbassador = async (
  id: string,
  ambassadorData: AmbassadorFormValues
): Promise<void> => {
  try {
    console.log(`[updateAmbassador] Début de la mise à jour pour l'ambassadeur ${id}`);
    console.log(`[updateAmbassador] Données à mettre à jour:`, ambassadorData);
    
    // Traiter la mise à jour du barème séparément
    let levelUpdated = false;
    if (ambassadorData.commission_level_id) {
      console.log(`[updateAmbassador] Mise à jour du barème demandée: ${ambassadorData.commission_level_id}`);
      
      try {
        // Mise à jour DIRECTE du barème dans la table ambassadors
        const { error: levelError } = await supabase
          .from("ambassadors")
          .update({ 
            commission_level_id: ambassadorData.commission_level_id,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);
          
        if (levelError) {
          console.error(`[updateAmbassador] Erreur lors de la mise à jour du barème:`, levelError);
          throw new Error(`Erreur lors de la mise à jour du barème: ${levelError.message}`);
        }
        
        // Vérification immédiate que la mise à jour a bien été appliquée
        const { data: verifyData, error: verifyError } = await supabase
          .from("ambassadors")
          .select("commission_level_id")
          .eq("id", id)
          .single();
          
        if (verifyError) {
          console.error(`[updateAmbassador] Erreur lors de la vérification:`, verifyError);
          throw new Error(`Erreur lors de la vérification: ${verifyError.message}`);
        }
        
        if (verifyData.commission_level_id !== ambassadorData.commission_level_id) {
          console.error(`[updateAmbassador] La mise à jour du barème n'a pas été prise en compte!`);
          console.error(`Attendu: ${ambassadorData.commission_level_id}, Reçu: ${verifyData.commission_level_id}`);
          throw new Error("La mise à jour du barème n'a pas été appliquée correctement");
        }
        
        levelUpdated = true;
        console.log(`[updateAmbassador] Barème mis à jour avec succès: ${ambassadorData.commission_level_id}`);
      } 
      catch (e) {
        console.error(`[updateAmbassador] Erreur critique lors de la mise à jour du barème:`, e);
        toast.error("Erreur lors de la mise à jour du barème");
        throw e;
      }
    }
    
    // Préparer les données pour la mise à jour
    const { commission_level_id, ...updateData } = ambassadorData;
    
    // Mise à jour des autres données
    const { error: updateError } = await supabase
      .from("ambassadors")
      .update(updateData)
      .eq("id", id);
      
    if (updateError) {
      console.error(`[updateAmbassador] Erreur lors de la mise à jour des données générales:`, updateError);
      throw updateError;
    }
    
    console.log(`[updateAmbassador] Mise à jour terminée avec succès pour l'ambassadeur ${id}`);
    if (levelUpdated) {
      console.log(`[updateAmbassador] Récapitulatif: barème mis à jour: ${ambassadorData.commission_level_id}`);
    }
  } catch (error) {
    console.error(`[updateAmbassador] Erreur générale:`, error);
    throw error;
  }
};

// Supprimer un ambassadeur
export const deleteAmbassador = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from("ambassadors").delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting ambassador with ID ${id}:`, error);
    throw error;
  }
};

// Obtenir les statistiques des ambassadeurs
export const getAmbassadorStats = async (id: string) => {
  try {
    // Obtenir le nombre de clients
    const { count: clientsCount, error: clientsError } = await supabase
      .from("ambassador_clients")
      .select("client_id", { count: "exact" })
      .eq("ambassador_id", id);

    if (clientsError) throw clientsError;

    // Obtenir le total des commissions
    const { data: commissions, error: commissionsError } = await supabase
      .from("ambassador_commissions")
      .select("amount")
      .eq("ambassador_id", id);

    if (commissionsError) throw commissionsError;

    const totalCommissions = commissions.reduce(
      (sum, commission) => sum + (parseFloat(commission.amount) || 0),
      0
    );

    // Obtenir la dernière commission
    const { data: lastCommission, error: lastCommissionError } = await supabase
      .from("ambassador_commissions")
      .select("amount")
      .eq("ambassador_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastCommissionError) throw lastCommissionError;

    return {
      clientsCount: clientsCount || 0,
      totalCommissions,
      lastCommissionAmount: lastCommission.length > 0 ? lastCommission[0].amount : 0,
    };
  } catch (error) {
    console.error(`Error fetching stats for ambassador ${id}:`, error);
    return {
      clientsCount: 0,
      totalCommissions: 0,
      lastCommissionAmount: 0,
    };
  }
};

// Obtenir tous les clients d'un ambassadeur
export const getAmbassadorClients = async (ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from("ambassador_clients")
      .select("client_id, clients(*)")
      .eq("ambassador_id", ambassadorId);

    if (error) throw error;

    // Transformer les données pour extraire seulement les informations du client
    return data.map((item) => item.clients) || [];
  } catch (error) {
    console.error(`Error fetching clients for ambassador ${ambassadorId}:`, error);
    return [];
  }
};

// Obtenir toutes les commissions d'un ambassadeur
export const getAmbassadorCommissions = async (ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from("ambassador_commissions")
      .select("*")
      .eq("ambassador_id", ambassadorId)
      .order("date", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching commissions for ambassador ${ambassadorId}:`, error);
    return [];
  }
};

// Fonction spécifique pour mettre à jour le barème de commissionnement
export const updateAmbassadorCommissionLevel = async (ambassadorId: string, levelId: string): Promise<void> => {
  try {
    console.log(`[updateAmbassadorCommissionLevel] DÉBUT - Mise à jour du barème pour l'ambassadeur ${ambassadorId} vers ${levelId}`);
    
    // Force une mise à jour directe avec un timestamp unique pour éviter les problèmes de cache
    const timestamp = new Date().toISOString();
    const { error } = await supabase
      .from("ambassadors")
      .update({ 
        commission_level_id: levelId,
        updated_at: timestamp
      })
      .eq("id", ambassadorId);
      
    if (error) {
      console.error(`[updateAmbassadorCommissionLevel] Erreur:`, error);
      throw error;
    }

    // Vérification immédiate que la mise à jour a été appliquée
    const { data, error: verifyError } = await supabase
      .from("ambassadors")
      .select("id, commission_level_id")
      .eq("id", ambassadorId)
      .single();
      
    if (verifyError) {
      console.error(`[updateAmbassadorCommissionLevel] Erreur lors de la vérification:`, verifyError);
      throw verifyError;
    }
    
    if (data.commission_level_id !== levelId) {
      console.error(`[updateAmbassadorCommissionLevel] Échec de la mise à jour!`);
      console.error(`Attendu: ${levelId}, Reçu: ${data.commission_level_id}`);
      
      // Dernière tentative avec un timestamp encore plus récent
      const newTimestamp = new Date().toISOString();
      const { error: retryError } = await supabase
        .from("ambassadors")
        .update({ 
          commission_level_id: levelId,
          updated_at: newTimestamp
        })
        .eq("id", ambassadorId);
        
      if (retryError) {
        console.error(`[updateAmbassadorCommissionLevel] Erreur lors de la dernière tentative:`, retryError);
        throw new Error(`Impossible de mettre à jour le barème après plusieurs tentatives`);
      }
      
      // Vérification finale
      const { data: finalData, error: finalError } = await supabase
        .from("ambassadors")
        .select("commission_level_id")
        .eq("id", ambassadorId)
        .single();
        
      if (finalError) {
        console.error(`[updateAmbassadorCommissionLevel] Erreur lors de la vérification finale:`, finalError);
        throw finalError;
      }
      
      if (finalData.commission_level_id !== levelId) {
        console.error(`[updateAmbassadorCommissionLevel] Échec total de la mise à jour.`);
        throw new Error(`Mise à jour du barème impossible: ${finalData.commission_level_id} au lieu de ${levelId}`);
      }
      
      console.log(`[updateAmbassadorCommissionLevel] Mise à jour réussie après dernière tentative: ${finalData.commission_level_id}`);
    } else {
      console.log(`[updateAmbassadorCommissionLevel] Mise à jour réussie: ${data.commission_level_id}`);
    }
  } catch (error) {
    console.error(`[updateAmbassadorCommissionLevel] ERREUR CRITIQUE:`, error);
    throw error;
  }
};
