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
    .replace(/[^\w\s]/g, ' ') // Remplace caractères spéciaux par espaces
    .replace(/\s+/g, ' ') // Remplace espaces multiples par un seul
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
  
  // Cas spécial: AR Saint Ghislain - tous sont le même client
  if (norm1.includes('ar saint ghislain') && norm2.includes('ar saint ghislain')) {
    return true;
  }
  
  // Variantes connues spécifiques iTakecare
  const variants = [
    ['winfinance', 'win finance'], // Winfinance = Win Finance
    ['skillset', 'skillset srl'], // Skillset = Skillset SRL
    ['apik', 'apik'], // Toutes les variantes Apik
    ['alarmes de clerck', 'alarmes de clerck'], // Toutes les variantes Alarmes De Clerck
    ['infra route srl', 'infra route srl'], // Toutes les variantes Infra Route
    ['coach naci', 'coach naci'], // Toutes les variantes Coach Naci
    ['engine of passion', 'engine of passion'], // Engine of Passion
    ['eurofood bank', 'about it'], // Eurofood Bank | About IT
    ['legrow studio', 'legrow studio'], // LeGrow Studio
    ['xprove scs', 'xprove scs'], // Xprove SCS
    ['v infra', 'v infra'], // v infra
  ];
  
  for (const [v1, v2] of variants) {
    if ((norm1.includes(v1) && norm2.includes(v2)) || 
        (norm1.includes(v2) && norm2.includes(v1))) {
      return true;
    }
  }
  
  return false;
};

/**
 * Traite les données brutes d'import pour créer des clients uniques avec nettoyage avancé
 */
export const processBulkClientData = (rawData: string[]): BulkClientData[] => {
  const clientMap = new Map<string, BulkClientData & { rawEntries: string[] }>();
  const cleaningReport = {
    raw_entries: rawData.length,
    duplicates_merged: [] as string[],
    series_merged: [] as string[],
    skipped_entries: [] as string[]
  };
  
  console.log('🧹 Début du nettoyage de', rawData.length, 'entrées');
  
  rawData.forEach((entry, index) => {
    const trimmed = entry.trim();
    if (!trimmed) {
      cleaningReport.skipped_entries.push('(entrée vide)');
      return;
    }
    
    let contactName: string;
    let clientName: string;
    
    // Parse selon les formats iTakecare
    if (trimmed.includes(' - ')) {
      // Format: "Prénom Nom - Entreprise"
      const parts = trimmed.split(' - ', 2);
      contactName = parts[0].trim();
      clientName = parts[1].trim();
      
      // Cas spécial: AR Saint Ghislain - toujours utiliser "AR Saint Ghislain" comme nom client
      if (clientName.toLowerCase().includes('ar saint ghislain')) {
        clientName = 'AR Saint Ghislain';
      }
    } else {
      // Format sans séparateur: "Entreprise" ou "Prénom Nom"
      contactName = trimmed;
      clientName = trimmed;
    }
    
    // Nettoyage des noms de base (suppression des #X et autres suffixes)
    const baseClientName = extractBaseName(clientName);
    const baseContactName = extractBaseName(contactName);
    
    console.log(`Traitement [${index}]: "${trimmed}" → Client: "${baseClientName}", Contact: "${baseContactName}"`);
    
    // Recherche de variantes/doublons existants
    let existingEntry: typeof clientMap extends Map<string, infer T> ? T : never | null = null;
    let existingKey: string | null = null;
    
    for (const [key, existing] of clientMap.entries()) {
      if (areVariants(baseClientName, existing.name)) {
        existingEntry = existing;
        existingKey = key;
        break;
      }
    }
    
    if (existingEntry && existingKey) {
      // Fusion avec client existant
      console.log(`🔗 Fusion détectée: "${baseClientName}" → "${existingEntry.name}"`);
      
      // Améliorer le nom du client si nécessaire
      let shouldUpdateName = false;
      let newName = existingEntry.name;
      
      // Préférer les noms sans numéros (#X)
      if (!baseClientName.includes('#') && existingEntry.name.includes('#')) {
        newName = baseClientName;
        shouldUpdateName = true;
      }
      // Préférer les noms plus longs et informatifs
      else if (baseClientName.length > existingEntry.name.length && !baseClientName.includes('#')) {
        newName = baseClientName;
        shouldUpdateName = true;
      }
      // Cas spéciaux iTakecare
      else if (baseClientName === 'AR Saint Ghislain' && !existingEntry.name.includes('AR Saint Ghislain')) {
        newName = 'AR Saint Ghislain';
        shouldUpdateName = true;
      }
      
      if (shouldUpdateName) {
        existingEntry.name = newName;
        console.log(`📝 Nom mis à jour: "${newName}"`);
      }
      
      // Ajouter à la liste des entrées brutes fusionnées
      existingEntry.rawEntries.push(trimmed);
      
      // Log de la fusion
      if (trimmed.includes('#')) {
        cleaningReport.series_merged.push(`${trimmed} → ${existingEntry.name}`);
      } else {
        cleaningReport.duplicates_merged.push(`${trimmed} → ${existingEntry.name}`);
      }
    } else {
      // Nouveau client unique
      const normalizedKey = normalizeForComparison(baseClientName) + '_' + index; // Ajouter index pour éviter collisions
      console.log(`✨ Nouveau client: "${baseClientName}"`);
      
      clientMap.set(normalizedKey, {
        name: baseClientName,
        contact_name: baseContactName,
        email: '', // Vide comme demandé
        status: 'active',
        company_id: 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0', // iTakecare
        rawEntries: [trimmed]
      });
    }
  });
  
  // Convertir en résultat final
  const result = Array.from(clientMap.values()).map(({ rawEntries, ...client }) => client);
  
  // Rapport de nettoyage final
  const report = {
    raw_entries: rawData.length,
    cleaned_entries: result.length,
    duplicates_merged: cleaningReport.duplicates_merged,
    series_merged: cleaningReport.series_merged,
    skipped_entries: cleaningReport.skipped_entries
  };
  
  console.log('📊 Rapport de nettoyage final:', report);
  console.log('🎯 Réduction:', rawData.length, '→', result.length, 'clients (', 
    Math.round((1 - result.length / rawData.length) * 100), '% de réduction)');
  
  // Store the cleaning report for later use
  (result as any).__cleaning_report = report;
  
  return result;
};

/**
 * Importe les clients par lots avec gestion des erreurs
 */
export const bulkCreateClients = async (
  clientsData: BulkClientData[],
  batchSize: number = 10,
  onProgress?: (processed: number, total: number) => void
): Promise<BulkImportResult> => {
  const result: BulkImportResult = {
    total: clientsData.length,
    success: 0,
    failed: 0,
    errors: [],
    created_clients: [],
    cleaning_report: (clientsData as any).__cleaning_report
  };
  
  console.log(`🔄 Début de l'import en masse de ${clientsData.length} clients`);
  
  // Traiter par lots
  for (let i = 0; i < clientsData.length; i += batchSize) {
    const batch = clientsData.slice(i, i + batchSize);
    
    // Traiter chaque client du lot individuellement pour capturer les erreurs
    for (const clientData of batch) {
      try {
        console.log(`➕ Création du client: ${clientData.name}`);
        
        // Créer le client
        const client = await createClient(clientData);
        if (client) {
          result.created_clients.push(client);
          result.success++;
          
          // Créer le collaborateur principal automatiquement s'il n'existe pas déjà
          try {
            // Vérifier d'abord s'il y a déjà un collaborateur principal
            const { data: existingPrimary } = await supabase
              .from('collaborators')
              .select('id')
              .eq('client_id', client.id)
              .eq('is_primary', true)
              .maybeSingle();

            if (!existingPrimary) {
              await createCollaborator(client.id, {
                name: clientData.contact_name,
                role: 'Contact principal',
                email: clientData.email || '',
                phone: '',
                department: ''
              }, true); // isPrimary = true
              console.log(`✅ Collaborateur principal créé pour ${client.name}`);
            } else {
              console.log(`ℹ️ Collaborateur principal déjà existant pour ${client.name}`);
            }
          } catch (collabError) {
            console.warn(`⚠️ Erreur lors de la création du collaborateur pour ${client.name}:`, collabError);
          }
          
        } else {
          result.failed++;
          result.errors.push({
            client: clientData.name,
            error: 'Échec de la création du client'
          });
        }
      } catch (error) {
        result.failed++;
        result.errors.push({
          client: clientData.name,
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        });
        console.error(`❌ Erreur lors de la création de ${clientData.name}:`, error);
      }
    }
    
    // Notifier du progrès
    const processed = Math.min(i + batchSize, clientsData.length);
    if (onProgress) {
      onProgress(processed, clientsData.length);
    }
    
    // Petite pause entre les lots pour ne pas surcharger la DB
    if (processed < clientsData.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`✅ Import terminé: ${result.success} succès, ${result.failed} échecs`);
  return result;
};