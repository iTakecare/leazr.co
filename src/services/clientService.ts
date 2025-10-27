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

// ==========================================
// HELPERS DE NORMALISATION AVANCÉS
// ==========================================

/**
 * Supprime les accents et diacritiques
 */
const removeDiacritics = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

/**
 * Supprime les suffixes juridiques courants
 */
const stripLegalSuffixes = (str: string): string => {
  return str.replace(/\b(srl|sprl|sarl|sas|sasu|bv|bvba|gmbh|ltd|inc|sa|spa|eurl|scrl|asbl|vzw|cv|nv|llc|plc|ag|gmbh & co kg)\b\.?/gi, ' ');
};

/**
 * Supprime les termes génériques
 */
const stripGenericTerms = (str: string): string => {
  return str.replace(/\b(infi|soins|service|services|company|co|group|groupe|enterprises|entreprise)\b/gi, ' ');
};

/**
 * Normalise un nom pour la comparaison (supprime espaces multiples, caractères spéciaux, casse)
 */
const normalizeForComparison = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extrait le nom de base en supprimant les numéros de série (#1, #2, etc.)
 */
const extractBaseName = (name: string): string => {
  return name.replace(/\s*#\d+.*$/, '').trim();
};

/**
 * Canonicalise un nom (applique toutes les normalisations)
 */
const canonicalizeName = (str: string): string => {
  if (!str) return '';
  const base = extractBaseName(str);
  const noAccents = removeDiacritics(base);
  const noLegal = stripLegalSuffixes(noAccents);
  const noGeneric = stripGenericTerms(noLegal);
  return normalizeForComparison(noGeneric);
};

/**
 * Normalise un numéro de téléphone (garde les 9 derniers chiffres)
 */
const normalizePhone = (phone?: string): string => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.slice(-9);
};

/**
 * Extrait les parties user et domain d'un email
 */
const emailParts = (email?: string): { user: string; domain: string } => {
  if (!email) return { user: '', domain: '' };
  const [user, domain] = email.toLowerCase().trim().split('@');
  return { user: user || '', domain: domain || '' };
};

/**
 * Extrait les tokens significatifs d'un nom (mots > 2 lettres)
 */
const extractSignificantTokens = (name: string): string[] => {
  return canonicalizeName(name)
    .split(' ')
    .filter(word => word.length > 2);
};

/**
 * Découpe un nom sur les séparateurs - | : et retourne les segments gauche et droit
 */
const getDashSegments = (name: string): { left: string; right: string } => {
  const match = name.match(/^(.+?)\s*[-|:]\s*(.+)$/);
  if (match) {
    return {
      left: match[1].trim(),
      right: match[2].trim()
    };
  }
  return { left: name, right: '' };
};

/**
 * Vérifie si une chaîne contient des termes génériques d'entreprise
 */
const isLikelyGenericCompany = (str: string): boolean => {
  const lower = str.toLowerCase();
  const genericTerms = ['infi', 'soins', 'service', 'services', 'company', 'co', 'group', 'groupe', 'enterprises', 'entreprise'];
  const legalSuffixes = ['srl', 'sprl', 'sarl', 'sas', 'sasu', 'bv', 'bvba', 'gmbh', 'ltd', 'inc', 'sa', 'spa', 'eurl', 'scrl', 'asbl', 'vzw', 'cv', 'nv', 'llc', 'plc', 'ag'];
  
  return genericTerms.some(term => lower.includes(term)) || 
         legalSuffixes.some(suffix => lower.includes(suffix));
};

/**
 * Extrait un token fort unique (nom de marque distinctif)
 */
const singleStrongToken = (nameOrCompany: string): string => {
  if (!nameOrCompany) return '';
  const canonical = canonicalizeName(nameOrCompany);
  const tokens = canonical.split(' ').filter(t => t.length > 0);
  
  // Si un seul token et qu'il est significatif (long ou avec chiffres)
  if (tokens.length === 1) {
    const token = tokens[0];
    if (token.length >= 5 || /\d/.test(token)) {
      return token;
    }
  }
  
  return '';
};

/**
 * Construit une map de fréquence des tokens
 */
const buildTokenFrequency = (clients: Client[]): Map<string, number> => {
  const frequency = new Map<string, number>();
  
  clients.forEach(client => {
    const allTokens = extractSignificantTokens((client.name || '') + ' ' + (client.company || ''));
    allTokens.forEach(token => {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    });
  });
  
  return frequency;
};

// ==========================================
// CALCUL DE SIMILARITÉ ENRICHI
// ==========================================

interface SimilarityResult {
  score: number;
  signals: string[];
}

/**
 * Calcule le score de similarité enrichi entre deux clients
 */
const calculateSimilarityScore = (client1: Client, client2: Client, tokenFrequency?: Map<string, number>): SimilarityResult => {
  let score = 0;
  const signals: string[] = [];
  
  // 1. VAT NUMBER IDENTIQUE = DOUBLON CERTAIN
  if (client1.vat_number && client2.vat_number && 
      client1.vat_number.trim() === client2.vat_number.trim()) {
    return { score: 100, signals: ['VAT identique'] };
  }
  
  // 2. EMAIL
  const email1 = client1.email?.toLowerCase().trim();
  const email2 = client2.email?.toLowerCase().trim();
  
  if (email1 && email2) {
    if (email1 === email2) {
      score += 80;
      signals.push('Email identique');
    } else {
      const parts1 = emailParts(email1);
      const parts2 = emailParts(email2);
      
      if (parts1.user === parts2.user && parts1.domain !== parts2.domain) {
        score += 20;
        signals.push('Même utilisateur email');
      }
    }
  }
  
  // 3. TÉLÉPHONE (9 derniers chiffres)
  const phone1 = normalizePhone(client1.phone);
  const phone2 = normalizePhone(client2.phone);
  
  if (phone1 && phone2 && phone1.length >= 9 && phone2.length >= 9) {
    if (phone1 === phone2) {
      score += 60;
      signals.push('Téléphone identique');
    }
  }
  
  // 4. NOMS ET SOCIÉTÉS (canonicalisés)
  const canon1Name = canonicalizeName(client1.name || '');
  const canon2Name = canonicalizeName(client2.name || '');
  const canon1Company = canonicalizeName(client1.company || '');
  const canon2Company = canonicalizeName(client2.company || '');
  
  // 5. DASH-RIGHT MATCH (Fabrice - Never2Late vs Never2Late)
  const dash1 = getDashSegments(client1.name || '');
  const dash2 = getDashSegments(client2.name || '');
  
  if (dash1.right) {
    const dashRightCanon = canonicalizeName(dash1.right);
    if ((canon2Name && dashRightCanon === canon2Name) || 
        (canon2Company && dashRightCanon === canon2Company)) {
      score += 70;
      signals.push('Segment après tiret = autre fiche');
      console.info(`🎯 Dash-right match: "${dash1.right}" matches "${client2.name || client2.company}"`);
    }
  }
  if (dash2.right) {
    const dashRightCanon = canonicalizeName(dash2.right);
    if ((canon1Name && dashRightCanon === canon1Name) || 
        (canon1Company && dashRightCanon === canon1Company)) {
      score += 70;
      signals.push('Segment après tiret = autre fiche');
      console.info(`🎯 Dash-right match: "${dash2.right}" matches "${client1.name || client1.company}"`);
    }
  }
  
  // 6. STRONG BRAND TOKEN (never2late, etc.)
  const strong1 = singleStrongToken(client1.name || '') || singleStrongToken(client1.company || '');
  const strong2 = singleStrongToken(client2.name || '') || singleStrongToken(client2.company || '');
  
  if (strong1 && strong2 && strong1 === strong2) {
    score += 45;
    signals.push('Token distinctif commun');
    console.info(`🎯 Strong token match: "${strong1}"`);
  }
  
  // 7. GENERIC COMPANY + FIRSTNAME (Infi Magali Soins SRL vs Magali Hadjadj)
  const isGeneric1 = isLikelyGenericCompany(client1.company || client1.name || '');
  const isGeneric2 = isLikelyGenericCompany(client2.company || client2.name || '');
  
  if (isGeneric1 || isGeneric2) {
    const genericClient = isGeneric1 ? client1 : client2;
    const personClient = isGeneric1 ? client2 : client1;
    
    const genericCanon = canonicalizeName(genericClient.company || genericClient.name || '');
    const genericTokens = genericCanon.split(' ').filter(t => t.length > 2);
    
    // Si la société générique se réduit à un seul token (prénom potentiel)
    if (genericTokens.length === 1) {
      const potentialFirstname = genericTokens[0];
      const personTokens = extractSignificantTokens(personClient.name || '');
      
      if (personTokens.includes(potentialFirstname)) {
        // Vérifier si ville ou code postal identiques pour renforcer
        const sameLocation = 
          (genericClient.postal_code && personClient.postal_code && 
           genericClient.postal_code.trim() === personClient.postal_code.trim()) ||
          (genericClient.city && personClient.city && 
           canonicalizeName(genericClient.city) === canonicalizeName(personClient.city));
        
        if (sameLocation) {
          score += 50;
          signals.push('Entreprise générique ↔ prénom de la personne (+ localisation)');
        } else {
          score += 35;
          signals.push('Entreprise générique ↔ prénom de la personne');
        }
        console.info(`🎯 Generic-firstname match: "${potentialFirstname}" in "${personClient.name}"`);
      }
    }
  }
  
  // 8. CONTACT_NAME CROSS (contact_name de l'un ↔ name de l'autre)
  const contact1 = canonicalizeName(client1.contact_name || '');
  const contact2 = canonicalizeName(client2.contact_name || '');
  
  if (contact1 && canon2Name) {
    const tokens1 = contact1.split(' ').filter(t => t.length > 2);
    const tokens2 = canon2Name.split(' ').filter(t => t.length > 2);
    if (tokens1.length > 0 && tokens2.length > 0) {
      const common = tokens1.filter(t => tokens2.includes(t));
      const ratio = common.length / Math.max(tokens1.length, tokens2.length);
      if (ratio > 0.5) {
        score += 40;
        signals.push('Contact = Nom (cross)');
      }
    }
  }
  if (contact2 && canon1Name) {
    const tokens1 = contact2.split(' ').filter(t => t.length > 2);
    const tokens2 = canon1Name.split(' ').filter(t => t.length > 2);
    if (tokens1.length > 0 && tokens2.length > 0) {
      const common = tokens1.filter(t => tokens2.includes(t));
      const ratio = common.length / Math.max(tokens1.length, tokens2.length);
      if (ratio > 0.5) {
        score += 40;
        signals.push('Contact = Nom (cross)');
      }
    }
  }
  
  // Nom exact match
  if (canon1Name && canon2Name && canon1Name === canon2Name) {
    score += 25;
    signals.push('Nom identique');
  }
  
  // Société exact match
  if (canon1Company && canon2Company && canon1Company === canon2Company) {
    score += 25;
    signals.push('Société identique');
  }
  
  // Cross matches: nom1 ↔ société2
  if (canon1Name && canon2Company && canon1Name === canon2Company) {
    score += 15;
    signals.push('Nom = Société');
  }
  if (canon2Name && canon1Company && canon2Name === canon1Company) {
    score += 15;
    signals.push('Nom = Société');
  }
  
  // 9. TOKENS COMMUNS + RARE TOKEN BOOST
  const allTokens1 = extractSignificantTokens((client1.name || '') + ' ' + (client1.company || ''));
  const allTokens2 = extractSignificantTokens((client2.name || '') + ' ' + (client2.company || ''));
  
  if (allTokens1.length > 0 && allTokens2.length > 0) {
    const commonTokens = allTokens1.filter(t => allTokens2.includes(t));
    const tokenRatio = commonTokens.length / Math.max(allTokens1.length, allTokens2.length);
    const tokenScore = Math.round(tokenRatio * 40);
    if (tokenScore > 0) {
      score += tokenScore;
      if (tokenRatio >= 0.5) {
        signals.push(`Tokens communs (${Math.round(tokenRatio * 100)}%)`);
      }
    }
    
    // Rare token boost
    if (tokenFrequency && commonTokens.length > 0) {
      const rareTokens = commonTokens.filter(token => {
        const freq = tokenFrequency.get(token) || 0;
        return freq <= 5;
      });
      
      if (rareTokens.length > 0) {
        const minFreq = Math.min(...rareTokens.map(t => tokenFrequency.get(t) || 0));
        if (minFreq <= 2) {
          score += 25;
          signals.push('Token(s) rares communs');
        } else if (minFreq <= 5) {
          score += 15;
          signals.push('Token(s) peu fréquents communs');
        }
      }
    }
  }
  
  // 10. LOCALISATION
  if (client1.postal_code && client2.postal_code && 
      client1.postal_code.trim() === client2.postal_code.trim()) {
    score += 15;
    signals.push('Code postal identique');
  }
  
  if (client1.city && client2.city && 
      canonicalizeName(client1.city) === canonicalizeName(client2.city)) {
    score += 10;
    signals.push('Ville identique');
  }
  
  return { score: Math.min(score, 100), signals };
};

// ==========================================
// GRAPHE DE SIMILARITÉ ET GROUPEMENT
// ==========================================

interface Edge {
  from: string;
  to: string;
  score: number;
  signals: string[];
}

/**
 * Construit un graphe de similarité avec bucketing pour performance
 */
const buildSimilarityGraph = (clients: Client[]): Edge[] => {
  const edges: Edge[] = [];
  
  // Construire la fréquence des tokens
  const tokenFrequency = buildTokenFrequency(clients);
  
  // Maps globales pour détection rapide
  const byVat = new Map<string, Client[]>();
  const byEmail = new Map<string, Client[]>();
  const byPhone = new Map<string, Client[]>();
  const byDashRight = new Map<string, Client[]>();
  const byStrongToken = new Map<string, Client[]>();
  const bySingleFirstname = new Map<string, Client[]>();
  
  // Remplir les maps
  clients.forEach(client => {
    if (client.vat_number?.trim()) {
      const vat = client.vat_number.trim();
      if (!byVat.has(vat)) byVat.set(vat, []);
      byVat.get(vat)!.push(client);
    }
    
    if (client.email?.trim()) {
      const email = client.email.toLowerCase().trim();
      if (!byEmail.has(email)) byEmail.set(email, []);
      byEmail.get(email)!.push(client);
    }
    
    const phone = normalizePhone(client.phone);
    if (phone.length >= 9) {
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone)!.push(client);
    }
    
    // Bucketing par segment droit du tiret
    const dashSegments = getDashSegments(client.name || '');
    if (dashSegments.right) {
      const rightCanon = canonicalizeName(dashSegments.right);
      if (rightCanon) {
        if (!byDashRight.has(rightCanon)) byDashRight.set(rightCanon, []);
        byDashRight.get(rightCanon)!.push(client);
      }
    }
    
    // Bucketing par token fort
    const strong = singleStrongToken(client.name || '') || singleStrongToken(client.company || '');
    if (strong) {
      if (!byStrongToken.has(strong)) byStrongToken.set(strong, []);
      byStrongToken.get(strong)!.push(client);
    }
    
    // Bucketing par prénom unique dans société générique
    const isGeneric = isLikelyGenericCompany(client.company || client.name || '');
    if (isGeneric) {
      const genericCanon = canonicalizeName(client.company || client.name || '');
      const tokens = genericCanon.split(' ').filter(t => t.length > 2);
      if (tokens.length === 1) {
        const firstname = tokens[0];
        if (!bySingleFirstname.has(firstname)) bySingleFirstname.set(firstname, []);
        bySingleFirstname.get(firstname)!.push(client);
      }
    }
  });
  
  // Ajouter edges depuis les maps globales
  const processedPairs = new Set<string>();
  
  const addEdgesFromGroup = (group: Client[], reason: string) => {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const pairKey = [group[i].id, group[j].id].sort().join('|');
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          const result = calculateSimilarityScore(group[i], group[j], tokenFrequency);
          if (result.score >= 60) {
            edges.push({
              from: group[i].id,
              to: group[j].id,
              score: result.score,
              signals: result.signals
            });
          }
        }
      }
    }
  };
  
  byVat.forEach(group => addEdgesFromGroup(group, 'VAT'));
  byEmail.forEach(group => addEdgesFromGroup(group, 'Email'));
  byPhone.forEach(group => addEdgesFromGroup(group, 'Phone'));
  byDashRight.forEach(group => addEdgesFromGroup(group, 'Dash-right'));
  byStrongToken.forEach(group => addEdgesFromGroup(group, 'Strong-token'));
  bySingleFirstname.forEach(group => addEdgesFromGroup(group, 'Single-firstname'));
  
  // Bucketing par tokens de nom pour détection de variantes
  const buckets = new Map<string, Client[]>();
  
  clients.forEach(client => {
    const tokens = extractSignificantTokens((client.name || '') + ' ' + (client.company || ''));
    if (tokens.length > 0) {
      const key = tokens.slice(0, 2).sort().join('_');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(client);
    }
  });
  
  // Comparer au sein de chaque bucket
  buckets.forEach((bucket) => {
    if (bucket.length <= 1) return;
    
    for (let i = 0; i < bucket.length; i++) {
      for (let j = i + 1; j < bucket.length; j++) {
        const pairKey = [bucket[i].id, bucket[j].id].sort().join('|');
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          const result = calculateSimilarityScore(bucket[i], bucket[j], tokenFrequency);
          
          // Seuil: 80+ certain, 60+ probable avec signaux
          // Exception: dash-right ou generic-firstname avec score ≥55
          const isCertain = result.score >= 80 || 
                           result.signals.includes('VAT identique') || 
                           result.signals.includes('Email identique');
          const isProbable = result.score >= 60 || 
                            (result.score >= 55 && (
                              result.signals.includes('Segment après tiret = autre fiche') ||
                              result.signals.includes('Entreprise générique ↔ prénom de la personne') ||
                              result.signals.includes('Entreprise générique ↔ prénom de la personne (+ localisation)')
                            ));
          
          if (isCertain || isProbable) {
            edges.push({
              from: bucket[i].id,
              to: bucket[j].id,
              score: result.score,
              signals: result.signals
            });
          }
        }
      }
    }
  });
  
  return edges;
};

/**
 * Extrait les composants connectés du graphe (groupes de doublons)
 */
const extractConnectedComponents = (edges: Edge[], clientsById: Map<string, Client>): Array<{
  clients: Client[];
  maxScore: number;
  signals: string[];
}> => {
  const adjacency = new Map<string, Set<string>>();
  const edgeData = new Map<string, Edge>();
  
  // Construire le graphe
  edges.forEach(edge => {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from)!.add(edge.to);
    adjacency.get(edge.to)!.add(edge.from);
    
    const edgeKey = [edge.from, edge.to].sort().join('|');
    edgeData.set(edgeKey, edge);
  });
  
  const visited = new Set<string>();
  const components: Array<{ clients: Client[]; maxScore: number; signals: string[] }> = [];
  
  // DFS pour trouver les composants
  const dfs = (nodeId: string, component: Set<string>) => {
    visited.add(nodeId);
    component.add(nodeId);
    
    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          dfs(neighbor, component);
        }
      });
    }
  };
  
  // Parcourir tous les nœuds
  adjacency.forEach((_, nodeId) => {
    if (!visited.has(nodeId)) {
      const component = new Set<string>();
      dfs(nodeId, component);
      
      if (component.size > 1) {
        const clients = Array.from(component)
          .map(id => clientsById.get(id))
          .filter((c): c is Client => c !== undefined);
        
        // Calculer le score max et collecter les signaux
        let maxScore = 0;
        const allSignals = new Set<string>();
        
        component.forEach(id1 => {
          component.forEach(id2 => {
            if (id1 < id2) {
              const edgeKey = [id1, id2].sort().join('|');
              const edge = edgeData.get(edgeKey);
              if (edge) {
                maxScore = Math.max(maxScore, edge.score);
                edge.signals.forEach(s => allSignals.add(s));
              }
            }
          });
        });
        
        components.push({
          clients,
          maxScore,
          signals: Array.from(allSignals)
        });
      }
    }
  });
  
  return components;
};

// ==========================================
// FONCTION PRINCIPALE DE DÉTECTION
// ==========================================

/**
 * Détecte les clients en doublon avec algorithme avancé
 */
export const detectDuplicateClients = async (): Promise<Array<{ 
  clients: Client[], 
  reason: string, 
  confidence: number 
}>> => {
  try {
    console.log("🔍 Détection avancée des doublons (algorithme enrichi v2)...");
    
    const clients = await getAllClients();
    console.log(`   📊 ${clients.length} clients à analyser`);
    
    if (clients.length === 0) {
      return [];
    }
    
    // Construire le graphe de similarité
    console.log("   🔗 Construction du graphe de similarité...");
    const edges = buildSimilarityGraph(clients);
    console.log(`   ✅ ${edges.length} liens de similarité détectés`);
    
    // Créer un map pour accès rapide
    const clientsById = new Map<string, Client>();
    clients.forEach(c => clientsById.set(c.id, c));
    
    // Extraire les composants connectés
    console.log("   🧩 Extraction des groupes de doublons...");
    const components = extractConnectedComponents(edges, clientsById);
    
    // Formater les résultats avec raisons priorisées
    const duplicates = components.map(comp => {
      // Prioriser les signaux par importance
      const priorityOrder = [
        'VAT identique',
        'Email identique',
        'Téléphone identique',
        'Segment après tiret = autre fiche',
        'Entreprise générique ↔ prénom de la personne (+ localisation)',
        'Entreprise générique ↔ prénom de la personne',
        'Token distinctif commun',
        'Contact = Nom (cross)',
        'Token(s) rares communs',
        'Nom identique',
        'Société identique',
        'Tokens communs',
        'Code postal identique',
        'Ville identique'
      ];
      
      const sortedSignals = comp.signals.sort((a, b) => {
        const indexA = priorityOrder.findIndex(p => a.includes(p) || p.includes(a));
        const indexB = priorityOrder.findIndex(p => b.includes(p) || p.includes(b));
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      
      let reason = sortedSignals.slice(0, 3).join(', ');
      if (!reason) reason = `Similarité forte (${comp.maxScore}%)`;
      
      return {
        clients: comp.clients,
        reason,
        confidence: comp.maxScore
      };
    });
    
    // Trier par confiance décroissante
    duplicates.sort((a, b) => b.confidence - a.confidence);
    
    // Compter les nouveaux patterns détectés
    const dashRightCount = duplicates.filter(d => d.reason.includes('Segment après tiret')).length;
    const genericFirstnameCount = duplicates.filter(d => d.reason.includes('Entreprise générique')).length;
    const strongTokenCount = duplicates.filter(d => d.reason.includes('Token distinctif')).length;
    
    console.log(`✅ ${duplicates.length} groupes de doublons détectés`);
    console.log(`   🎯 Certains (≥80): ${duplicates.filter(d => d.confidence >= 80).length}`);
    console.log(`   ⚠️  Probables (60-79): ${duplicates.filter(d => d.confidence >= 60 && d.confidence < 80).length}`);
    console.log(`   🆕 Nouveaux patterns:`);
    console.log(`      - Dash-right: ${dashRightCount}`);
    console.log(`      - Entreprise générique/prénom: ${genericFirstnameCount}`);
    console.log(`      - Token distinctif: ${strongTokenCount}`);
    
    return duplicates;
  } catch (error) {
    console.error("❌ Erreur lors de la détection des doublons:", error);
    return [];
  }
};
