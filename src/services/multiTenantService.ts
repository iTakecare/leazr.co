
import { supabase } from "@/integrations/supabase/client";

/**
 * Service utilitaire pour gérer l'architecture multi-tenant
 * Assure automatiquement l'ajout du company_id dans toutes les opérations
 */

// Types pour les données avec company_id
export interface WithCompanyId {
  company_id: string;
}

export type CreateDataWithCompany<T> = T & WithCompanyId;

/**
 * Récupère le company_id de l'utilisateur connecté en utilisant la fonction sécurisée
 */
export const getCurrentUserCompanyId = async (): Promise<string> => {
  console.log("🏢 SERVICE - Début getCurrentUserCompanyId");
  
  // SÉCURITÉ: Validation stricte de la session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log("🏢 SERVICE - Session vérifiée:", !!session);
  
  if (sessionError) {
    console.error("🏢 SERVICE - Erreur récupération session:", sessionError);
    throw new Error("Erreur lors de la vérification de la session");
  }
  
  if (!session?.user?.id) {
    console.error("🏢 SERVICE - Session ou utilisateur invalide");
    throw new Error("Aucune session active. Veuillez vous connecter.");
  }

  const user = session.user;
  console.log("🏢 SERVICE - Utilisateur de la session:", user.id);

  // SÉCURITÉ: Validation avec retry et fallback
  let profileData = null;
  let error = null;
  
  try {
    console.log("🏢 SERVICE - Appel de get_current_user_profile RPC");
    const result = await supabase.rpc('get_current_user_profile');
    profileData = result.data;
    error = result.error;
    
    console.log("🏢 SERVICE - Résultat RPC:", { profileData, error });
    
    // SÉCURITÉ: Validation approfondie de la réponse
    if (error) {
      console.error("🏢 SERVICE - Erreur RPC:", error);
      throw new Error(`Erreur RPC: ${error.message}`);
    }
    
    if (!profileData || !Array.isArray(profileData) || profileData.length === 0) {
      console.error("🏢 SERVICE - Données de profil vides ou invalides");
      throw new Error("Profil utilisateur introuvable");
    }
    
    // SÉCURITÉ: Validation stricte du company_id
    const companyId = profileData[0]?.company_id;
    
    if (!companyId || typeof companyId !== 'string') {
      console.error("🏢 SERVICE - company_id manquant ou invalide:", companyId);
      throw new Error("Aucune entreprise associée à cet utilisateur");
    }
    
    // SÉCURITÉ: Validation du format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      console.error("🏢 SERVICE - Format company_id invalide:", companyId);
      throw new Error("Format d'entreprise invalide");
    }

    console.log("🏢 SERVICE - CompanyId validé:", companyId);
    return companyId;
    
  } catch (rpcError) {
    console.error("🏢 SERVICE - Erreur lors de l'appel RPC:", rpcError);
    
    // SÉCURITÉ: Fallback avec validation directe du profil
    try {
      console.log("🏢 SERVICE - Tentative de fallback avec requête directe");
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (fallbackError || !fallbackProfile?.company_id) {
        throw new Error("Impossible de récupérer l'entreprise de l'utilisateur");
      }
      
      console.log("🏢 SERVICE - CompanyId de fallback:", fallbackProfile.company_id);
      return fallbackProfile.company_id;
      
    } catch (fallbackError) {
      console.error("🏢 SERVICE - Échec du fallback:", fallbackError);
      throw new Error("Impossible de déterminer l'entreprise de l'utilisateur");
    }
  }
};

/**
 * Ajoute automatiquement le company_id aux données à créer
 */
export const withCompanyId = async <T>(data: T): Promise<CreateDataWithCompany<T>> => {
  const company_id = await getCurrentUserCompanyId();
  
  return {
    ...data,
    company_id
  };
};

/**
 * Fonction helper pour créer des éléments avec company_id automatique
 */
export const createWithCompanyId = async <T>(
  tableName: string,
  data: T
): Promise<CreateDataWithCompany<T>> => {
  const dataWithCompanyId = await withCompanyId(data);
  
  const { data: created, error } = await supabase
    .from(tableName)
    .insert([dataWithCompanyId])
    .select()
    .single();

  if (error) {
    console.error(`Error creating ${tableName}:`, error);
    throw error;
  }

  return created;
};

/**
 * Fonction helper pour les requêtes filtrées par company
 */
export const queryWithCompanyFilter = (tableName: string) => {
  return supabase
    .from(tableName)
    .select("*");
  // Le filtrage par company_id est automatique grâce aux politiques RLS
};

/**
 * Vérifie si l'utilisateur actuel a accès à une ressource d'une entreprise donnée
 */
export const hasCompanyAccess = async (resourceCompanyId: string): Promise<boolean> => {
  try {
    const userCompanyId = await getCurrentUserCompanyId();
    return userCompanyId === resourceCompanyId;
  } catch {
    return false;
  }
};

/**
 * Service de création spécialisé pour chaque entité
 */
export const multiTenantServices = {
  clients: {
    create: (data: any) => createWithCompanyId("clients", data),
    query: () => queryWithCompanyFilter("clients")
  },
  
  products: {
    create: (data: any) => createWithCompanyId("products", data),
    query: () => queryWithCompanyFilter("products")
  },
  
  offers: {
    create: (data: any) => createWithCompanyId("offers", data),
    query: () => queryWithCompanyFilter("offers")
  },
  
  contracts: {
    create: (data: any) => createWithCompanyId("contracts", data),
    query: () => queryWithCompanyFilter("contracts")
  },
  
  ambassadors: {
    create: (data: any) => createWithCompanyId("ambassadors", data),
    query: () => queryWithCompanyFilter("ambassadors")
  },
  
  partners: {
    create: (data: any) => createWithCompanyId("partners", data),
    query: () => queryWithCompanyFilter("partners")
  },
  
  leasers: {
    create: (data: any) => createWithCompanyId("leasers", data),
    query: () => queryWithCompanyFilter("leasers")
  }
};
