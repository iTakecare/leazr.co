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
        console.log("📊 SAAS DATA - Début de la récupération des données SaaS");
        
        // Étape 1: Récupérer toutes les entreprises
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, plan, account_status, created_at, trial_ends_at, subscription_ends_at, modules_enabled')
          .order('created_at', { ascending: false });

        if (companiesError) {
          console.error("❌ SAAS DATA - Erreur lors de la récupération des entreprises:", companiesError);
          // Continuer avec des données par défaut au lieu de bloquer
        }

        console.log("📊 SAAS DATA - Entreprises récupérées:", companiesData?.length || 0);

        // Étape 2: Récupérer les profils admin pour ces entreprises
        let adminProfiles = [];
        if (companiesData && companiesData.length > 0) {
          const companyIds = companiesData.map(c => c.id);
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, company_id, role, first_name, last_name')
            .in('company_id', companyIds)
            .eq('role', 'admin');

          if (profilesError) {
            console.error("❌ SAAS DATA - Erreur lors de la récupération des profils:", profilesError);
          } else {
            adminProfiles = profilesData || [];
          }
        }

        console.log("📊 SAAS DATA - Profils admin récupérés:", adminProfiles.length);

        // Étape 3: Joindre les entreprises avec leurs profils admin (JOIN manuel)
        const companiesWithAdmin = companiesData?.map(company => {
          const adminProfile = adminProfiles.find(profile => profile.company_id === company.id);
          return {
            ...company,
            profile: adminProfile ? {
              first_name: adminProfile.first_name,
              last_name: adminProfile.last_name,
              role: adminProfile.role
            } : undefined
          };
        }).filter(company => company.profile) || []; // Garder seulement les entreprises avec admin

        console.log("📊 SAAS DATA - Entreprises avec admin:", companiesWithAdmin.length);

        // Récupérer les données prospects pour avoir les vraies dates d'essai
        const { data: prospectsData, error: prospectsError } = await supabase
          .from('prospects')
          .select('email, trial_ends_at, company as company_name')
          .in('status', ['active', 'converted']);

        if (prospectsError) {
          console.error("❌ SAAS DATA - Erreur prospects:", prospectsError);
        }

        console.log("📊 SAAS DATA - Prospects récupérés:", prospectsData?.length || 0);

        // Créer un map des prospects par nom d'entreprise pour récupérer les vraies dates d'essai
        const prospectsMap = new Map();
        if (prospectsData) {
          prospectsData.forEach(prospect => {
            if (prospect.company_name) {
              prospectsMap.set(prospect.company_name, prospect);
            }
          });
        }

        const formattedCompanies = companiesWithAdmin.map(company => {
          const prospect = prospectsMap.get(company.name);
          return {
            ...company,
            // Utiliser la date d'essai du prospect si disponible, sinon celle de l'entreprise
            trial_ends_at: prospect?.trial_ends_at || company.trial_ends_at
          };
        });
        
        setCompanies(formattedCompanies);

        // Calculer les métriques avec les entreprises ayant un admin
        const totalCompanies = companiesWithAdmin.length;
        const activeCompanies = companiesWithAdmin.filter(c => c.account_status === 'active').length;
        const trialCompanies = companiesWithAdmin.filter(c => c.account_status === 'trial').length;
        
        // Calculer le revenu mensuel basé sur les plans
        const planPrices = { starter: 49, pro: 149, business: 299 };
        const monthlyRevenue = companiesWithAdmin.reduce((total, company) => {
          if (company.account_status === 'active') {
            return total + (planPrices[company.plan as keyof typeof planPrices] || 0);
          }
          return total;
        }, 0);

        // Calculer les nouveaux clients ce mois
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const newThisMonth = companiesWithAdmin.filter(company => {
          const createdDate = new Date(company.created_at);
          return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear;
        }).length;

        // Données simulées pour les tickets de support (table n'existe pas encore)
        const openTickets = Math.floor(Math.random() * 5) + 1; // 1-5 tickets ouverts
        const totalTickets = Math.floor(Math.random() * 20) + 5; // 5-25 tickets au total
        const avgResponseTime = Math.floor(Math.random() * 24) + 2; // 2-26 heures

        // Calculer le taux de churn
        const churnRate = totalCompanies > 0 ? ((totalCompanies - activeCompanies) / totalCompanies * 100) : 0;
        
        // Calculer le taux de conversion (essai vers abonnement)
        const conversionRate = (trialCompanies + activeCompanies) > 0 ? 
          (activeCompanies / (trialCompanies + activeCompanies)) * 100 : 0;

        const calculatedMetrics = {
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
        };

        console.log("📊 SAAS DATA - Métriques calculées:", calculatedMetrics);

        setMetrics(calculatedMetrics);

      } catch (error) {
        console.error("❌ SAAS DATA - Erreur générale:", error);
        // Définir des métriques par défaut en cas d'erreur
        setMetrics({
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
        setCompanies([]);
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

// Hook pour les utilisateurs SaaS
export const useSaaSUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Simuler des données utilisateurs
        const mockUsers = [
          {
            id: '1',
            email: 'admin@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'super_admin',
            status: 'active',
            company_name: 'iTakecare',
            last_sign_in_at: '2024-01-15T10:30:00Z',
            created_at: '2024-01-01T09:00:00Z'
          },
          {
            id: '2', 
            email: 'client@company.com',
            first_name: 'Jane',
            last_name: 'Smith',
            role: 'admin',
            status: 'active',
            company_name: 'Company ABC',
            last_sign_in_at: '2024-01-14T15:20:00Z',
            created_at: '2024-01-05T11:15:00Z'
          }
        ];

        const mockStats = {
          total: mockUsers.length,
          active: mockUsers.filter(u => u.status === 'active').length,
          admins: mockUsers.filter(u => u.role.includes('admin')).length,
          companies: new Set(mockUsers.map(u => u.company_name)).size
        };

        setUsers(mockUsers);
        setStats(mockStats);
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, stats, loading };
};

// Hook pour les analytics SaaS
export const useSaaSAnalytics = (period: string = "30") => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Simuler des données analytics
        const mockAnalytics = {
          mrr: 25000,
          mrr_growth: 12.5,
          active_customers: 85,
          customer_growth: 8.3,
          churn_rate: 2.1,
          conversion_rate: 15.7,
          ltv: 5000,
          cac: 150,
          ltv_cac_ratio: 33.3,
          revenue_chart: [
            { month: 'Jan', revenue: 20000 },
            { month: 'Fév', revenue: 22000 },
            { month: 'Mar', revenue: 25000 }
          ],
          customers_chart: [
            { month: 'Jan', new_customers: 12 },
            { month: 'Fév', new_customers: 15 },
            { month: 'Mar', new_customers: 18 }
          ],
          plans_distribution: [
            { name: 'Starter', value: 45 },
            { name: 'Pro', value: 30 },
            { name: 'Enterprise', value: 10 }
          ],
          recent_activity: [
            { title: 'Nouvelle inscription - Company XYZ', time: '2h ago' },
            { title: 'Paiement reçu - €499', time: '4h ago' },
            { title: 'Mise à niveau vers Pro - ABC Corp', time: '1d ago' }
          ]
        };

        setAnalytics(mockAnalytics);
      } catch (error) {
        console.error('Erreur lors du chargement des analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  return { analytics, loading };
};

// Hook pour la facturation SaaS
export const useSaaSBilling = () => {
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBilling = async () => {
      try {
        setLoading(true);
        
        // Simuler des données de facturation
        const mockBilling = {
          metrics: {
            monthly_revenue: 28500,
            revenue_growth: 15.2,
            pending_invoices: 3,
            pending_amount: 1200,
            active_subscriptions: 42,
            new_subscriptions: 5,
            payment_success_rate: 96.5,
            failed_payments: 2
          },
          invoices: [
            {
              id: '1',
              invoice_number: 'INV-2024-001',
              company_name: 'ABC Corp',
              plan_name: 'Pro',
              amount: 99,
              currency: 'EUR',
              status: 'paid',
              created_at: '2024-01-01T10:00:00Z',
              due_date: '2024-01-31T23:59:59Z',
              period_start: '2024-01-01',
              period_end: '2024-01-31'
            },
            {
              id: '2',
              invoice_number: 'INV-2024-002',
              company_name: 'XYZ Ltd',
              plan_name: 'Starter',
              amount: 49,
              currency: 'EUR',
              status: 'pending',
              created_at: '2024-01-15T12:30:00Z',
              due_date: '2024-02-15T23:59:59Z',
              period_start: '2024-01-15',
              period_end: '2024-02-15'
            }
          ],
          subscriptions: [
            {
              id: '1',
              company_name: 'ABC Corp',
              plan_name: 'Pro',
              price: 99,
              status: 'active',
              next_billing_date: '2024-02-01T00:00:00Z'
            },
            {
              id: '2',
              company_name: 'XYZ Ltd',
              plan_name: 'Starter',
              price: 49,
              status: 'active',
              next_billing_date: '2024-02-15T00:00:00Z'
            }
          ]
        };

        setBilling(mockBilling);
      } catch (error) {
        console.error('Erreur lors du chargement des données de facturation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  return { billing, loading };
};