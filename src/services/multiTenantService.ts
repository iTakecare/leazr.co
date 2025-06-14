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
 * Récupère le company_id de l'utilisateur connecté
 */
export const getCurrentUserCompanyId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Utilisateur non authentifié");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (error || !profile?.company_id) {
    console.error("Error fetching user company_id:", error);
    throw new Error("Impossible de récupérer l'ID de l'entreprise de l'utilisateur");
  }

  return profile.company_id;
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