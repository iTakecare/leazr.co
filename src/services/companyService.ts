
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
  console.log('Création de l\'entreprise en mode essai:', params);
  
  try {
    // Étape 1: Créer l'utilisateur admin SANS confirmation automatique
    console.log('Étape 1: Création de l\'utilisateur admin...');
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.adminEmail,
      password: params.adminPassword,
      options: {
        data: {
          first_name: params.adminFirstName,
          last_name: params.adminLastName,
          role: 'admin'
        },
        emailRedirectTo: `${window.location.origin}/trial/activate`
      }
    });

    if (authError) {
      console.error('Erreur lors de la création de l\'utilisateur:', authError);
      throw new Error(`Erreur d'authentification: ${authError.message}`);
    }

    if (!authData.user) {
      console.error('Aucun utilisateur créé');
      throw new Error('Erreur lors de la création de l\'utilisateur');
    }

    console.log('Utilisateur créé avec succès:', authData.user.id);

    // Étape 2: Créer l'entreprise avec statut d'essai INACTIF
    console.log('Étape 2: Création de l\'entreprise...');
    
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{
        name: params.companyName,
        plan: params.plan,
        account_status: 'trial', // En attente d'activation
        trial_starts_at: null, // Sera défini lors de l'activation
        trial_ends_at: null, // Sera calculé lors de l'activation
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (companyError) {
      console.error('Erreur lors de la création de l\'entreprise:', companyError);
      
      // Nettoyer l'utilisateur créé en cas d'erreur
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (cleanupError) {
        console.error('Erreur lors du nettoyage:', cleanupError);
      }
      
      throw new Error(`Erreur lors de la création de l'entreprise: ${companyError.message}`);
    }

    console.log('Entreprise créée avec succès:', companyData.id);

    // Étape 3: Associer les modules sélectionnés
    console.log('Étape 3: Association des modules...');
    
    if (params.selectedModules.length > 0) {
      // Récupérer les IDs des modules par leurs slugs
      const { data: modules, error: modulesQueryError } = await supabase
        .from('modules')
        .select('id, slug')
        .in('slug', params.selectedModules);

      if (modulesQueryError) {
        console.warn('Erreur lors de la récupération des modules:', modulesQueryError);
      } else if (modules && modules.length > 0) {
        const moduleAssociations = modules.map(module => ({
          company_id: companyData.id,
          module_id: module.id,
          enabled: true,
          activated_at: new Date().toISOString()
        }));

        const { error: modulesError } = await supabase
          .from('company_modules')
          .insert(moduleAssociations);

        if (modulesError) {
          console.warn('Erreur lors de l\'association des modules:', modulesError);
          // Ne pas faire échouer la création pour les modules
        } else {
          console.log('Modules associés avec succès');
        }
      }
    }

    // Étape 4: Envoyer l'email de confirmation
    console.log('Étape 4: Envoi de l\'email de confirmation...');
    
    // Stocker les données temporairement pour la page de confirmation
    localStorage.setItem('pendingEmail', params.adminEmail);
    localStorage.setItem('pendingCompanyName', params.companyName);
    localStorage.setItem('pendingFirstName', params.adminFirstName);
    localStorage.setItem('pendingLastName', params.adminLastName);

    try {
      const { error: emailError } = await supabase.functions.invoke('send-trial-welcome-email', {
        body: {
          type: 'confirmation',
          companyName: params.companyName,
          adminEmail: params.adminEmail,
          adminFirstName: params.adminFirstName,
          adminLastName: params.adminLastName,
          companyId: companyData.id
        }
      });

      if (emailError) {
        console.warn('Erreur lors de l\'envoi de l\'email:', emailError);
        // Ne pas faire échouer l'inscription pour l'email
      } else {
        console.log('Email de confirmation envoyé avec succès');
      }
    } catch (emailError) {
      console.warn('Erreur lors de l\'envoi de l\'email:', emailError);
      // Continue même si l'email échoue
    }

    return {
      success: true,
      companyId: companyData.id,
      userId: authData.user.id,
      needsEmailConfirmation: true
    };

  } catch (error) {
    console.error('Erreur lors de la création de l\'entreprise:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};
