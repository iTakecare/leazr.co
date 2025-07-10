
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

// Définition du schéma pour les données de partenaire
export const partnerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  contact_name: z.string().min(2, "Le nom de contact doit contenir au moins 2 caractères"),
  email: z.string().email("Veuillez entrer un email valide"),
  phone: z.string().optional(),
  type: z.string().min(1, "Le type est requis"),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
  commission_level_id: z.string().optional(),
});

// Type des données du formulaire de partenaire
export type PartnerFormValues = z.infer<typeof partnerSchema>;

// Type complet d'un partenaire avec ID et données additionnelles
export interface Partner {
  id: string;
  name: string;
  contact_name: string;
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
  has_user_account?: boolean;
  user_account_created_at?: string;
  user_id?: string;
  company_id: string;
}

// Export des types pour compatibilité
export type PartnerType = Partner;

// Récupérer tous les partenaires de l'entreprise (sécurisé)
export const getPartners = async (): Promise<Partner[]> => {
  try {
    console.log("Fetching partners from database...");
    
    // Récupérer le company_id de l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    // Récupérer le profil pour obtenir le company_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Impossible de récupérer l'ID de l'entreprise de l'utilisateur");
    }

    // Utiliser la fonction sécurisée pour récupérer les partners
    const { data, error } = await supabase
      .rpc('get_company_partners_secure', { p_company_id: profile.company_id });

    if (error) {
      console.error("Error in getPartners:", error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} partners from database`);
    return data || [];
  } catch (error) {
    console.error("Error fetching partners:", error);
    toast.error("Erreur lors du chargement des partenaires");
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
    console.log(`Partenaire récupéré avec succès. ID: ${id}`);
    return data;
  } catch (error) {
    console.error(`Error fetching partner with ID ${id}:`, error);
    throw error;
  }
};

// Récupérer les clients d'un partenaire
export const getPartnerClients = async (partnerId: string) => {
  try {
    const { data, error } = await supabase
      .from("partner_clients")
      .select(`
        client_id,
        clients (
          id,
          name,
          email,
          company,
          status,
          created_at
        )
      `)
      .eq("partner_id", partnerId);

    if (error) throw error;
    
    return data?.map(item => item.clients).filter(Boolean) || [];
  } catch (error) {
    console.error("Error fetching partner clients:", error);
    throw error;
  }
};

// Créer un nouveau partenaire
export const createPartner = async (
  partnerData: PartnerFormValues
): Promise<Partner> => {
  try {
    console.log("Creating new partner:", partnerData);
    
    // Récupérer le company_id de l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    // Récupérer le profil pour obtenir le company_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Impossible de récupérer l'ID de l'entreprise de l'utilisateur");
    }

    // Ajouter le company_id aux données du partenaire
    const partnerDataWithCompany = {
      ...partnerData,
      company_id: profile.company_id
    };

    const { data, error } = await supabase
      .from("partners")
      .insert([partnerDataWithCompany])
      .select()
      .single();

    if (error) {
      console.error("Error creating partner:", error);
      throw error;
    }
    
    console.log("Partner created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error creating partner:", error);
    throw error;
  }
};

// Mettre à jour un partenaire existant
export const updatePartner = async (
  id: string,
  partnerData: Partial<PartnerFormValues>
): Promise<Partner> => {
  try {
    console.log(`Updating partner ${id} with data:`, partnerData);
    
    const { data, error } = await supabase
      .from("partners")
      .update(partnerData)
      .eq("id", id)
      .select()
      .single();
      
    if (error) {
      console.error("Error updating partner:", error);
      throw error;
    }
    
    console.log(`Partner ${id} updated successfully`);
    return data;
  } catch (error) {
    console.error("Error updating partner:", error);
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
