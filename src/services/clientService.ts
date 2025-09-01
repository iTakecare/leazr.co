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
  collaboratorData: Omit<Collaborator, 'id' | 'client_id' | 'created_at' | 'updated_at' | 'is_primary'>,
  isPrimary: boolean = false
): Promise<Collaborator> => {
  try {
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
  
  // Variantes connues spécifiques
  const variants = [
    ['winfinance', 'win finance'],
    ['skillset', 'skillset srl'],
    ['marie sergi', 'honesty'], // Cas spécial: même personne, entreprises différentes
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
  const clientMap = new Map<string, BulkClientData>();
  const cleaningReport = {
    raw_entries: rawData.length,
    duplicates_merged: [] as string[],
    series_merged: [] as string[],
    skipped_entries: [] as string[]
  };
  
  rawData.forEach(entry => {
    const trimmed = entry.trim();
    if (!trimmed) {
      cleaningReport.skipped_entries.push('(entrée vide)');
      return;
    }
    
    let contactName: string;
    let clientName: string;
    
    // Parse selon différents formats
    if (trimmed.includes(' - ')) {
      // Format: "Prénom Nom - Entreprise"
      const parts = trimmed.split(' - ', 2);
      contactName = parts[0].trim();
      clientName = parts[1].trim();
    } else {
      // Format sans séparateur: "Entreprise" ou "Prénom Nom"
      contactName = trimmed;
      clientName = trimmed;
    }
    
    // Nettoyage des noms de base (suppression des #X)
    const baseClientName = extractBaseName(clientName);
    const baseContactName = extractBaseName(contactName);
    
    // Recherche de variantes/doublons existants
    let existingKey: string | null = null;
    for (const [key, existing] of clientMap.entries()) {
      if (areVariants(baseClientName, existing.name) || 
          areVariants(baseClientName, key)) {
        existingKey = key;
        break;
      }
    }
    
    if (existingKey) {
      // Fusion avec client existant
      const existing = clientMap.get(existingKey)!;
      
      // Garder le nom le plus complet (sans #X si possible)
      if (baseClientName.length > existing.name.length || 
          (!existing.name.includes('#') && clientName.includes('#'))) {
        existing.name = baseClientName;
      }
      
      // Log de la fusion
      if (baseClientName !== existing.name) {
        cleaningReport.duplicates_merged.push(`${trimmed} → ${existing.name}`);
      } else {
        cleaningReport.series_merged.push(`${trimmed} → ${existing.name}`);
      }
    } else {
      // Nouveau client
      const normalizedKey = normalizeForComparison(baseClientName);
      clientMap.set(normalizedKey, {
        name: baseClientName,
        contact_name: baseContactName,
        email: '', // Vide comme demandé
        status: 'active',
        company_id: 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0' // iTakecare
      });
    }
  });
  
  const result = Array.from(clientMap.values());
  
  // Log du rapport de nettoyage
  const report = {
    raw_entries: rawData.length,
    cleaned_entries: result.length,
    duplicates_merged: cleaningReport.duplicates_merged,
    series_merged: cleaningReport.series_merged,
    skipped_entries: cleaningReport.skipped_entries
  };
  
  console.log('📊 Rapport de nettoyage:', report);
  
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
          
          // Créer le collaborateur principal automatiquement
          try {
            await createCollaborator(client.id, {
              name: clientData.contact_name,
              role: 'Contact principal',
              email: clientData.email || '',
              phone: '',
              department: ''
            }, true); // isPrimary = true
            console.log(`✅ Collaborateur principal créé pour ${client.name}`);
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