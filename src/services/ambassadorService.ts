import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AmbassadorFormValues } from "@/components/crm/forms/AmbassadorForm";
import { Collaborator, Client } from "@/types/client";

export interface Commission {
  id: string;
  date: string;
  client: string;
  amount: number;
  status: string;
  isPaid: boolean;
}

export interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone?: string;
  region?: string;
  status: string;
  notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  clientsCount: number;
  commissionsTotal: number;
  lastCommission: number;
  clients?: any[];
  commissions?: any[];
  collaborators?: any[];
  has_user_account?: boolean;
  user_account_created_at?: string;
  user_id?: string;
}

const mapDbAmbassadorToAmbassador = (record: any): Ambassador => {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone || "",
    region: record.region || "",
    clientsCount: record.clients_count || 0,
    commissionsTotal: record.commissions_total || 0,
    lastCommission: record.last_commission || 0,
    status: record.status || "active",
    notes: record.notes,
    created_at: record.created_at,
    updated_at: record.updated_at,
    has_user_account: record.has_user_account || false,
    user_account_created_at: record.user_account_created_at,
    user_id: record.user_id
  };
};

export const getAmbassadors = async (): Promise<Ambassador[]> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    
    return data ? data.map(mapDbAmbassadorToAmbassador) : [];
  } catch (error) {
    console.error("Error fetching ambassadors:", error);
    throw error;
  }
};

export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  try {
    console.log("Requesting ambassador with ID:", id);
    
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) {
      console.error("Supabase error fetching ambassador:", error);
      throw error;
    }
    
    console.log("Ambassador data from db:", data);
    
    if (!data) {
      console.log("No ambassador found with ID:", id);
      return null;
    }
    
    return mapDbAmbassadorToAmbassador(data);
  } catch (error) {
    console.error("Error fetching ambassador by ID:", error);
    throw error;
  }
};

export const createAmbassador = async (ambassadorData: AmbassadorFormValues): Promise<Ambassador | null> => {
  try {
    const dbAmbassador = {
      name: ambassadorData.name,
      email: ambassadorData.email,
      phone: ambassadorData.phone || "",
      region: ambassadorData.region,
      notes: ambassadorData.notes || "",
      status: ambassadorData.status || "active",
      clients_count: 0,
      commissions_total: 0,
      last_commission: 0
    };
    
    const { data, error } = await supabase
      .from('ambassadors')
      .insert(dbAmbassador)
      .select()
      .single();
    
    if (error) throw error;
    
    return data ? mapDbAmbassadorToAmbassador(data) : null;
  } catch (error) {
    console.error("Error creating ambassador:", error);
    throw error;
  }
};

export const updateAmbassador = async (id: string, ambassadorData: Partial<AmbassadorFormValues>): Promise<Ambassador | null> => {
  try {
    const dbAmbassador: Record<string, any> = {};
    
    if (ambassadorData.name !== undefined) dbAmbassador.name = ambassadorData.name;
    if (ambassadorData.email !== undefined) dbAmbassador.email = ambassadorData.email;
    if (ambassadorData.phone !== undefined) dbAmbassador.phone = ambassadorData.phone;
    if (ambassadorData.region !== undefined) dbAmbassador.region = ambassadorData.region;
    if (ambassadorData.notes !== undefined) dbAmbassador.notes = ambassadorData.notes;
    if (ambassadorData.status !== undefined) dbAmbassador.status = ambassadorData.status;
    
    dbAmbassador.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('ambassadors')
      .update(dbAmbassador)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data ? mapDbAmbassadorToAmbassador(data) : null;
  } catch (error) {
    console.error("Error updating ambassador:", error);
    throw error;
  }
};

export const deleteAmbassador = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('ambassadors')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting ambassador:", error);
    throw error;
  }
};

export const getAmbassadorClients = async (ambassadorId: string): Promise<any[]> => {
  try {
    const { data: relations, error: relationsError } = await supabase
      .from('ambassador_clients')
      .select('client_id')
      .eq('ambassador_id', ambassadorId);
    
    if (relationsError) throw relationsError;
    
    if (!relations || relations.length === 0) return [];
    
    const clientIds = relations.map(rel => rel.client_id);
    
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .in('id', clientIds);
    
    if (clientsError) throw clientsError;
    
    return clients || [];
  } catch (error) {
    console.error("Error fetching ambassador clients:", error);
    throw error;
  }
};

export const getAmbassadorCommissions = async (ambassadorId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('ambassador_commissions')
      .select('*')
      .eq('ambassador_id', ambassadorId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching ambassador commissions:", error);
    throw error;
  }
};

/**
 * Réinitialiser le mot de passe d'un ambassadeur
 * @param ambassadorId ID de l'ambassadeur
 */
export const resetAmbassadorPassword = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    if (error) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", error);
      toast.error(`Erreur: ${error.message}`);
      return false;
    }
    
    toast.success("Email de réinitialisation envoyé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
    return false;
  }
};
