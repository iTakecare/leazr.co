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

// Mettre à jour un ambassadeur existant
export const updateAmbassador = async (
  id: string,
  ambassadorData: AmbassadorFormValues
): Promise<void> => {
  try {
    console.log("Mise à jour de l'ambassadeur - Données complètes:", ambassadorData);
    
    // Vérifier si le barème de commissionnement est inclus
    if (ambassadorData.commission_level_id) {
      console.log("Barème de commissionnement inclus dans la requête de mise à jour:", ambassadorData.commission_level_id);
    } else {
      console.warn("Attention: commission_level_id n'est pas défini dans les données de mise à jour");
    }
    
    // Effectuer la mise à jour directement à l'aide d'une requête d'update simple
    const { error } = await supabase
      .from("ambassadors")
      .update({
        name: ambassadorData.name,
        email: ambassadorData.email,
        phone: ambassadorData.phone,
        status: ambassadorData.status,
        notes: ambassadorData.notes,
        company: ambassadorData.company,
        vat_number: ambassadorData.vat_number,
        address: ambassadorData.address,
        city: ambassadorData.city,
        postal_code: ambassadorData.postal_code,
        country: ambassadorData.country,
        commission_level_id: ambassadorData.commission_level_id
      })
      .eq("id", id);

    if (error) {
      console.error("Erreur lors de la mise à jour de l'ambassadeur:", error);
      throw error;
    }
    
    console.log("Mise à jour de l'ambassadeur réussie avec le barème:", ambassadorData.commission_level_id);
    
    // Vérifier que la mise à jour a bien été appliquée
    const { data: updatedAmbassador, error: checkError } = await supabase
      .from("ambassadors")
      .select("*")
      .eq("id", id)
      .single();
      
    if (checkError) {
      console.error("Erreur lors de la vérification après mise à jour:", checkError);
    } else {
      console.log("État de l'ambassadeur après mise à jour:", updatedAmbassador);
      console.log("Barème de commissionnement après mise à jour:", updatedAmbassador.commission_level_id);
    }
  } catch (error) {
    console.error(`Erreur lors de la mise à jour de l'ambassadeur avec l'ID ${id}:`, error);
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

// Mettre à jour spécifiquement le niveau de commission d'un ambassadeur
export const updateAmbassadorCommissionLevel = async (ambassadorId: string, levelId: string): Promise<void> => {
  try {
    console.log(`[updateAmbassadorCommissionLevel] Updating commission level for ambassador ${ambassadorId} to ${levelId}`);
    
    const { error } = await supabase
      .from("ambassadors")
      .update({ commission_level_id: levelId })
      .eq("id", ambassadorId);

    if (error) {
      console.error("[updateAmbassadorCommissionLevel] Error:", error);
      throw error;
    }
    
    console.log("[updateAmbassadorCommissionLevel] Successfully updated");
  } catch (error) {
    console.error(`[updateAmbassadorCommissionLevel] Error for ambassador ${ambassadorId}:`, error);
    throw error;
  }
};
