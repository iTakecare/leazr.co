
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Company {
  id: string;
  name: string;
  logo_url?: string;
  plan: 'starter' | 'pro' | 'business' | 'custom';
  modules_enabled: string[];
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  is_active: boolean;
  trial_ends_at?: string;
  subscription_ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price_starter: number;
  price_pro: number;
  price_business: number;
  is_core: boolean;
}

export interface PlanConfig {
  name: string;
  price: number;
  description: string;
  features: string[];
  modules_limit: number;
  users_limit: number;
  popular?: boolean;
}

export const PLANS: Record<string, PlanConfig> = {
  starter: {
    name: 'Starter',
    price: 49,
    description: 'Parfait pour débuter',
    features: ['1 module inclus', '1 utilisateur', 'Support email'],
    modules_limit: 1,
    users_limit: 1
  },
  pro: {
    name: 'Pro',
    price: 149,
    description: 'Pour les équipes qui grandissent',
    features: ['Jusqu\'à 3 modules', '5 utilisateurs', 'Support prioritaire', 'Intégrations avancées'],
    modules_limit: 3,
    users_limit: 5,
    popular: true
  },
  business: {
    name: 'Business',
    price: 299,
    description: 'Pour les grandes organisations',
    features: ['Tous les modules', '10 utilisateurs', 'Support dédié', 'Personnalisation avancée'],
    modules_limit: -1,
    users_limit: 10
  }
};

/**
 * Récupère tous les modules disponibles
 */
export const getAvailableModules = async (): Promise<Module[]> => {
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('is_core', { ascending: false })
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error);
    return [];
  }
};

/**
 * Crée une nouvelle entreprise avec son administrateur
 */
export const createCompanyWithAdmin = async (companyData: {
  companyName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  plan: string;
  selectedModules: string[];
}): Promise<{ success: boolean; companyId?: string; error?: string }> => {
  try {
    console.log('Création de l\'entreprise:', companyData);

    // Appeler la fonction de création d'entreprise
    const { data, error } = await supabase.rpc('create_company_with_admin', {
      company_name: companyData.companyName,
      admin_email: companyData.adminEmail,
      admin_password: companyData.adminPassword,
      admin_first_name: companyData.adminFirstName,
      admin_last_name: companyData.adminLastName,
      plan_type: companyData.plan
    });

    if (error) {
      console.error('Erreur lors de la création de l\'entreprise:', error);
      return { success: false, error: error.message };
    }

    const companyId = data;

    // Activer les modules sélectionnés
    if (companyData.selectedModules.length > 0) {
      await activateModulesForCompany(companyId, companyData.selectedModules);
    }

    toast.success('Entreprise créée avec succès !');
    return { success: true, companyId };

  } catch (error) {
    console.error('Erreur lors de la création de l\'entreprise:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return { success: false, error: errorMessage };
  }
};

/**
 * Active des modules pour une entreprise
 */
export const activateModulesForCompany = async (
  companyId: string, 
  modulesSlugs: string[]
): Promise<boolean> => {
  try {
    // Récupérer les IDs des modules à partir de leurs slugs
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, slug')
      .in('slug', modulesSlugs);

    if (modulesError) throw modulesError;

    // Créer les associations company_modules
    const moduleAssociations = modules?.map(module => ({
      company_id: companyId,
      module_id: module.id,
      enabled: true
    })) || [];

    const { error } = await supabase
      .from('company_modules')
      .insert(moduleAssociations);

    if (error) throw error;

    // Mettre à jour la liste des modules activés dans la table companies
    const { error: updateError } = await supabase
      .from('companies')
      .update({ modules_enabled: modulesSlugs })
      .eq('id', companyId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'activation des modules:', error);
    return false;
  }
};

/**
 * Récupère les informations de l'entreprise de l'utilisateur connecté
 */
export const getCurrentUserCompany = async (): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .single();

    if (error) {
      console.error('Erreur lors de la récupération de l\'entreprise:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'entreprise:', error);
    return null;
  }
};

/**
 * Calcule le prix total en fonction du plan et des modules sélectionnés
 */
export const calculatePrice = (
  plan: string, 
  selectedModules: Module[]
): number => {
  const planConfig = PLANS[plan];
  if (!planConfig) return 0;

  let basePrice = planConfig.price;

  // Pour le plan Business, tous les modules sont inclus
  if (plan === 'business') {
    return basePrice;
  }

  // Pour les autres plans, calculer le prix des modules additionnels
  const additionalModules = selectedModules.filter(module => !module.is_core);
  const additionalPrice = additionalModules.reduce((total, module) => {
    const modulePrice = plan === 'pro' ? module.price_pro : module.price_starter;
    return total + modulePrice;
  }, 0);

  return basePrice + additionalPrice;
};
