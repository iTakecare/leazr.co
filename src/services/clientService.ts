import { getAdminSupabaseClient, supabase } from '@/integrations/supabase/client';
import { Client, CreateClientData } from '@/types/client';

/**
 * Crée un nouveau client
 * @param data Les données du client à créer
 * @returns Le client créé
 */
export const createClient = async (clientData: any) => {
  try {
    console.log("Creating client:", clientData);
    
    // Récupérer l'utilisateur authentifié pour obtenir son ID et rôle
    const authData = await supabase.auth.getUser();
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.data.user?.id)
      .single();
    
    const userRole = profileData?.role || 'client';
    console.log("User role:", userRole);
    
    // Si l'utilisateur est un admin, on n'a pas besoin de définir user_id
    // Pour les autres rôles, on doit définir user_id pour satisfaire les politiques RLS
    const dataToInsert = {
      ...clientData,
      // Ne définir user_id que si l'utilisateur n'est pas admin
      user_id: userRole !== 'admin' ? authData.data.user?.id : clientData.user_id
    };
    
    // Essayer d'abord avec le client standard
    const { data, error } = await supabase
      .from('clients')
      .insert(dataToInsert)
      .select()
      .single();
    
    if (error) {
      console.warn("Échec de création de client avec le client standard:", error);
      console.error("Erreur détaillée:", JSON.stringify(error));
      
      if (error.code === '42501') {
        // Si l'erreur est due aux politiques RLS, essayer une approche différente
        console.log("Tentative alternative avec user_id explicite:");
        
        // Essayer à nouveau en forçant les infos utilisateur
        const clientWithExplicitUserId = {
          ...dataToInsert,
          // Forcer l'attribution explicite de l'ID utilisateur
          user_id: authData.data.user?.id
        };
        
        console.log("Tentative avec données:", clientWithExplicitUserId);
        
        const { data: insertData, error: insertError } = await supabase
          .from('clients')
          .insert(clientWithExplicitUserId)
          .select()
          .single();
          
        if (insertError) {
          console.error("Échec de la tentative alternative:", insertError);
          throw insertError;
        }
        
        console.log("Client créé avec succès (méthode alternative):", insertData);
        return insertData;
      } else {
        throw error;
      }
    }
    
    console.log("Client created successfully with standard client:", data);
    return data;
  } catch (error) {
    console.error("Exception in createClient:", error);
    throw error;
  }
};

/**
 * Récupère tous les clients sans aucun filtrage
 * @returns Liste de tous les clients
 */
export const getAllClients = async (): Promise<Client[]> => {
  try {
    console.log("Récupération de tous les clients");
    
    const { data, error } = await supabase
      .from('clients')
      .select('*');
    
    if (error) {
      console.error("Erreur lors de la récupération des clients:", error);
      throw error;
    }
    
    console.log(`Récupéré ${data?.length || 0} clients au total`);
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
    return [];
  }
};

/**
 * Fallback pour récupérer les clients avec le client standard
 * @param showAmbassadorClients Indique si on doit afficher les clients des ambassadeurs
 * @returns Liste des clients
 */
const getAllClientsWithStandardClient = async (showAmbassadorClients: boolean): Promise<Client[]> => {
  try {
    console.log("Fallback: récupération des clients avec le client standard");
    
    const { data: allClients, error: clientsError } = await supabase
      .from('clients')
      .select('*');

    if (clientsError) {
      console.error("Erreur lors de la récupération des clients avec le client standard:", clientsError);
      return [];
    }
    
    console.log(`Récupéré ${allClients?.length || 0} clients au total avec le client standard`);
    
    // Si on veut afficher les clients des ambassadeurs, filtrer différemment
    if (showAmbassadorClients) {
      // Récupérer les IDs des clients ambassadeurs
      const { data: ambassadorClientLinks, error: ambassadorError } = await supabase
        .from('ambassador_clients')
        .select('client_id');

      if (ambassadorError) {
        console.error("Erreur lors de la récupération des liens ambassadeurs:", ambassadorError);
        return allClients || [];
      }

      // Créer un ensemble d'IDs de clients ambassadeurs
      const ambassadorClientIdSet = new Set(ambassadorClientLinks?.map(link => link.client_id) || []);

      // Ne garder QUE les clients qui sont dans la table ambassador_clients
      return allClients?.filter(client => ambassadorClientIdSet.has(client.id)) || [];
    } else {
      // Retourner tous les clients si on n'affiche pas spécifiquement les clients ambassadeurs
      return allClients || [];
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des clients avec le client standard:", error);
    return [];
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
    console.log(`Mise à jour du client ID: ${id}`, updates);
    
    // Version plus simple qui essaie d'utiliser directement le client admin
    const adminClient = getAdminSupabaseClient();
    
    console.log("Tentative de mise à jour avec le client admin");
    const { data, error } = await adminClient
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erreur lors de la mise à jour du client avec l'ID ${id}:`, error);
      
      // Si le client admin échoue, essayer avec le client standard et expliciter le user_id
      if (error.code === '42501') {
        console.log("Tentative de mise à jour avec le client standard en mode explicite");
        
        // Récupérer l'utilisateur actuel
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData.user?.id;
        
        if (!userId) {
          throw new Error("Utilisateur non authentifié");
        }
        
        // Si ce client n'appartient pas à cet utilisateur, on le force
        const updatesWithForce = {
          ...updates,
          user_id: userId
        };
        
        // Essayer une approche différente, en utilisant RPC avec une fonction sécurisée
        const { data: updatedViaRPC, error: rpcError } = await supabase.rpc(
          'update_client_securely',
          { 
            p_client_id: id,
            p_updates: updatesWithForce
          }
        );
        
        if (rpcError) {
          console.error("Échec de la mise à jour via RPC:", rpcError);
          throw rpcError;
        }
        
        console.log("Mise à jour réussie via RPC");
        
        // Récupérer les données mises à jour
        const { data: refreshedData, error: refreshError } = await supabase
          .from('clients')
          .select('*')
          .eq('id', id)
          .single();
          
        if (refreshError) {
          console.error("Erreur lors de la récupération des données mises à jour:", refreshError);
          throw refreshError;
        }
        
        return refreshedData as Client;
      }
      
      throw error;
    }

    // Convert date strings to Date objects
    if (data) {
      console.log("Client mis à jour avec succès:", data);
      return {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at)
      } as Client;
    }
    
    return null;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du client avec l'ID ${id}:`, error);
    throw error;  // Rethrow for better error handling elsewhere
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

/**
 * Corrige l'état du compte utilisateur d'un client
 * Utilisé pour synchroniser le statut du compte lorsqu'il y a une incohérence
 */
export const syncClientUserAccountStatus = async (clientId: string): Promise<boolean> => {
  try {
    // Récupérer les détails actuels du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, email, user_id')
      .eq('id', clientId)
      .single();
      
    if (clientError || !client) {
      console.error(`Erreur lors de la récupération du client ${clientId}:`, clientError);
      return false;
    }
    
    console.log("Synchronisation du statut du compte pour client:", client);
    
    // Si le client a un user_id, vérifier si l'utilisateur existe réellement dans auth.users
    if (client.user_id) {
      console.log("Le client a un user_id associé:", client.user_id);
      
      const { data: userExists, error: userCheckError } = await supabase.rpc(
        'check_user_exists_by_id',
        { user_id: client.user_id }
      );
      
      if (userCheckError) {
        console.error("Erreur lors de la vérification de l'utilisateur:", userCheckError);
        return false;
      }
      
      console.log("Utilisateur existe dans auth.users:", userExists);
      
      // Mettre à jour le statut du compte utilisateur en fonction de l'existence de l'utilisateur
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          has_user_account: userExists,
          // Si l'utilisateur existe mais que la date n'est pas définie, la définir maintenant
          user_account_created_at: userExists && !client.user_account_created_at ? new Date().toISOString() : null
        })
        .eq('id', clientId);
        
      if (updateError) {
        console.error(`Erreur lors de la mise à jour du statut du compte utilisateur:`, updateError);
        return false;
      }
      
      console.log("Statut du compte client mis à jour avec succès:", { has_user_account: userExists });
      return true;
    } else if (client.email) {
      // Si le client n'a pas de user_id mais a un email, vérifier si un utilisateur avec cet email existe
      console.log("Le client n'a pas de user_id. Recherche par email:", client.email);
      
      // Recherche directe dans auth.users par email (via RPC)
      const { data: userIdByEmail, error: emailCheckError } = await supabase.rpc(
        'get_user_id_by_email',
        { user_email: client.email }
      );
      
      if (emailCheckError) {
        console.error("Erreur lors de la recherche de l'utilisateur par email:", emailCheckError);
        return false;
      }
      
      console.log("Résultat de la recherche par email:", userIdByEmail);
      
      if (userIdByEmail) {
        // Si un utilisateur avec cet email existe, lier le client à cet utilisateur
        console.log("Utilisateur trouvé par email, liaison du client à cet utilisateur:", userIdByEmail);
        
        const { error: linkError } = await supabase
          .from('clients')
          .update({
            user_id: userIdByEmail,
            has_user_account: true,
            user_account_created_at: new Date().toISOString()
          })
          .eq('id', clientId);
          
        if (linkError) {
          console.error(`Erreur lors de la liaison du client à l'utilisateur:`, linkError);
          return false;
        }
        
        console.log("Client lié à l'utilisateur avec succès");
        return true;
      } else {
        console.log("Aucun utilisateur trouvé avec cet email. Réinitialisation du statut.");
      }
    }
    
    // Si aucune correspondance n'est trouvée, réinitialiser le statut du compte
    console.log("Réinitialisation du statut du compte utilisateur (aucune correspondance)");
    const { error: resetError } = await supabase
      .from('clients')
      .update({
        has_user_account: false,
        user_account_created_at: null
      })
      .eq('id', clientId);
      
    if (resetError) {
      console.error(`Erreur lors de la réinitialisation du statut du compte:`, resetError);
      return false;
    }
    
    console.log("Statut du compte réinitialisé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur dans syncClientUserAccountStatus:", error);
    return false;
  }
};
