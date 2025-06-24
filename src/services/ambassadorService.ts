import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";
import { z } from "zod";

export interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone?: string;
  region?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  clients_count: number;
  commissions_total: number;
  last_commission: number;
  company_id: string;
  company?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  vat_number?: string;
  commission_level_id?: string;
  has_user_account?: boolean;
  user_account_created_at?: string;
  user_id?: string;
  pdf_template_id?: string;
}

// Zod schema for form validation
export const ambassadorSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide").or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional(),
  company: z.string().optional(),
  vat_number: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  commission_level_id: z.string().optional(),
});

export type AmbassadorFormValues = z.infer<typeof ambassadorSchema>;

// Fonction pour récupérer les statistiques d'un ambassadeur en utilisant UNIQUEMENT les fonctions sécurisées
export const getAmbassadorStats = async (ambassadorId: string) => {
  try {
    // Utiliser UNIQUEMENT la fonction sécurisée pour récupérer les clients
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data: clientsData, error: clientsError } = await supabase
      .rpc('get_ambassador_clients_secure', { p_user_id: user.id });

    if (clientsError) {
      console.error('Erreur lors du chargement des clients:', clientsError);
      throw clientsError;
    }

    const clientsCount = clientsData?.length || 0;
    console.log(`Trouvé ${clientsCount} clients pour l'ambassadeur ${ambassadorId}`);

    // Récupérer les commissions de l'ambassadeur
    const { data: commissions, error: commissionError } = await supabase
      .from('offers')
      .select('commission')
      .eq('ambassador_id', ambassadorId)
      .not('commission', 'is', null);

    if (commissionError) {
      console.error('Error fetching commissions:', commissionError);
    }

    const totalCommissions = commissions?.reduce((sum, offer) => sum + (offer.commission || 0), 0) || 0;
    const lastCommissionAmount = commissions && commissions.length > 0 ? commissions[commissions.length - 1].commission || 0 : 0;

    return {
      clientsCount,
      totalCommissions,
      lastCommissionAmount
    };
  } catch (error) {
    console.error('Error in getAmbassadorStats:', error);
    return {
      clientsCount: 0,
      totalCommissions: 0,
      lastCommissionAmount: 0
    };
  }
};

// Fonction pour récupérer les clients d'un ambassadeur en utilisant UNIQUEMENT la fonction sécurisée
export const getAmbassadorClients = async (ambassadorId: string): Promise<Client[]> => {
  try {
    console.log(`Chargement des clients pour l'ambassadeur: ${ambassadorId}`);
    
    // Utiliser UNIQUEMENT la fonction sécurisée
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data: clientsData, error } = await supabase
      .rpc('get_ambassador_clients_secure', { p_user_id: user.id });

    if (error) {
      console.error('Erreur lors du chargement des clients:', error);
      throw error;
    }

    if (!clientsData || clientsData.length === 0) {
      console.log(`Aucun client trouvé pour l'ambassadeur ${ambassadorId}`);
      return [];
    }

    // Transformer les données de la fonction en format Client
    const processedClients: Client[] = clientsData.map(row => ({
      id: row.client_id,
      name: row.client_name,
      email: row.client_email,
      company: row.client_company,
      phone: row.client_phone,
      address: row.client_address,
      city: row.client_city,
      postal_code: row.client_postal_code,
      country: row.client_country,
      vat_number: row.client_vat_number,
      notes: row.client_notes,
      status: row.client_status as any,
      created_at: row.client_created_at,
      updated_at: row.client_updated_at,
      user_id: row.client_user_id,
      has_user_account: row.client_has_user_account,
      company_id: row.client_company_id,
      is_ambassador_client: true,
      createdAt: row.link_created_at ? new Date(row.link_created_at).toISOString() : undefined
    }));

    console.log(`Clients traités: ${processedClients.length}`);
    return processedClients;
  } catch (error) {
    console.error('Erreur fatale dans getAmbassadorClients:', error);
    throw error;
  }
};

export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ambassador:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getAmbassadorById:', error);
    return null;
  }
};

export const getAmbassadors = async (): Promise<Ambassador[]> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ambassadors:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAmbassadors:', error);
    return [];
  }
};

export const createAmbassador = async (ambassadorData: Partial<Ambassador>): Promise<Ambassador | null> => {
  try {
    // Get current user's company_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error("Company ID non trouvé");
    }

    const { data, error } = await supabase
      .from('ambassadors')
      .insert({
        ...ambassadorData,
        company_id: profile.company_id
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating ambassador:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createAmbassador:', error);
    throw error;
  }
};

export const updateAmbassador = async (id: string, ambassadorData: Partial<Ambassador>): Promise<Ambassador | null> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .update({
        ...ambassadorData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating ambassador:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateAmbassador:', error);
    throw error;
  }
};

export const deleteAmbassador = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ambassadors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ambassador:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteAmbassador:', error);
    throw error;
  }
};

export const updateAmbassadorCommissionLevel = async (ambassadorId: string, commissionLevelId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .rpc('update_ambassador_commission_level', {
        ambassador_id: ambassadorId,
        commission_level_id: commissionLevelId
      });

    if (error) {
      console.error('Error updating ambassador commission level:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in updateAmbassadorCommissionLevel:', error);
    throw error;
  }
};
