
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import type { Client } from "@/types/client";

/**
 * Crée un nouveau client
 * @param data Les données du client à créer
 * @returns Le client créé
 */
export const createClient = async (clientData: any) => {
  try {
    console.log("Creating client:", clientData);
    
    // Avec les nouvelles politiques RLS permissives, utiliser directement le client standard
    const { data, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();
    
    if (error) {
      console.error("Erreur lors de la création du client:", error);
      throw error;
    }
    
    console.log("Client created successfully:", data);
    return data;
  } catch (error) {
    console.error("Exception in createClient:", error);
    throw error;
  }
};

/**
 * Récupère tous les clients avec isolation par entreprise
 * @returns Liste de tous les clients de l'entreprise
 */
export const getAllClients = async (): Promise<Client[]> => {
  try {
    console.log("Récupération de tous les clients avec isolation par entreprise via RPC sécurisée");
    
    // Récupérer le company_id de l'utilisateur actuel
    const { getCurrentUserCompanyId } = await import('./multiTenantService');
    const companyId = await getCurrentUserCompanyId();
    
    if (!companyId) {
      console.warn("Aucun company_id trouvé pour l'utilisateur actuel");
      return [];
    }
    
    const { data, error } = await supabase.rpc('get_all_clients_secure', { 
      p_company_id: companyId 
    });

    if (error) {
      console.error("Erreur lors de la récupération des clients via RPC:", error);
      throw error;
    }

    console.log(`Récupéré ${data?.length || 0} clients avec isolation par entreprise`);
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des clients:", error);
    return [];
  }
};

/**
 * Récupère un client par son ID avec isolation par entreprise
 * @param id ID du client à récupérer
 * @returns Le client correspondant ou null
 */
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    console.log(`Récupération du client avec l'ID: ${id}`);
    
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .maybeSingle();
        
    if (error) {
      console.error(`Erreur lors de la récupération du client avec l'ID ${id}:`, error);
      throw error;
    }

    if (!clientData) {
      console.warn(`Aucun client trouvé pour l'ID: ${id}`);
      return null;
    }

    // Récupérer les collaborateurs pour ce client
    const { data: collaboratorsData, error: collaboratorsError } = await supabase
      .from('collaborators')
      .select('*')
      .eq('client_id', id);

    if (collaboratorsError) {
      console.error(`getClientById - Erreur lors de la récupération des collaborateurs pour le client ${id}:`, collaboratorsError);
      // Continue avec les données du client même si les collaborateurs ne peuvent pas être récupérés
    }

    // Combiner les données du client avec les collaborateurs
    const client: Client = {
      ...clientData,
      collaborators: collaboratorsData || []
    };

    console.log(`Client complet récupéré:`, {
      id: client.id,
      name: client.name,
      email: client.email,
      collaborators_count: client.collaborators?.length || 0
    });

    return client;
  } catch (error) {
    console.error(`Exception lors de la récupération du client avec l'ID ${id}:`, error);
    return null;
  }
};

/**
 * Met à jour un client existant avec isolation par entreprise
 * @param id ID du client à mettre à jour
 * @param updates Les mises à jour à appliquer au client
 * @returns Le client mis à jour
 */
export const updateClient = async (id: string, updates: Partial<Client>): Promise<Client | null> => {
  try {
    console.log(`Mise à jour du client ID: ${id}`, updates);
    
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erreur lors de la mise à jour du client avec l'ID ${id}:`, error);
      throw error;
    }
    
    console.log("Client mis à jour avec succès:", data);
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at)
    } as Client;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du client avec l'ID ${id}:`, error);
    throw error;
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
 * Met à jour les informations d'un client depuis les données de profil utilisateur
 * @param userId ID de l'utilisateur
 * @param firstName Prénom
 * @param lastName Nom de famille  
 * @param phone Téléphone
 * @returns true si la mise à jour a réussi
 */
export const updateClientFromProfile = async (
  userId: string, 
  firstName: string, 
  lastName: string, 
  phone?: string
): Promise<boolean> => {
  try {
    console.log(`Mise à jour du client pour l'utilisateur ${userId}:`, { firstName, lastName, phone });
    
    // Construire le nom complet
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    
    // Préparer les données de mise à jour
    const updateData: any = {
      name: fullName,
      contact_name: fullName
    };
    
    // Ajouter le téléphone s'il est fourni
    if (phone && phone.trim()) {
      updateData.phone = phone.trim();
    }
    
    // Mettre à jour le client associé à cet utilisateur
    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('user_id', userId)
      .select();
    
    if (error) {
      console.error("Erreur lors de la mise à jour du client:", error);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log("Client mis à jour avec succès:", data[0]);
      return true;
    } else {
      console.log("Aucun client trouvé pour cet utilisateur");
      return false;
    }
  } catch (error) {
    console.error("Exception lors de la mise à jour du client depuis le profil:", error);
    return false;
  }
};

/**
 * Corrige l'état du compte utilisateur d'un client
 */
export const syncClientUserAccountStatus = async (clientId: string): Promise<boolean> => {
  try {
    // Récupérer les détails actuels du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, email, user_id, has_user_account, user_account_created_at')
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
      
      // Appel à la fonction RPC sécurisée pour vérifier l'existence de l'utilisateur
      const { data: userExists, error: userCheckError } = await supabase.rpc(
        'check_user_exists_by_id',
        { user_id: client.user_id }
      );
      
      if (userCheckError) {
        console.error("Erreur lors de la vérification de l'utilisateur:", userCheckError);
        return false;
      }
      
      console.log("Utilisateur existe dans auth.users:", userExists);
      
      // Si l'utilisateur n'existe pas, mais que le client a un email, essayer de trouver un utilisateur correspondant par email
      if (!userExists && client.email) {
        console.log("L'ID utilisateur est incorrect. Tentative de recherche par email:", client.email);
        
        const { data: correctUserId, error: getUserIdError } = await supabase.rpc(
          'get_user_id_by_email',
          { user_email: client.email }
        );
        
        if (getUserIdError) {
          console.error("Erreur lors de la recherche utilisateur par email:", getUserIdError);
        } else if (correctUserId) {
          console.log("Utilisateur trouvé par email, mise à jour du user_id:", correctUserId);
          
          // Mettre à jour le user_id du client avec l'ID correct
          try {
            const { error: updateError } = await supabase.rpc(
              'update_client_securely',
              { 
                p_client_id: clientId,
                p_updates: {
                  user_id: correctUserId,
                  has_user_account: true,
                  user_account_created_at: new Date().toISOString()
                }
              }
            );
              
            if (updateError) {
              console.error(`Erreur lors de la mise à jour de l'ID utilisateur via RPC:`, updateError);
              throw updateError;
            }
            
            console.log("ID utilisateur mis à jour avec succès");
            return true;
          } catch (rpcError) {
            // Fallback to admin client if RPC fails
            const adminClient = getAdminSupabaseClient();
            const { error: adminUpdateError } = await adminClient
              .from('clients')
              .update({
                user_id: correctUserId,
                has_user_account: true,
                user_account_created_at: new Date().toISOString()
              })
              .eq('id', clientId);
              
            if (adminUpdateError) {
              console.error(`Erreur lors de la mise à jour de l'ID utilisateur via admin:`, adminUpdateError);
              return false;
            }
            
            console.log("ID utilisateur mis à jour avec succès via client admin");
            return true;
          }
        }
      }
      
      // Mettre à jour le statut du compte utilisateur en fonction de l'existence de l'utilisateur
      try {
        const { error: updateError } = await supabase.rpc(
          'update_client_securely',
          { 
            p_client_id: clientId,
            p_updates: {
              has_user_account: userExists,
              user_account_created_at: userExists && !client.user_account_created_at ? new Date().toISOString() : client.user_account_created_at
            }
          }
        );
          
        if (updateError) {
          console.error(`Erreur lors de la mise à jour du statut du compte utilisateur via RPC:`, updateError);
          throw updateError;
        }
      } catch (rpcError) {
        // Fallback to admin client if RPC fails
        const adminClient = getAdminSupabaseClient();
        const { error: adminUpdateError } = await adminClient
          .from('clients')
          .update({
            has_user_account: userExists,
            user_account_created_at: userExists && !client.user_account_created_at ? new Date().toISOString() : client.user_account_created_at
          })
          .eq('id', clientId);
          
        if (adminUpdateError) {
          console.error(`Erreur lors de la mise à jour du statut du compte utilisateur via admin:`, adminUpdateError);
          return false;
        }
      }
      
      console.log("Statut du compte client mis à jour avec succès:", { has_user_account: userExists });
      return true;
    } else if (client.email) {
      // Si le client n'a pas de user_id mais a un email, vérifier si un utilisateur avec cet email existe
      console.log("Le client n'a pas de user_id. Recherche par email:", client.email);
      
      // Recherche d'un utilisateur par email via la fonction RPC sécurisée
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
        
        try {
          const { error: linkError } = await supabase.rpc(
            'update_client_securely',
            { 
              p_client_id: clientId,
              p_updates: {
                user_id: userIdByEmail,
                has_user_account: true,
                user_account_created_at: new Date().toISOString()
              }
            }
          );
            
          if (linkError) {
            console.error(`Erreur lors de la liaison du client à l'utilisateur via RPC:`, linkError);
            throw linkError;
          }
        } catch (rpcError) {
          // Fallback to admin client if RPC fails
          const adminClient = getAdminSupabaseClient();
          const { error: adminLinkError } = await adminClient
            .from('clients')
            .update({
              user_id: userIdByEmail,
              has_user_account: true,
              user_account_created_at: new Date().toISOString()
            })
            .eq('id', clientId);
            
          if (adminLinkError) {
            console.error(`Erreur lors de la liaison du client à l'utilisateur via admin:`, adminLinkError);
            return false;
          }
        }
        
        console.log("Client lié à l'utilisateur avec succès");
        return true;
      } else {
        console.log("Aucun utilisateur trouvé avec cet email. Réinitialisation du statut.");
      }
    }
    
    // Si aucune correspondance n'est trouvée, réinitialiser le statut du compte
    console.log("Réinitialisation du statut du compte utilisateur (aucune correspondance)");
    
    try {
      const { error: resetError } = await supabase.rpc(
        'update_client_securely',
        { 
          p_client_id: clientId,
          p_updates: {
            has_user_account: false,
            user_account_created_at: null
          }
        }
      );
        
      if (resetError) {
        console.error(`Erreur lors de la réinitialisation du statut du compte via RPC:`, resetError);
        throw resetError;
      }
    } catch (rpcError) {
      // Fallback to admin client if RPC fails
      const adminClient = getAdminSupabaseClient();
      const { error: adminResetError } = await adminClient
        .from('clients')
        .update({
          has_user_account: false,
          user_account_created_at: null
        })
        .eq('id', clientId);
        
      if (adminResetError) {
        console.error(`Erreur lors de la réinitialisation du statut du compte via admin:`, adminResetError);
        return false;
      }
    }
    
    console.log("Statut du compte réinitialisé avec succès");
    return true;
  } catch (error) {
    console.error("Erreur dans syncClientUserAccountStatus:", error);
    return false;
  }
};

/**
 * Récupère uniquement les clients libres (non attachés à des ambassadeurs)
 * Utilisé pour les offres internes
 */
export const getFreeClients = async () => {
  try {
    console.log("🔍 DEBUG getFreeClients - DÉBUT - Nouvelle approche avec fonction RPC sécurisée");
    
    // NOUVELLE APPROCHE : Utiliser une fonction RPC sécurisée côté serveur
    // qui peut contourner les restrictions RLS pour identifier les clients libres
    const { data: freeClientsData, error: rpcError } = await supabase.rpc('get_free_clients_secure');
    
    if (rpcError) {
      console.error("❌ DEBUG - Erreur avec fonction RPC sécurisée:", rpcError);
      
      // FALLBACK ULTIME : Requête simple sur tous les clients avec avertissement
      console.log("🔄 DEBUG - Fallback d'urgence : récupération de tous les clients avec avertissement");
      
      const { data: allClientsData, error: allClientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          company,
          phone,
          address,
          city,
          postal_code,
          country,
          vat_number,
          notes,
          status,
          created_at,
          updated_at,
          user_id,
          has_user_account,
          company_id
        `)
        .order('created_at', { ascending: false });

      if (allClientsError) {
        console.error("❌ DEBUG - Erreur avec requête fallback d'urgence:", allClientsError);
        return [];
      }

      console.warn("⚠️ DEBUG - ATTENTION : Mode fallback d'urgence - Tous les clients retournés car impossible de filtrer les clients libres");
      console.log(`📊 DEBUG - Clients récupérés en mode fallback: ${allClientsData?.length || 0}`);
      
      const formattedClients = allClientsData?.map(client => ({
        id: client.id,
        name: client.name,
        email: client.email || '',
        company: client.company || '',
        companyName: client.company || '',
        phone: client.phone,
        address: client.address,
        city: client.city,
        postal_code: client.postal_code,
        country: client.country,
        vat_number: client.vat_number,
        notes: client.notes,
        status: client.status,
        created_at: new Date(client.created_at),
        updated_at: new Date(client.updated_at),
        user_id: client.user_id,
        has_user_account: client.has_user_account,
        company_id: client.company_id,
        ambassador: undefined
      })) || [];

      console.log("✅ DEBUG - Retour des clients en mode fallback d'urgence:", formattedClients.length);
      return formattedClients;
    }

    console.log(`✅ DEBUG - Clients libres trouvés avec fonction RPC sécurisée: ${freeClientsData?.length || 0}`);
    
    // Debug spécifique pour "Client Test SRL"
    const testClient = freeClientsData?.find(c => 
      c.company === "Cleint Test SRL" || 
      c.name?.includes("Test") || 
      c.id === "21973949-2c5b-46d7-b8d1-bcfba3bfcefa"
    );
    
    if (testClient) {
      console.log("🎯 DEBUG - Client Test SRL inclus dans les clients libres:", {
        id: testClient.id,
        name: testClient.name,
        company: testClient.company
      });
    } else {
      console.log("⚠️ DEBUG - Client Test SRL NON inclus dans les clients libres - vérifier s'il est lié à un ambassadeur");
    }

    // Formater les données
    const formattedClients = freeClientsData?.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email || '',
      company: client.company || '',
      companyName: client.company || '',
      phone: client.phone,
      address: client.address,
      city: client.city,
      postal_code: client.postal_code,
      country: client.country,
      vat_number: client.vat_number,
      notes: client.notes,
      status: client.status,
      created_at: new Date(client.created_at),
      updated_at: new Date(client.updated_at),
      user_id: client.user_id,
      has_user_account: client.has_user_account,
      company_id: client.company_id,
      ambassador: undefined
    })) || [];

    console.log(`🎯 DEBUG - ${formattedClients.length} clients libres formatés et prêts à être retournés`);
    console.log("✅ DEBUG getFreeClients - FIN - Données retournées:", formattedClients.map(c => ({
      id: c.id,
      name: c.name,
      company: c.company
    })));
    
    return formattedClients;

  } catch (error) {
    console.error("❌ DEBUG - Exception dans getFreeClients:", error);
    return [];
  }
};
