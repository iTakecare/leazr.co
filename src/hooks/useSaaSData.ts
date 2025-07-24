import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaaSMetrics {
  totalClients: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  supportTickets: number;
  churnRate: number;
  newClientsThisMonth: number;
  openTickets: number;
  avgResponseTime: number;
  satisfactionRate: number;
  conversionRate: number;
}

export interface CompanyData {
  id: string;
  name: string;
  plan: string;
  account_status: string;
  created_at: string;
  trial_ends_at?: string;
  subscription_ends_at?: string;
  modules_enabled?: string[];
  profile?: {
    first_name: string;
    last_name: string;
    role: string;
  };
}

export interface SupportTicket {
  id: string;
  company_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'general' | 'technical' | 'billing' | 'feature_request';
  created_by_email: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  company?: {
    name: string;
  };
}

export interface ModuleData {
  id: string;
  slug: string;
  name: string;
  description?: string;
  is_core: boolean;
  price?: number;
  features?: string[];
  category?: string;
}

export const useSaaSData = () => {
  const [metrics, setMetrics] = useState<SaaSMetrics>({
    totalClients: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    supportTickets: 0,
    churnRate: 0,
    newClientsThisMonth: 0,
    openTickets: 0,
    avgResponseTime: 0,
    satisfactionRate: 0,
    conversionRate: 0
  });
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaaSData = async () => {
      try {
        // Récupérer les entreprises avec leurs profils admin
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            plan,
            account_status,
            created_at,
            trial_ends_at,
            subscription_ends_at,
            modules_enabled,
            profiles!inner(
              first_name,
              last_name,
              role
            )
          `)
          .eq('profiles.role', 'admin')
          .order('created_at', { ascending: false });

        // Récupérer les données prospects pour avoir les vraies dates d'essai
        const { data: prospectsData } = await supabase
          .from('prospects')
          .select('email, trial_ends_at, company as company_name')
          .in('status', ['active', 'converted']);

        if (companiesError) {
          console.error('Erreur lors de la récupération des entreprises:', companiesError);
        } else if (companiesData) {
          // Créer un map des prospects par nom d'entreprise pour récupérer les vraies dates d'essai
          const prospectsMap = new Map();
          if (prospectsData) {
            prospectsData.forEach(prospect => {
              if (prospect.company_name) {
                prospectsMap.set(prospect.company_name, prospect);
              }
            });
          }

          const formattedCompanies = companiesData.map(company => {
            const prospect = prospectsMap.get(company.name);
            return {
              ...company,
              profile: Array.isArray(company.profiles) ? company.profiles[0] : company.profiles,
              // Utiliser la date d'essai du prospect si disponible, sinon celle de l'entreprise
              trial_ends_at: prospect?.trial_ends_at || company.trial_ends_at
            };
          });
          setCompanies(formattedCompanies);
        }

        // Calculer les métriques
        const totalCompanies = companiesData?.length || 0;
        const activeCompanies = companiesData?.filter(c => c.account_status === 'active').length || 0;
        const trialCompanies = companiesData?.filter(c => c.account_status === 'trial').length || 0;
        
        // Calculer le revenu mensuel basé sur les plans
        const planPrices = { starter: 49, pro: 149, business: 299 };
        const monthlyRevenue = companiesData?.reduce((total, company) => {
          if (company.account_status === 'active') {
            return total + (planPrices[company.plan as keyof typeof planPrices] || 0);
          }
          return total;
        }, 0) || 0;

        // Calculer les nouveaux clients ce mois
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newThisMonth = companiesData?.filter(company => {
          const createdDate = new Date(company.created_at);
          return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        }).length || 0;

        // Données simulées pour les tickets de support (table n'existe pas encore)
        const openTickets = Math.floor(Math.random() * 5) + 1; // 1-5 tickets ouverts
        const totalTickets = Math.floor(Math.random() * 20) + 5; // 5-25 tickets au total
        const avgResponseTime = Math.floor(Math.random() * 24) + 2; // 2-26 heures

        // Calculer le taux de churn
        const churnRate = totalCompanies > 0 ? ((totalCompanies - activeCompanies) / totalCompanies * 100) : 0;
        
        // Calculer le taux de conversion (essai vers abonnement)
        const conversionRate = (trialCompanies + activeCompanies) > 0 ? 
          (activeCompanies / (trialCompanies + activeCompanies)) * 100 : 0;

        setMetrics({
          totalClients: totalCompanies,
          activeSubscriptions: activeCompanies,
          monthlyRevenue,
          supportTickets: totalTickets,
          churnRate: Math.round(churnRate * 10) / 10,
          newClientsThisMonth: newThisMonth,
          openTickets,
          avgResponseTime: Math.round(avgResponseTime),
          satisfactionRate: 4.8, // Simulé pour le moment
          conversionRate: Math.round(conversionRate * 10) / 10
        });

      } catch (error) {
        console.error('Erreur lors de la récupération des données SaaS:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSaaSData();
  }, []);

  return { metrics, companies, loading };
};

export const useSupportTickets = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Données simulées temporaires (table support_tickets n'existe pas encore)
    const simulatedTickets: SupportTicket[] = [
      {
        id: '1',
        company_id: 'demo-1',
        title: 'Problème de connexion',
        description: 'Impossible de se connecter au dashboard',
        status: 'open',
        priority: 'high',
        category: 'technical',
        created_by_email: 'client@demo.com',
        created_by_name: 'Client Demo',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company: { name: 'Demo Company' }
      },
      {
        id: '2',
        company_id: 'demo-2',
        title: 'Question sur la facturation',
        description: 'Clarification nécessaire sur la facture',
        status: 'in_progress',
        priority: 'medium',
        category: 'billing',
        created_by_email: 'admin@demo2.com',
        created_by_name: 'Admin Demo2',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
        company: { name: 'Demo Company 2' }
      }
    ];

    setTimeout(() => {
      setTickets(simulatedTickets);
      setLoading(false);
    }, 500);
  }, []);

  return { tickets, loading };
};

export const useModules = () => {
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Données simulées temporaires (table modules n'existe pas encore)
    const simulatedModules: ModuleData[] = [
      {
        id: '1',
        slug: 'leasing',
        name: 'Module Leasing',
        description: 'Gestion complète des contrats de leasing',
        is_core: true,
        price: 49,
        features: ['Contrats', 'Facturation', 'Suivi'],
        category: 'core'
      },
      {
        id: '2',
        slug: 'crm',
        name: 'Module CRM',
        description: 'Gestion de la relation client',
        is_core: false,
        price: 29,
        features: ['Contacts', 'Historique', 'Rappels'],
        category: 'addon'
      },
      {
        id: '3',
        slug: 'analytics',
        name: 'Module Analytics',
        description: 'Analyses et rapports avancés',
        is_core: false,
        price: 39,
        features: ['Tableaux de bord', 'Rapports', 'Exports'],
        category: 'addon'
      }
    ];

    setTimeout(() => {
      setModules(simulatedModules);
      setLoading(false);
    }, 300);
  }, []);

  return { modules, loading };
};

export const useRecentActivity = () => {
  const [activity, setActivity] = useState<any[]>([]);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        // Récupérer l'activité récente (nouvelles entreprises, nouveaux utilisateurs, etc.)
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, created_at, account_status')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          const formattedActivity = data.map(company => ({
            type: company.account_status === 'trial' ? 'trial' : 'subscription',
            message: company.account_status === 'trial' 
              ? `Nouvel essai - ${company.name}` 
              : `Nouvel abonnement - ${company.name}`,
            time: new Date(company.created_at).toLocaleDateString('fr-FR'),
            status: company.account_status === 'active' ? 'success' : 'info'
          }));
          setActivity(formattedActivity);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de l\'activité:', error);
      }
    };

    fetchActivity();
  }, []);

  return activity;
};