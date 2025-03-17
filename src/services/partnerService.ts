
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Schéma de validation pour les partenaires
export const partnerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  contactName: z.string().min(2, "Le nom du contact doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().optional(),
  type: z.string().min(1, "Le type est requis"),
  status: z.enum(["active", "inactive"]),
  notes: z.string().optional(),
  commission_level_id: z.string().uuid().optional()
});

export type PartnerFormValues = z.infer<typeof partnerSchema>;

export interface Partner {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone?: string;
  type: string;
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  clients_count?: number;
  revenue_total?: number;
  last_transaction?: number;
  commission_level_id?: string;
}

// Récupérer tous les partenaires
export const getPartners = async (): Promise<Partner[]> => {
  try {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .order("name");

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching partners:", error);
    return [];
  }
};

// Récupérer un partenaire par son ID
export const getPartnerById = async (id: string): Promise<Partner | null> => {
  try {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching partner with ID ${id}:`, error);
    return null;
  }
};

// Créer un nouveau partenaire
export const createPartner = async (
  partnerData: PartnerFormValues
): Promise<Partner> => {
  try {
    const { data, error } = await supabase
      .from("partners")
      .insert([partnerData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating partner:", error);
    throw error;
  }
};

// Mettre à jour un partenaire existant
export const updatePartner = async (
  id: string,
  partnerData: PartnerFormValues
): Promise<Partner> => {
  try {
    const { data, error } = await supabase
      .from("partners")
      .update(partnerData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating partner with ID ${id}:`, error);
    throw error;
  }
};

// Supprimer un partenaire
export const deletePartner = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from("partners").delete().eq("id", id);

    if (error) throw error;
  } catch (error) {
    console.error(`Error deleting partner with ID ${id}:`, error);
    throw error;
  }
};

// Obtenir les stats d'un partenaire
export const getPartnerStats = async (id: string) => {
  try {
    // Obtenir le nombre de clients
    const { count: clientsCount, error: clientsError } = await supabase
      .from("partner_clients")
      .select("client_id", { count: "exact" })
      .eq("partner_id", id);

    if (clientsError) throw clientsError;

    // Obtenir le total des commissions
    const { data: commissions, error: commissionsError } = await supabase
      .from("partner_commissions")
      .select("amount")
      .eq("partner_id", id);

    if (commissionsError) throw commissionsError;

    const totalCommissions = commissions.reduce(
      (sum, commission) => sum + (parseFloat(commission.amount) || 0),
      0
    );

    // Obtenir la dernière commission
    const { data: lastCommission, error: lastCommissionError } = await supabase
      .from("partner_commissions")
      .select("amount")
      .eq("partner_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (lastCommissionError) throw lastCommissionError;

    return {
      clientsCount: clientsCount || 0,
      totalCommissions,
      lastCommissionAmount: lastCommission.length > 0 ? lastCommission[0].amount : 0,
    };
  } catch (error) {
    console.error(`Error fetching stats for partner ${id}:`, error);
    return {
      clientsCount: 0,
      totalCommissions: 0,
      lastCommissionAmount: 0,
    };
  }
};

// Obtenir tous les clients d'un partenaire
export const getPartnerClients = async (partnerId: string) => {
  try {
    const { data, error } = await supabase
      .from("partner_clients")
      .select("client_id, clients(*)")
      .eq("partner_id", partnerId);

    if (error) throw error;

    // Transformer les données pour extraire seulement les informations du client
    return data.map((item) => item.clients) || [];
  } catch (error) {
    console.error(`Error fetching clients for partner ${partnerId}:`, error);
    return [];
  }
};

// Obtenir toutes les commissions d'un partenaire
export const getPartnerCommissions = async (partnerId: string) => {
  try {
    const { data, error } = await supabase
      .from("partner_commissions")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching commissions for partner ${partnerId}:`, error);
    return [];
  }
};
