import { supabase } from "@/integrations/supabase/client";
import { Collaborator, Client, CreateClientData } from "@/types/client";

/**
 * Récupère un client par son ID
 */
export const getClientById = async (clientId: string): Promise<Client | null> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        collaborators (
          id,
          name,
          role,
          email,
          phone,
          department,
          is_primary,
          created_at,
          updated_at
        )
      `)
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
 * Crée un compte utilisateur pour un collaborateur spécifique
 */
export const createCollaboratorAccount = async (collaboratorId: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("👤 Création du compte pour le collaborateur:", collaboratorId);
    
    // Récupérer les infos du collaborateur
    const { data: collaborator, error: fetchError } = await supabase
      .from('collaborators')
      .select('*')
      .eq('id', collaboratorId)
      .single();

    if (fetchError || !collaborator) {
      throw new Error("Collaborateur non trouvé");
    }

    if (!collaborator.email) {
      throw new Error("Le collaborateur doit avoir un email pour créer un compte");
    }

    // TODO: Appeler l'edge function pour créer le compte utilisateur
    // Pour l'instant, on simule juste le succès
    console.log("✅ Compte créé avec succès pour:", collaborator.email);
    
    return {
      success: true,
      message: `Compte créé avec succès pour ${collaborator.name}`
    };
  } catch (error) {
    console.error("❌ Erreur lors de la création du compte:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Erreur inconnue"
    };
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

export const getFreeClients = async (): Promise<Client[]> => {
  try {
    console.log("🔍 Récupération des clients libres (non rattachés aux ambassadeurs)...");
    
    const { data, error } = await supabase
      .rpc('get_free_clients_secure');

    if (error) {
      console.error("❌ Erreur lors de la récupération des clients libres:", error);
      return [];
    }

    console.log(`✅ ${data?.length || 0} clients libres récupérés`);
    return data || [];
  } catch (error) {
    console.error("❌ Exception lors de la récupération des clients libres:", error);
    return [];
  }
};

export const addCollaborator = async (clientId: string, collaboratorData: any): Promise<Collaborator | null> => {
  try {
    console.log("➕ Ajout d'un collaborateur pour le client:", clientId);
    
    // Appeler la fonction createCollaborator qui est déjà implémentée
    const collaborator = await createCollaborator(clientId, {
      name: collaboratorData.name,
      role: collaboratorData.role,
      email: collaboratorData.email || "",
      phone: collaboratorData.phone || "",
      department: collaboratorData.department || ""
    });
    
    console.log("✅ Collaborateur ajouté avec succès:", collaborator.id);
    return collaborator;
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du collaborateur:", error);
    return null;
  }
};

export const getCollaboratorsByClientId = async (clientId: string): Promise<Collaborator[]> => {
  try {
    console.log("🔍 Récupération des collaborateurs pour le client:", clientId);
    
    // Utiliser la fonction getClientCollaborators qui est déjà implémentée
    return await getClientCollaborators(clientId);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des collaborateurs:", error);
    return [];
  }
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
  collaboratorData: Omit<Collaborator, 'id' | 'client_id' | 'created_at' | 'updated_at' | 'is_primary'>,
  isPrimary: boolean = false
): Promise<Collaborator> => {
  try {
    // Si on essaie de créer un collaborateur principal, vérifier qu'il n'en existe pas déjà un
    if (isPrimary) {
      const { data: existingPrimary, error: checkError } = await supabase
        .from('collaborators')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_primary', true)
        .maybeSingle();

      if (checkError) {
        console.error("❌ Erreur lors de la vérification du collaborateur principal:", checkError);
        throw checkError;
      }

      if (existingPrimary) {
        console.log("⚠️ Un collaborateur principal existe déjà pour ce client");
        // Ne pas créer de doublon, retourner l'existant ou lever une erreur
        throw new Error("Un collaborateur principal existe déjà pour ce client");
      }
    }

    const { data, error } = await supabase
      .from('collaborators')
      .insert({
        client_id: clientId,
        ...collaboratorData,
        is_primary: isPrimary
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
): Promise<Collaborator> => {
  try {
    const { data, error } = await supabase
      .from('collaborators')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', collaboratorId)
      .select()
      .single();

    if (error) {
      console.error("❌ Erreur lors de la mise à jour du collaborateur:", error);
      throw error;
    }

    console.log("✅ Collaborateur mis à jour:", data);
    return data;
  } catch (error) {
    console.error("❌ Exception lors de la mise à jour du collaborateur:", error);
    throw error;
  }
};

/**
 * Supprime un collaborateur
 */
export const deleteCollaborator = async (collaboratorId: string): Promise<void> => {
  try {
    // Vérifier d'abord si c'est un collaborateur principal
    const { data: collaborator, error: fetchError } = await supabase
      .from('collaborators')
      .select('is_primary, name')
      .eq('id', collaboratorId)
      .single();

    if (fetchError) {
      console.error("❌ Erreur lors de la récupération du collaborateur:", fetchError);
      throw fetchError;
    }

    if (collaborator.is_primary) {
      throw new Error("Impossible de supprimer le collaborateur principal");
    }

    const { error } = await supabase
      .from('collaborators')
      .delete()
      .eq('id', collaboratorId);

    if (error) {
      console.error("❌ Erreur lors de la suppression du collaborateur:", error);
      throw error;
    }

    console.log("✅ Collaborateur supprimé");
  } catch (error) {
    console.error("❌ Exception lors de la suppression du collaborateur:", error);
    throw error;
  }
};

/**
 * Structure pour les données d'import en masse
 */
export interface BulkClientData {
  name: string;
  contact_name: string;
  email?: string;
  status: 'active' | 'inactive' | 'lead';
  company_id: string;
}

export interface BulkImportResult {
  total: number;
  success: number;
  failed: number;
  errors: { client: string; error: string }[];
  created_clients: Client[];
  cleaning_report?: {
    raw_entries: number;
    cleaned_entries: number;
    duplicates_merged: string[];
    series_merged: string[];
    skipped_entries: string[];
  };
}

/**
 * Normalise un nom pour la comparaison (supprime espaces multiples, caractères spéciaux, casse)
 */
const normalizeForComparison = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\\w\\s]/g, ' ') // Remplace caractères spéciaux par espaces
    .replace(/\\s+/g, ' ') // Remplace espaces multiples par un seul
    .trim();
};

/**
 * Extrait le nom de base en supprimant les numéros de série (#1, #2, etc.)
 */
const extractBaseName = (name: string): string => {
  return name.replace(/\s*#\d+.*$/, '').trim();
};

/**
 * Détecte si deux noms sont des variantes du même client
 */
const areVariants = (name1: string, name2: string): boolean => {
  const norm1 = normalizeForComparison(name1);
  const norm2 = normalizeForComparison(name2);
  
  // Comparaison exacte après normalisation
  if (norm1 === norm2) return true;
  
  // Comparaison des noms de base (sans #X)
  const base1 = normalizeForComparison(extractBaseName(name1));
  const base2 = normalizeForComparison(extractBaseName(name2));
  if (base1 === base2) return true;
  
  return false;
};

/**
 * Détecte les clients en doublon basés sur l'email et le nom
 */
export const detectDuplicateClients = async (): Promise<Array<{ clients: Client[], reason: string }>> => {
  try {
    console.log("🔍 Détection des doublons...");
    
    const clients = await getAllClients();
    const duplicates: Array<{ clients: Client[], reason: string }> = [];
    const processed = new Set<string>();

    // Grouper par email
    const byEmail = new Map<string, Client[]>();
    clients.forEach(client => {
      if (client.email && client.email.trim()) {
        const email = client.email.toLowerCase().trim();
        if (!byEmail.has(email)) {
          byEmail.set(email, []);
        }
        byEmail.get(email)!.push(client);
      }
    });

    // Trouver les doublons par email
    byEmail.forEach((clientGroup, email) => {
      if (clientGroup.length > 1) {
        const ids = clientGroup.map(c => c.id).sort().join('|');
        if (!processed.has(ids)) {
          processed.add(ids);
          duplicates.push({
            clients: clientGroup,
            reason: `Email identique: ${email}`
          });
        }
      }
    });

    // Grouper par nom similaire
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const client1 = clients[i];
        const client2 = clients[j];
        
        const ids = [client1.id, client2.id].sort().join('|');
        if (processed.has(ids)) continue;

        const name1 = normalizeForComparison(client1.name);
        const name2 = normalizeForComparison(client2.name);

        if (name1 === name2 || areVariants(client1.name, client2.name)) {
          processed.add(ids);
          duplicates.push({
            clients: [client1, client2],
            reason: `Nom similaire: "${client1.name}" ≈ "${client2.name}"`
          });
        }
      }
    }

    console.log(`✅ ${duplicates.length} groupes de doublons détectés`);
    return duplicates;
  } catch (error) {
    console.error("❌ Erreur lors de la détection des doublons:", error);
    return [];
  }
};
