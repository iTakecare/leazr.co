
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
  
  // Vérifier d'abord la session
  const { data: { session } } = await supabase.auth.getSession();
  console.log("🏢 SERVICE - Session vérifiée:", !!session);
  
  if (!session?.user) {
    console.error("🏢 SERVICE - Aucune session active");
    throw new Error("Aucune session active. Veuillez vous connecter.");
  }

  const user = session.user;
  console.log("🏢 SERVICE - Utilisateur de la session:", user.id);

  // Utiliser la nouvelle fonction sécurisée qui évite les récursions
  console.log("🏢 SERVICE - Appel de get_current_user_profile RPC");
  const { data: profileData, error } = await supabase
    .rpc('get_current_user_profile');

  console.log("🏢 SERVICE - Résultat RPC:", { profileData, error });

  if (error) {
    console.error("🏢 SERVICE - Erreur lors de la récupération du profil:", error);
    throw new Error("Impossible de récupérer le profil de l'utilisateur");
  }

  // Récupérer le company_id depuis les données du profil
  const companyId = profileData && profileData.length > 0 ? profileData[0].company_id : null;
  
  if (!companyId) {
    console.error("🏢 SERVICE - Aucun company_id trouvé dans le profil");
    throw new Error("Aucune entreprise associée à cet utilisateur");
  }

  console.log("🏢 SERVICE - CompanyId retourné:", companyId);
  return companyId;
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
