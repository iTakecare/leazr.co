
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Module {
  id: string;
  slug: string;
  name: string;
  description?: string;
  is_core: boolean;
  price?: number;
}

export interface Plan {
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
  modules_limit: number;
  users_limit: number;
}

export const PLANS: Record<string, Plan> = {
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
    popular: true,
    modules_limit: 3,
    users_limit: 5
  },
  business: {
    name: 'Business',
    price: 299,
    description: 'Pour les grandes organisations',
    features: ['Tous les modules', '10 utilisateurs', 'Support dédié', 'Personnalisation avancée'],
    modules_limit: -1, // illimité
    users_limit: 10
  }
};

export const getAvailableModules = async (): Promise<Module[]> => {
  console.log('Récupération des modules disponibles...');
  
  try {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('name');
    
    if (error) {
      console.warn('Erreur lors de la récupération des modules:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.warn('Erreur de connexion pour récupérer les modules:', error);
    // Retourner les modules par défaut seulement en cas d'erreur de connexion
    return [
      { id: crypto.randomUUID(), slug: 'calculator', name: 'Calculateur Leasing', is_core: true },
      { id: crypto.randomUUID(), slug: 'catalog', name: 'Catalogue Produits', is_core: true },
      { id: crypto.randomUUID(), slug: 'crm', name: 'CRM Client', is_core: true }
    ];
  }
};

export const calculatePrice = (plan: string, selectedModules: Module[]): number => {
  const basePlan = PLANS[plan as keyof typeof PLANS];
  if (!basePlan) return 0;
  
  let totalPrice = basePlan.price;
  
  // Ajouter le prix des modules additionnels non-core
  selectedModules.forEach(module => {
    if (!module.is_core && module.price) {
      totalPrice += module.price;
    }
  });
  
  return totalPrice;
};

interface CreateCompanyParams {
  companyName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  plan: string;
  selectedModules: string[];
}

export const createCompanyWithAdmin = async (params: CreateCompanyParams) => {
  console.log('Création sécurisée de l\'entreprise via edge function:', params);
  
  try {
    // Utiliser l'edge function sécurisée pour créer l'utilisateur et l'entreprise
    const { data, error } = await supabase.functions.invoke('create-company-with-admin', {
      body: {
        companyName: params.companyName,
        adminEmail: params.adminEmail,
        adminPassword: params.adminPassword,
        adminFirstName: params.adminFirstName,
        adminLastName: params.adminLastName,
        plan: params.plan,
        selectedModules: params.selectedModules
      }
    });

    if (error) {
      console.error('Erreur lors de l\'appel à l\'edge function:', error);
      throw new Error(`Erreur lors de la création: ${error.message}`);
    }

    if (!data || !data.success) {
      console.error('Échec de la création:', data);
      throw new Error(data?.error || 'Erreur lors de la création de l\'entreprise');
    }

    console.log('Entreprise créée avec succès via edge function:', data);

    return {
      success: true,
      companyId: data.companyId,
      userId: data.userId,
      needsEmailConfirmation: false // L'email est confirmé automatiquement
    };

  } catch (error) {
    console.error('Erreur lors de la création de l\'entreprise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};
