import { getAdminSupabaseClient, supabase } from '@/integrations/supabase/client';
import { Client, CreateClientData } from '@/types/client';

/**
 * Crée un nouveau client
 * @param data Les données du client à créer
 * @returns Le client créé
 */
export const createClient = async (clientData: any) => {
  try {
    console.log("[CLIENT SERVICE] Creating client:", clientData);
    
    // Create a fresh admin client instance
    const adminClient = getAdminSupabaseClient();
    
    // Log for debugging
    console.log("[CLIENT SERVICE] Admin client created for client creation");
    
    // Insert the client data using the admin client
    const { data, error } = await adminClient
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) {
      console.error("[CLIENT SERVICE] Error creating client with admin client:", error);
      throw error;
    }
    
    console.log("[CLIENT SERVICE] Client created successfully:", data);
    return data;
  } catch (error) {
    console.error("[CLIENT SERVICE] Exception in createClient:", error);
    throw error;
  }
};

/**
 * Récupère tous les clients
 * @returns Liste des clients
 */
export const getAllClients = async (showAmbassadorClients: boolean = false): Promise<Client[]> => {
  try {
    if (showAmbassadorClients) {
      // When we want to show ambassador clients, use the junction table
      const { data, error } = await supabase
        .from('ambassador_clients')
        .select(`
          client_id,
          clients:client_id (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erreur lors de la récupération des clients des ambassadeurs:", error);
        throw error;
      }

      // Extract the actual client objects from the nested response
      const ambassadorClients = data?.map(item => ({
        ...item.clients,
        is_ambassador_client: true
      })) || [];
      
      return ambassadorClients;
    } else {
      // Standard client query for non-ambassador clients
      // We need to exclude clients that are in the ambassador_clients table
      const { data: standardClients, error: standardError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (standardError) {
        console.error("Erreur lors de la récupération des clients:", standardError);
        throw standardError;
      }

      // Get all ambassador client IDs
      const { data: ambassadorClientLinks, error: ambassadorError } = await supabase
        .from('ambassador_clients')
        .select('client_id');

      if (ambassadorError) {
        console.error("Erreur lors de la récupération des liens clients-ambassadeurs:", ambassadorError);
        throw ambassadorError;
      }

      // Extract just the client IDs into an array
      const ambassadorClientIds = ambassadorClientLinks?.map(link => link.client_id) || [];

      // Filter out clients that are in the ambassador_clients table
      const filteredClients = standardClients?.filter(
        client => !ambassadorClientIds.includes(client.id)
      ) || [];

      return filteredClients;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
    throw error;
  }
};

/**
 * Récupère un client par son ID
 * @param id ID du client à récupérer
 * @returns Le client correspondant ou null
 */
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    // First, fetch the client details
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (clientError) {
      console.error(`Erreur lors de la récupération du client avec l'ID ${id}:`, clientError);
      return null;
    }

    if (!clientData) {
      return null;
    }

    // Next, fetch the collaborators for this client
    const { data: collaboratorsData, error: collaboratorsError } = await supabase
      .from('collaborators')
      .select('*')
      .eq('client_id', id);

    if (collaboratorsError) {
      console.error(`Erreur lors de la récupération des collaborateurs pour le client ${id}:`, collaboratorsError);
      // Continue with the client data even if collaborators couldn't be fetched
    }

    // Combine the client data with collaborators
    const client: Client = {
      ...clientData,
      collaborators: collaboratorsData || []
    };

    return client;
  } catch (error) {
    console.error(`Erreur lors de la récupération du client avec l'ID ${id}:`, error);
    return null;
  }
};

/**
 * Met à jour un client existant
 * @param id ID du client à mettre à jour
 * @param updates Les mises à jour à appliquer au client
 * @returns Le client mis à jour
 */
export const updateClient = async (id: string, updates: Partial<Client>): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erreur lors de la mise à jour du client avec l'ID ${id}:`, error);
      return null;
    }

    // Convert date strings to Date objects
    if (data) {
      return {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      } as Client;
    }
    
    return null;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du client avec l'ID ${id}:`, error);
    return null;
  }
};

/**
 * Supprime un client
 * @param id ID du client à supprimer
 * @returns true si la suppression a réussi, false sinon
 */
export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erreur lors de la suppression du client avec l'ID ${id}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression du client avec l'ID ${id}:`, error);
    return false;
  }
};

/**
 * Verify a VAT number through the VIES system
 * @param vatNumber VAT number to verify
 * @param country Country code (e.g. BE, FR, ...)
 * @returns The verification result
 */
export const verifyVatNumber = async (vatNumber: string, country: string = 'BE') => {
  try {
    console.log(`Verifying VAT number: ${vatNumber} from country: ${country}`);
    
    // Clean VAT number to remove spaces and special characters
    let cleanVatNumber = vatNumber.replace(/\s/g, '');
    
    // If VAT number includes country code prefix, extract it
    if (cleanVatNumber.length >= 2 && /^[A-Z]{2}/i.test(cleanVatNumber)) {
      const countryPrefix = cleanVatNumber.substring(0, 2).toUpperCase();
      
      // If country code is included in the VAT number, update country and remove prefix
      if (countryPrefix === country.toUpperCase()) {
        cleanVatNumber = cleanVatNumber.substring(2);
      }
    }
    
    const { data, error } = await supabase.functions.invoke('vies-verify', {
      body: {
        vatNumber: cleanVatNumber,
        country: country
      }
    });
    
    if (error) {
      console.error('Error verifying VAT number:', error);
      return { 
        valid: false,
        error: 'Erreur lors de la vérification du numéro de TVA'
      };
    }
    
    console.log('VIES verification result:', data);

    // Amélioration du parsing de l'adresse
    if (data && data.valid && data.address) {
      // Essayer de mieux analyser l'adresse
      const addressParsed = parseAddress(data.address);
      return {
        ...data,
        addressParsed
      };
    }
    
    return data;
  } catch (error) {
    console.error('Exception during VAT verification:', error);
    return { 
      valid: false,
      error: 'Erreur lors de la vérification du numéro de TVA'
    };
  }
};

/**
 * Parse une adresse en ses composants (rue, code postal, ville, pays)
 * @param address L'adresse complète à parser
 * @returns Les composants de l'adresse
 */
const parseAddress = (address: string) => {
  console.log('Parsing address:', address);
  
  // Différentes stratégies de parsing selon le format d'adresse
  
  // 1. Essayer de trouver un format avec des virgules (le plus courant dans les réponses VIES)
  const addressParts = address.split(',').map(part => part.trim());
  if (addressParts.length >= 2) {
    // Adresse complète est la première partie
    const streetAddress = addressParts[0];
    
    // Pour la partie code postal et ville
    const cityPostalParts = addressParts[1].trim().split(/\s+/);
    
    // Essayer d'identifier le code postal et la ville
    let postalCode = '';
    let city = '';
    
    // Si le premier élément est numérique, c'est probablement un code postal
    if (/^\d+$/.test(cityPostalParts[0])) {
      postalCode = cityPostalParts[0];
      city = cityPostalParts.slice(1).join(' ');
    } else {
      // Sinon, chercher un pattern numérique dans la chaîne
      const postalMatch = addressParts[1].match(/\b\d{4,6}\b/);
      if (postalMatch) {
        postalCode = postalMatch[0];
        // La ville est ce qui reste après avoir retiré le code postal
        city = addressParts[1].replace(postalCode, '').trim();
      } else {
        // Si pas de code postal trouvé, considérer toute la partie comme la ville
        city = addressParts[1];
      }
    }
    
    // Le pays est généralement la dernière partie
    const country = addressParts.length > 2 ? addressParts[addressParts.length - 1] : '';
    
    console.log('Parsed address:', { streetAddress, postalCode, city, country });
    return { streetAddress, postalCode, city, country };
  }
  
  // 2. Essayer de trouver un format avec des séparateurs de lignes
  if (address.includes('\n')) {
    const lines = address.split('\n').map(line => line.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const streetAddress = lines[0];
      
      // Analayse pour code postal et ville dans la deuxième ligne
      const cityPostalLine = lines[1];
      const postalMatch = cityPostalLine.match(/\b\d{4,6}\b/);
      let postalCode = '';
      let city = '';
      
      if (postalMatch) {
        postalCode = postalMatch[0];
        city = cityPostalLine.replace(postalCode, '').trim();
      } else {
        city = cityPostalLine;
      }
      
      const country = lines.length > 2 ? lines[lines.length - 1] : '';
      
      console.log('Parsed address from lines:', { streetAddress, postalCode, city, country });
      return { streetAddress, postalCode, city, country };
    }
  }
  
  // 3. Dernière tentative: essayer de trouver un code postal quelque part dans la chaîne
  const postalMatch = address.match(/\b\d{4,6}\b/);
  if (postalMatch) {
    const postalCode = postalMatch[0];
    const parts = address.split(postalCode);
    
    // Considérer la partie avant le code postal comme l'adresse
    const streetAddress = parts[0].trim();
    
    // Essayer d'extraire la ville et le pays de la partie après le code postal
    const afterPostal = parts[1].trim();
    const afterParts = afterPostal.split(/[,\n]/);
    
    const city = afterParts[0].trim();
    const country = afterParts.length > 1 ? afterParts[afterParts.length - 1].trim() : '';
    
    console.log('Parsed address with postal extraction:', { streetAddress, postalCode, city, country });
    return { streetAddress, postalCode, city, country };
  }
  
  // Si aucune stratégie ne fonctionne, retourner l'adresse complète comme adresse de rue
  console.log('No parsing strategy worked, returning full address as street');
  return { 
    streetAddress: address, 
    postalCode: '', 
    city: '', 
    country: '' 
  };
};

/**
 * Define the Collaborator type if it's not imported
 */
interface Collaborator {
  id: string;
  name: string;
  role: string;
  email: string;
  phone?: string;
  department?: string;
  client_id?: string;
}

/**
 * Ajoute un collaborateur à un client
 * @param clientId ID du client auquel ajouter le collaborateur
 * @param collaborator Données du collaborateur à ajouter
 * @returns Le collaborateur ajouté ou null en cas d'erreur
 */
export const addCollaborator = async (clientId: string, collaborator: Omit<Collaborator, 'id'>): Promise<Collaborator | null> => {
  try {
    // Add client_id to collaborator data
    const collaboratorData = {
      ...collaborator,
      client_id: clientId
    };

    console.log("Adding collaborator:", collaboratorData);

    // Insert the collaborator into the database
    const { data, error } = await supabase
      .from('collaborators')
      .insert([collaboratorData])
      .select()
      .single();

    if (error) {
      console.error("Error adding collaborator:", error);
      return null;
    }

    console.log("Collaborator added successfully:", data);
    return data;
  } catch (error) {
    console.error("Exception while adding collaborator:", error);
    return null;
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
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Erreur lors de la récupération des collaborateurs pour le client ${clientId}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Erreur lors de la récupération des collaborateurs:`, error);
    return [];
  }
};
