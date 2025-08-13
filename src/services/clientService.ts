import { supabase } from "@/integrations/supabase/client";
import { Collaborator } from "@/types/client";

// Stubs pour les fonctions manquantes - à implémenter plus tard
export const getClientById = async (clientId: string) => {
  throw new Error("getClientById not implemented yet");
};

export const getAllClients = async () => {
  throw new Error("getAllClients not implemented yet");
};

export const createClient = async (clientData: any) => {
  throw new Error("createClient not implemented yet");
};

export const updateClient = async (clientId: string, updates: any) => {
  throw new Error("updateClient not implemented yet");
};

export const deleteClient = async (clientId: string) => {
  throw new Error("deleteClient not implemented yet");
};

export const verifyVatNumber = async (vatNumber: string) => {
  throw new Error("verifyVatNumber not implemented yet");
};

export const syncClientUserAccountStatus = async (clientId: string) => {
  throw new Error("syncClientUserAccountStatus not implemented yet");
};

export const getFreeClients = async () => {
  throw new Error("getFreeClients not implemented yet");
};

export const addCollaborator = async (clientId: string, collaboratorData: any) => {
  throw new Error("addCollaborator not implemented yet");
};

export const getCollaboratorsByClientId = async (clientId: string) => {
  throw new Error("getCollaboratorsByClientId not implemented yet");
};

export const updateClientFromProfile = async (profileData: any) => {
  throw new Error("updateClientFromProfile not implemented yet");
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