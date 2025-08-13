import { supabase } from "@/integrations/supabase/client";
import { Collaborator } from "@/types/client";

// Stubs pour les fonctions manquantes - à implémenter plus tard
export const getClientById = async (clientId: string): Promise<any> => {
  console.warn("getClientById not implemented yet");
  return null;
};

export const getAllClients = async (): Promise<any[]> => {
  console.warn("getAllClients not implemented yet");
  return [];
};

export const createClient = async (clientData: any): Promise<any> => {
  console.warn("createClient not implemented yet");
  return null;
};

export const updateClient = async (clientId: string, updates: any): Promise<any> => {
  console.warn("updateClient not implemented yet");
  return { id: clientId, ...updates };
};

export const deleteClient = async (clientId: string, onSuccess?: () => void, onError?: () => void, toast?: any): Promise<boolean> => {
  console.warn("deleteClient not implemented yet");
  if (onSuccess) onSuccess();
  return false;
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