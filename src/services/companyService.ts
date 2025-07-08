
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
  console.log('Création directe de l\'entreprise côté client:', params);
  
  try {
    // Étape 1: Créer l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.adminEmail,
      password: params.adminPassword,
      options: {
        data: {
          first_name: params.adminFirstName,
          last_name: params.adminLastName,
          role: 'admin'
        }
      }
    });

    if (authError) {
      console.error('Erreur lors de la création de l\'utilisateur:', authError);
      throw new Error(`Erreur d'authentification: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Erreur lors de la création de l\'utilisateur');
    }

    console.log('Utilisateur créé avec succès:', authData.user.id);

    // Étape 2: Créer le profil utilisateur manuellement
    const { error: profileCreationError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        first_name: params.adminFirstName,
        last_name: params.adminLastName,
        role: 'admin',
        company_id: null // Sera mis à jour après création de l'entreprise
      }]);

    if (profileCreationError) {
      console.warn('Erreur lors de la création du profil:', profileCreationError);
      // Ne pas faire échouer le processus si la création du profil échoue
    }

    // Étape 3: Créer l'entreprise
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: params.companyName,
        plan: params.plan,
        account_status: 'trial',
        trial_starts_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        modules_enabled: params.selectedModules
      }])
      .select()
      .single();

    if (companyError) {
      console.error('Erreur lors de la création de l\'entreprise:', companyError);
      throw new Error(`Erreur lors de la création de l'entreprise: ${companyError.message}`);
    }

    console.log('Entreprise créée avec succès:', companyData.id);

    // Étape 4: Mettre à jour le profil utilisateur avec l'ID de l'entreprise
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        company_id: companyData.id,
        role: 'admin'
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.warn('Erreur lors de la mise à jour du profil:', profileError);
      // Ne pas faire échouer le processus si la mise à jour du profil échoue
    }

    // Étape 5: Envoyer l'email de bienvenue
    try {
      await supabase.functions.invoke('send-trial-welcome-email', {
        body: {
          type: 'welcome',
          companyName: params.companyName,
          adminEmail: params.adminEmail,
          adminFirstName: params.adminFirstName,
          adminLastName: params.adminLastName
        }
      });
      console.log('Email de bienvenue envoyé avec succès');
    } catch (emailError) {
      console.warn('Erreur lors de l\'envoi de l\'email de bienvenue:', emailError);
      // Ne pas faire échouer le processus si l'email n'est pas envoyé
    }

    return {
      success: true,
      companyId: companyData.id,
      userId: authData.user.id,
      needsEmailConfirmation: false
    };

  } catch (error) {
    console.error('Erreur lors de la création de l\'entreprise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};
