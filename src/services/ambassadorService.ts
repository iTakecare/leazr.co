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

// Mettre à jour un ambassadeur existant - Nouvelle version simplifiée et plus fiable
export const updateAmbassador = async (
  id: string,
  ambassadorData: AmbassadorFormValues
): Promise<void> => {
  try {
    console.log(`[updateAmbassador] Mise à jour de l'ambassadeur ${id} avec commission_level_id: ${ambassadorData.commission_level_id}`);
    
    // On traite séparément le barème de commissionnement pour s'assurer qu'il est correctement mis à jour
    if (ambassadorData.commission_level_id) {
      await updateAmbassadorCommissionLevel(id, ambassadorData.commission_level_id);
      // Ne pas inclure commission_level_id dans updateData - nous l'avons déjà mis à jour
      const { commission_level_id, ...otherData } = ambassadorData;
      
      // Mettre à jour les autres données
      const { error } = await supabase
        .from("ambassadors")
        .update(otherData)
        .eq("id", id);
        
      if (error) {
        console.error("[updateAmbassador] Erreur lors de la mise à jour des données générales:", error);
        throw error;
      }
    } else {
      // Mettre à jour toutes les données sans barème
      const { error } = await supabase
        .from("ambassadors")
        .update(ambassadorData)
        .eq("id", id);
        
      if (error) {
        console.error("[updateAmbassador] Erreur lors de la mise à jour:", error);
        throw error;
      }
    }
    
    console.log(`[updateAmbassador] Mise à jour réussie pour l'ambassadeur ${id}`);
  } catch (error) {
    console.error(`[updateAmbassador] Erreur générale pour l'ambassadeur ${id}:`, error);
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

// Version complètement réécrite pour résoudre le problème de mise à jour du barème
export const updateAmbassadorCommissionLevel = async (ambassadorId: string, levelId: string): Promise<void> => {
  try {
    console.log(`[updateAmbassadorCommissionLevel] DÉBUT - Mise à jour du barème pour l'ambassadeur ${ambassadorId} vers ${levelId}`);
    
    // Vérifier que l'ID du barème est valide
    if (!levelId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
      console.error("ID de barème invalide:", levelId);
      throw new Error("ID de barème de commissionnement invalide");
    }
    
    // 1. Faire une mise à jour directe et explicite du seul champ commission_level_id
    const { error } = await supabase
      .from("ambassadors")
      .update({ commission_level_id: levelId })
      .eq("id", ambassadorId);

    if (error) {
      console.error("[updateAmbassadorCommissionLevel] Erreur lors de la mise à jour:", error);
      throw error;
    }
    
    // 2. Vérifier explicitement que la mise à jour a été effectuée correctement
    const { data: updatedData, error: checkError } = await supabase
      .from("ambassadors")
      .select("id, commission_level_id")
      .eq("id", ambassadorId)
      .single();
      
    if (checkError) {
      console.error("[updateAmbassadorCommissionLevel] Erreur lors de la vérification:", checkError);
      throw checkError;
    }
    
    // 3. Si la mise à jour n'a pas été prise en compte, faire une seconde tentative avec une requête SQL directe
    if (updatedData.commission_level_id !== levelId) {
      console.error(`[updateAmbassadorCommissionLevel] La mise à jour n'a pas été appliquée! Attendu: ${levelId}, Reçu: ${updatedData.commission_level_id}`);
      
      // Seconde tentative avec une requête spécifique et un nouveau client
      const { error: retryError } = await supabase
        .from("ambassadors")
        .update({ 
          commission_level_id: levelId,
          updated_at: new Date().toISOString() // Forcer une mise à jour de timestamp
        })
        .eq("id", ambassadorId);
        
      if (retryError) {
        console.error("[updateAmbassadorCommissionLevel] Échec de la seconde tentative:", retryError);
        throw new Error(`Impossible de mettre à jour le barème après deux tentatives: ${retryError.message}`);
      }
      
      // Vérification finale après la seconde tentative
      const { data: finalCheck, error: finalError } = await supabase
        .from("ambassadors")
        .select("id, commission_level_id")
        .eq("id", ambassadorId)
        .single();
        
      if (finalError) {
        console.error("[updateAmbassadorCommissionLevel] Erreur lors de la vérification finale:", finalError);
        throw finalError;
      }
      
      if (finalCheck.commission_level_id !== levelId) {
        console.error(`[updateAmbassadorCommissionLevel] ÉCHEC CRITIQUE: Impossible de mettre à jour le barème apr��s deux tentatives!`);
        console.error(`Attendu: ${levelId}, Final: ${finalCheck.commission_level_id}`);
        throw new Error("Impossible de mettre à jour le barème de commissionnement après plusieurs tentatives");
      }
      
      console.log(`[updateAmbassadorCommissionLevel] Mise à jour réussie après seconde tentative. ID Barème: ${finalCheck.commission_level_id}`);
    } else {
      console.log(`[updateAmbassadorCommissionLevel] Mise à jour réussie du premier coup. ID Barème: ${updatedData.commission_level_id}`);
    }
    
    console.log(`[updateAmbassadorCommissionLevel] FIN - Barème mis à jour avec succès pour l'ambassadeur ${ambassadorId}`);
  } catch (error) {
    console.error(`[updateAmbassadorCommissionLevel] ERREUR CRITIQUE pour l'ambassadeur ${ambassadorId}:`, error);
    throw error;
  }
};
