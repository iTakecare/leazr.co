
import { supabase } from '@/integrations/supabase/client';
import type { Client, Collaborator, CreateClientData } from '@/types/client';

/**
 * Récupère tous les clients
 * @returns Liste des clients
 */
export const getAllClients = async (showAmbassadorClients: boolean = false): Promise<Client[]> => {
  try {
    console.log(`Récupération des clients avec filtre ambassadeur: ${showAmbassadorClients}`);
    
    if (showAmbassadorClients) {
      // Récupérer les clients des ambassadeurs
      const { data, error } = await supabase
        .from('ambassador_clients')
        .select(`
          client_id,
          clients:client_id (*)
        `);

      if (error) {
        console.error("Erreur lors de la récupération des clients des ambassadeurs:", error);
        throw error;
      }

      // Extraire les données des clients depuis la réponse imbriquée
      const ambassadorClients = data?.map(item => ({
        ...item.clients,
        is_ambassador_client: true
      })) || [];
      
      console.log(`${ambassadorClients.length} clients d'ambassadeurs trouvés:`, ambassadorClients);
      return ambassadorClients;
    } else {
      // Récupérer tous les clients standard
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération des clients:", error);
        throw error;
      }

      // Récupérer les IDs des clients des ambassadeurs pour les filtrer
      const { data: ambassadorClientLinks, error: ambassadorError } = await supabase
        .from('ambassador_clients')
        .select('client_id');

      if (ambassadorError) {
        console.error("Erreur lors de la récupération des liens clients-ambassadeurs:", ambassadorError);
        throw ambassadorError;
      }

      // Extraire les IDs des clients des ambassadeurs
      const ambassadorClientIds = ambassadorClientLinks?.map(link => link.client_id) || [];
      
      console.log("IDs des clients d'ambassadeurs à exclure:", ambassadorClientIds);
      
      // Filtrer pour exclure les clients des ambassadeurs
      const filteredClients = data?.filter(
        client => !ambassadorClientIds.includes(client.id)
      ) || [];
      
      console.log(`${filteredClients.length} clients standards trouvés sur ${data?.length || 0} clients totaux`);
      console.log(`${ambassadorClientIds.length} clients d'ambassadeurs exclus`);
      
      return filteredClients;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
    throw error;
  }
};

/**
 * Recherche un client par son ID, vérifie s'il est un client d'ambassadeur
 * @param clientId ID du client
 * @returns Informations sur le client trouvé
 */
export const findClientById = async (clientId: string) => {
  try {
    console.log(`Recherche du client par ID: ${clientId}`);
    
    // Vérifier d'abord si le client existe
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error("Erreur lors de la recherche du client:", error);
      return {
        exists: false,
        client: null,
        isAmbassadorClient: false,
        message: "Client non trouvé"
      };
    }

    // Vérifier si c'est un client d'ambassadeur
    const { data: ambassadorLink, error: ambassadorError } = await supabase
      .from('ambassador_clients')
      .select('ambassador_id')
      .eq('client_id', clientId)
      .maybeSingle();

    if (ambassadorError) {
      console.error("Erreur lors de la vérification du statut de client d'ambassadeur:", ambassadorError);
    }

    const isAmbassadorClient = !!ambassadorLink;
    
    console.log(`Client trouvé: ${client.name}, Client d'ambassadeur: ${isAmbassadorClient}`);
    
    return {
      exists: true,
      client: client,
      isAmbassadorClient: isAmbassadorClient,
      message: isAmbassadorClient ? 
        "Ce client est associé à un ambassadeur. Activez l'option 'Clients d'ambassadeurs' pour le voir dans la liste." : 
        "Client trouvé"
    };
  } catch (error) {
    console.error("Erreur lors de la recherche du client:", error);
    return {
      exists: false,
      client: null,
      isAmbassadorClient: false,
      message: "Erreur lors de la recherche du client"
    };
  }
};

/**
 * Récupère un client par son ID
 * @param id ID du client
 * @returns Données du client
 */
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*, collaborators(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Erreur lors de la récupération du client:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération du client:", error);
    return null;
  }
};

/**
 * Crée un nouveau client
 * @param clientData Données du client à créer
 * @returns Données du client créé
 */
export const createClient = async (clientData: CreateClientData): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création du client:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la création du client:", error);
    throw error;
  }
};

/**
 * Met à jour un client existant
 * @param id ID du client
 * @param clientData Nouvelles données du client
 * @returns Données du client mis à jour
 */
export const updateClient = async (id: string, clientData: Partial<Client>): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour du client:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du client:", error);
    throw error;
  }
};

/**
 * Supprime un client
 * @param id ID du client à supprimer
 * @returns true si supprimé avec succès
 */
export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    // Supprimer d'abord les collaborateurs associés
    await supabase
      .from('collaborators')
      .delete()
      .eq('client_id', id);
    
    // Puis supprimer le client
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Erreur lors de la suppression du client:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression du client:", error);
    throw error;
  }
};

/**
 * Vérifie si un numéro de TVA est valide
 * @param vatNumber Numéro de TVA à vérifier
 * @returns Résultat de la validation
 */
export const verifyVatNumber = async (vatNumber: string) => {
  try {
    // Si le numéro est vide, on considère qu'il est valide (pas obligatoire)
    if (!vatNumber || vatNumber.trim() === '') {
      return { isValid: true, message: "Aucun numéro de TVA fourni" };
    }

    // Simuler une validation simple (dans une implémentation réelle, connectez-vous à l'API VIES)
    // Ici, on vérifie juste la longueur et le format de base
    const isValidFormat = /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(vatNumber);
    
    if (!isValidFormat) {
      return { isValid: false, message: "Format de numéro de TVA invalide" };
    }
    
    return { isValid: true, message: "Numéro de TVA valide" };
  } catch (error) {
    console.error("Erreur lors de la vérification du numéro de TVA:", error);
    return { isValid: false, message: "Erreur lors de la vérification" };
  }
};

/**
 * Ajoute un collaborateur à un client
 * @param clientId ID du client
 * @param collaboratorData Données du collaborateur
 * @returns Données du collaborateur créé
 */
export const addCollaborator = async (clientId: string, collaboratorData: Omit<Collaborator, 'id'>): Promise<Collaborator | null> => {
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .insert([{ ...collaboratorData, client_id: clientId }])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de l'ajout du collaborateur:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de l'ajout du collaborateur:", error);
    throw error;
  }
};

/**
 * Récupère les collaborateurs d'un client
 * @param clientId ID du client
 * @returns Liste des collaborateurs
 */
export const getCollaboratorsByClientId = async (clientId: string): Promise<Collaborator[]> => {
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      console.error("Erreur lors de la récupération des collaborateurs:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des collaborateurs:", error);
    throw error;
  }
};

/**
 * Synchronise le statut du compte utilisateur du client
 * @param clientId ID du client
 * @returns Client mis à jour
 */
export const syncClientUserAccountStatus = async (clientId: string): Promise<Client | null> => {
  try {
    // Récupérer d'abord le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error("Erreur lors de la récupération du client:", clientError);
      throw clientError;
    }

    // Vérifier si l'utilisateur associé existe
    const hasUserAccount = !!client.user_id;
    const user_account_created_at = hasUserAccount ? 
      (client.user_account_created_at || new Date().toISOString()) : 
      null;

    // Mettre à jour le statut
    const { data, error } = await supabase
      .from('clients')
      .update({ 
        has_user_account: hasUserAccount,
        user_account_created_at
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour du statut du compte utilisateur:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la synchronisation du statut du compte utilisateur:", error);
    throw error;
  }
};
