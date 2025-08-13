import { supabase } from "@/integrations/supabase/client";
import { Collaborator, Client, CreateClientData } from "@/types/client";

/**
 * Récupère un client par son ID
 */
export const getClientById = async (clientId: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error("❌ Erreur lors de la récupération du client:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("❌ Exception lors de la récupération du client:", error);
    return null;
  }
};

/**
 * Récupère tous les clients de l'entreprise avec sécurité multi-tenant
 */
export const getAllClients = async (): Promise<Client[]> => {
  try {
    console.log("🔍 Récupération des clients avec sécurité multi-tenant...");
    
    // Utiliser la fonction sécurisée qui gère automatiquement l'isolation par company_id
    const { data, error } = await supabase.rpc('get_all_clients_secure');

    if (error) {
      console.error("❌ Erreur lors de la récupération des clients:", error);
      return [];
    }

    console.log(`✅ ${data?.length || 0} clients récupérés`);
    return data || [];
  } catch (error) {
    console.error("❌ Exception lors de la récupération des clients:", error);
    return [];
  }
};

/**
 * Crée un nouveau client
 */
export const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
  try {
    console.log("➕ Création d'un nouveau client:", clientData.name);
    
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de la création du client:", error);
      throw new Error("Erreur lors de la création du client");
    }

    console.log("✅ Client créé avec succès:", data.id);
    return data;
  } catch (error) {
    console.error("❌ Exception lors de la création du client:", error);
    throw error;
  }
};

/**
 * Met à jour un client existant
 */
export const updateClient = async (clientId: string, updates: Partial<Client>): Promise<Client | null> => {
  try {
    console.log("📝 Mise à jour du client:", clientId);
    
    const { data, error } = await supabase
      .from('clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de la mise à jour du client:", error);
      return null;
    }

    console.log("✅ Client mis à jour avec succès");
    return data;
  } catch (error) {
    console.error("❌ Exception lors de la mise à jour du client:", error);
    return null;
  }
};

/**
 * Supprime un client
 */
export const deleteClient = async (
  clientId: string, 
  onSuccess?: () => void, 
  onError?: () => void, 
  toast?: any
): Promise<boolean> => {
  try {
    console.log("🗑️ Suppression du client:", clientId);
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (error) {
      console.error("❌ Erreur lors de la suppression du client:", error);
      if (toast) toast.error("Erreur lors de la suppression du client");
      if (onError) onError();
      return false;
    }

    console.log("✅ Client supprimé avec succès");
    if (toast) toast.success("Client supprimé avec succès");
    if (onSuccess) onSuccess();
    return true;
  } catch (error) {
    console.error("❌ Exception lors de la suppression du client:", error);
    if (toast) toast.error("Erreur lors de la suppression du client");
    if (onError) onError();
    return false;
  }
};

export const verifyVatNumber = async (vatNumber: string, country?: string): Promise<{
  valid: boolean;
  companyName?: string;
  address?: string;
  addressParsed?: {
    streetAddress: string;
    postalCode: string;
    city: string;
    country: string;
  };
  error?: string;
}> => {
  console.warn("verifyVatNumber not implemented yet");
  return { 
    valid: false, 
    error: "Service not implemented",
    addressParsed: {
      streetAddress: "",
      postalCode: "",
      city: "",
      country: ""
    }
  };
};

export const syncClientUserAccountStatus = async (clientId: string): Promise<boolean> => {
  console.warn("syncClientUserAccountStatus not implemented yet");
  return false;
};

export const getFreeClients = async (): Promise<any[]> => {
  console.warn("getFreeClients not implemented yet");
  return [];
};

export const addCollaborator = async (clientId: string, collaboratorData: any): Promise<any> => {
  console.warn("addCollaborator not implemented yet");
  return null;
};

export const getCollaboratorsByClientId = async (clientId: string): Promise<any[]> => {
  console.warn("getCollaboratorsByClientId not implemented yet");
  return [];
};

export const updateClientFromProfile = async (userId: string, firstName: string, lastName: string, phone: string): Promise<boolean> => {
  console.warn("updateClientFromProfile not implemented yet");
  return false;
};

/**
 * Récupère tous les collaborateurs d'un client
 */
export const getClientCollaborators = async (clientId: string): Promise<Collaborator[]> => {
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("❌ Erreur lors de la récupération des collaborateurs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("❌ Exception lors de la récupération des collaborateurs:", error);
    return [];
  }
};

/**
 * Crée un nouveau collaborateur pour un client
 */
export const createCollaborator = async (
  clientId: string,
  collaboratorData: Omit<Collaborator, 'id' | 'client_id' | 'created_at' | 'updated_at' | 'is_primary'>
): Promise<Collaborator> => {
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .insert({
        client_id: clientId,
        ...collaboratorData,
        is_primary: false
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de la création du collaborateur:", error);
      throw new Error("Erreur lors de la création du collaborateur");
    }

    return data;
  } catch (error) {
    console.error("❌ Exception lors de la création du collaborateur:", error);
    throw error;
  }
};

/**
 * Met à jour un collaborateur existant
 */
export const updateCollaborator = async (
  collaboratorId: string,
  updates: Partial<Omit<Collaborator, 'id' | 'client_id' | 'created_at' | 'updated_at'>>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collaborators')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', collaboratorId);

    if (error) {
      console.error("❌ Erreur lors de la mise à jour du collaborateur:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Exception lors de la mise à jour du collaborateur:", error);
    return false;
  }
};

/**
 * Supprime un collaborateur
 */
export const deleteCollaborator = async (collaboratorId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) {
      console.error("❌ Erreur lors de la suppression du collaborateur:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Exception lors de la suppression du collaborateur:", error);
    return false;
  }
};