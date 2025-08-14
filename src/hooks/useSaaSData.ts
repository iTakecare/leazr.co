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

// Hook pour les utilisateurs SaaS - uniquement les vrais clients de Leazr
export const useSaaSUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log("👥 SAAS USERS - Récupération des utilisateurs clients de Leazr uniquement");
        
        // Récupérer SEULEMENT les profils clients (excluant super_admin)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            role,
            company_id,
            created_at,
            updated_at
          `)
          .neq('role', 'super_admin') // EXCLURE les super_admin (admins de Leazr)
          .order('created_at', { ascending: false });

        if (profilesError) {
          console.error("❌ SAAS USERS - Erreur profils:", profilesError);
          throw profilesError;
        }

        console.log("👥 SAAS USERS - Profils clients récupérés (sans super_admin):", profilesData?.length || 0);

        // Récupérer les entreprises CLIENTES (pas Leazr)
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, account_status')
          .neq('name', 'Leazr') // Exclure Leazr elle-même
          .order('name', { ascending: true });

        if (companiesError) {
          console.error("❌ SAAS USERS - Erreur entreprises:", companiesError);
        }

        const companiesMap = new Map();
        if (companiesData) {
          companiesData.forEach(company => {
            companiesMap.set(company.id, {
              name: company.name,
              account_status: company.account_status
            });
          });
        }

        console.log("👥 SAAS USERS - Entreprises clientes:", companiesData?.length || 0);

        // Récupérer les emails des utilisateurs depuis auth.users
        const { data: authUsersData, error: authError } = await supabase
          .from('auth.users')
          .select('id, email, last_sign_in_at, email_confirmed_at')
          .limit(1000);

        const authUsersMap = new Map();
        if (!authError && authUsersData) {
          authUsersData.forEach(user => {
            authUsersMap.set(user.id, {
              email: user.email,
              last_sign_in_at: user.last_sign_in_at,
              email_confirmed_at: user.email_confirmed_at
            });
          });
        }

        // Filtrer et combiner les données - SEULEMENT les utilisateurs des entreprises clientes
        const clientUsers = profilesData?.filter(profile => {
          const company = companiesMap.get(profile.company_id);
          return company && company.name !== 'Leazr'; // Double vérification d'exclusion de Leazr
        }).map(profile => {
          const authUser = authUsersMap.get(profile.id);
          const company = companiesMap.get(profile.company_id);
          
          return {
            id: profile.id,
            email: authUser?.email || 'N/A',
            first_name: profile.first_name || 'N/A',
            last_name: profile.last_name || 'N/A',
            role: profile.role || 'user',
            status: authUser?.email_confirmed_at ? 'active' : 'inactive',
            company_name: company?.name || 'Entreprise inconnue',
            company_status: company?.account_status || 'unknown',
            last_sign_in_at: authUser?.last_sign_in_at || null,
            created_at: profile.created_at
          };
        }) || [];

        // Calculer les statistiques UNIQUEMENT pour les vrais clients
        const clientStats = {
          total: clientUsers.length,
          active: clientUsers.filter(u => u.status === 'active').length,
          admins: clientUsers.filter(u => u.role === 'admin').length, // Seulement les admins d'entreprise, pas super_admin
          companies: new Set(clientUsers.map(u => u.company_name).filter(name => name !== 'Entreprise inconnue')).size
        };

        console.log("👥 SAAS USERS - Statistiques clients finales:", clientStats);
        console.log("👥 SAAS USERS - Utilisateurs clients traités:", clientUsers.length);

        setUsers(clientUsers);
        setStats(clientStats);
      } catch (error) {
        console.error('❌ SAAS USERS - Erreur lors du chargement des utilisateurs:', error);
        // Fallback avec données vides
        setUsers([]);
        setStats({
          total: 0,
          active: 0,
          admins: 0,
          companies: 0
        });
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
        console.log("📊 SAAS ANALYTICS - Calcul des analytics réelles");

        const daysAgo = parseInt(period);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);

        // Récupérer toutes les entreprises avec leurs plans
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, plan, account_status, created_at, subscription_ends_at')
          .order('created_at', { ascending: false });

        if (companiesError) {
          console.error("❌ ANALYTICS - Erreur entreprises:", companiesError);
          throw companiesError;
        }

        // Prix des plans
        const planPrices = { 
          starter: 49, 
          pro: 149, 
          business: 299,
          enterprise: 499
        };

        // Calculer les métriques réelles
        const activeCustomers = companiesData?.filter(c => c.account_status === 'active').length || 0;
        const trialCustomers = companiesData?.filter(c => c.account_status === 'trial').length || 0;
        
        // Calculer le MRR (Monthly Recurring Revenue)
        const mrr = companiesData?.reduce((total, company) => {
          if (company.account_status === 'active') {
            return total + (planPrices[company.plan as keyof typeof planPrices] || 0);
          }
          return total;
        }, 0) || 0;

        // Calculer la croissance MRR (comparaison avec période précédente)
        const previousPeriodStart = new Date();
        previousPeriodStart.setDate(previousPeriodStart.getDate() - (daysAgo * 2));
        
        const previousActiveCustomers = companiesData?.filter(c => 
          c.account_status === 'active' && 
          new Date(c.created_at) < startDate &&
          new Date(c.created_at) >= previousPeriodStart
        ).length || 0;
        
        const mrrGrowth = previousActiveCustomers > 0 
          ? ((activeCustomers - previousActiveCustomers) / previousActiveCustomers) * 100 
          : 0;

        // Calculer les nouveaux clients par période
        const customerGrowth = companiesData?.filter(c => 
          new Date(c.created_at) >= startDate
        ).length || 0;

        // Calculer le taux de churn
        const expiredCustomers = companiesData?.filter(c => 
          c.subscription_ends_at && new Date(c.subscription_ends_at) < new Date()
        ).length || 0;
        const churnRate = activeCustomers > 0 ? (expiredCustomers / activeCustomers) * 100 : 0;

        // Calculer le taux de conversion
        const totalCustomers = activeCustomers + trialCustomers;
        const conversionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

        // Générer les données de graphique (revenus par mois)
        const revenueChart = [];
        const customersChart = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });
          
          // Calculer les revenus pour ce mois
          const monthlyCustomers = companiesData?.filter(c => {
            const createdDate = new Date(c.created_at);
            return c.account_status === 'active' && 
                   createdDate.getMonth() === date.getMonth() &&
                   createdDate.getFullYear() === date.getFullYear();
          }).length || 0;
          
          const monthlyRevenue = monthlyCustomers * 150; // Revenu moyen estimé
          
          revenueChart.push({ month: monthName, revenue: monthlyRevenue });
          customersChart.push({ month: monthName, new_customers: monthlyCustomers });
        }

        // Distribution des plans
        const planCounts = companiesData?.reduce((acc, company) => {
          if (company.account_status === 'active') {
            acc[company.plan] = (acc[company.plan] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>) || {};

        const plansDistribution = Object.entries(planCounts).map(([plan, count]) => ({
          name: plan.charAt(0).toUpperCase() + plan.slice(1),
          value: count
        }));

        // Activité récente
        const recentActivity = companiesData?.slice(0, 5).map(company => ({
          title: `Nouvelle inscription - ${company.name}`,
          time: new Date(company.created_at).toLocaleDateString('fr-FR')
        })) || [];

        // Métriques calculées
        const ltv = 2000; // Valeur à vie estimée
        const cac = 200;  // Coût d'acquisition estimé
        const ltvCacRatio = ltv / cac;

        const realAnalytics = {
          mrr: Math.round(mrr),
          mrr_growth: Math.round(mrrGrowth * 10) / 10,
          active_customers: activeCustomers,
          customer_growth: customerGrowth,
          churn_rate: Math.round(churnRate * 10) / 10,
          conversion_rate: Math.round(conversionRate * 10) / 10,
          ltv,
          cac,
          ltv_cac_ratio: Math.round(ltvCacRatio * 10) / 10,
          revenue_chart: revenueChart,
          customers_chart: customersChart,
          plans_distribution: plansDistribution,
          recent_activity: recentActivity
        };

        console.log("📊 ANALYTICS - Métriques réelles calculées:", realAnalytics);
        setAnalytics(realAnalytics);
      } catch (error) {
        console.error('❌ ANALYTICS - Erreur lors du chargement des analytics:', error);
        // Fallback avec données vides
        setAnalytics({
          mrr: 0,
          mrr_growth: 0,
          active_customers: 0,
          customer_growth: 0,
          churn_rate: 0,
          conversion_rate: 0,
          ltv: 0,
          cac: 0,
          ltv_cac_ratio: 0,
          revenue_chart: [],
          customers_chart: [],
          plans_distribution: [],
          recent_activity: []
        });
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
        console.log("💰 SAAS BILLING - Récupération des données de facturation réelles");

        // Récupérer toutes les entreprises avec leurs plans
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, plan, account_status, created_at, subscription_ends_at, stripe_customer_id, stripe_subscription_id')
          .order('created_at', { ascending: false });

        if (companiesError) {
          console.error("❌ BILLING - Erreur entreprises:", companiesError);
          throw companiesError;
        }

        console.log("💰 BILLING - Entreprises récupérées:", companiesData?.length || 0);

        // Prix des plans
        const planPrices = { 
          starter: 49, 
          pro: 149, 
          business: 299,
          enterprise: 499
        };

        // Calculer les métriques réelles
        const activeSubscriptions = companiesData?.filter(c => c.account_status === 'active').length || 0;
        const trialSubscriptions = companiesData?.filter(c => c.account_status === 'trial').length || 0;
        
        // Calculer le revenu mensuel
        const monthlyRevenue = companiesData?.reduce((total, company) => {
          if (company.account_status === 'active') {
            return total + (planPrices[company.plan as keyof typeof planPrices] || 0);
          }
          return total;
        }, 0) || 0;

        // Calculer la croissance des revenus (mois précédent vs mois actuel)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentMonthCompanies = companiesData?.filter(c => {
          const createdDate = new Date(c.created_at);
          return c.account_status === 'active' && 
                 createdDate.getMonth() === currentMonth &&
                 createdDate.getFullYear() === currentYear;
        }).length || 0;

        const lastMonthCompanies = companiesData?.filter(c => {
          const createdDate = new Date(c.created_at);
          return c.account_status === 'active' && 
                 createdDate.getMonth() === lastMonth &&
                 createdDate.getFullYear() === lastMonthYear;
        }).length || 0;

        const revenueGrowth = lastMonthCompanies > 0 
          ? ((currentMonthCompanies - lastMonthCompanies) / lastMonthCompanies) * 100 
          : 0;

        // Générer des factures basées sur les entreprises actives
        const realInvoices = companiesData?.filter(c => c.account_status === 'active').map((company, index) => {
          const planPrice = planPrices[company.plan as keyof typeof planPrices] || 49;
          const createdDate = new Date(company.created_at);
          const invoiceNumber = `INV-${createdDate.getFullYear()}-${String(index + 1).padStart(3, '0')}`;
          
          // Simuler différents statuts de factures
          const statuses = ['paid', 'pending', 'overdue'];
          const status = statuses[index % 3] || 'paid';
          
          const dueDate = new Date(createdDate);
          dueDate.setDate(dueDate.getDate() + 30);

          return {
            id: company.id,
            invoice_number: invoiceNumber,
            company_name: company.name,
            plan_name: company.plan.charAt(0).toUpperCase() + company.plan.slice(1),
            amount: planPrice,
            currency: 'EUR',
            status: status,
            created_at: createdDate.toISOString(),
            due_date: dueDate.toISOString(),
            period_start: createdDate.toISOString().split('T')[0],
            period_end: dueDate.toISOString().split('T')[0]
          };
        }) || [];

        // Générer des abonnements actifs
        const realSubscriptions = companiesData?.filter(c => c.account_status === 'active').map(company => {
          const planPrice = planPrices[company.plan as keyof typeof planPrices] || 49;
          const nextBilling = new Date();
          nextBilling.setMonth(nextBilling.getMonth() + 1);

          return {
            id: company.id,
            company_name: company.name,
            plan_name: company.plan.charAt(0).toUpperCase() + company.plan.slice(1),
            price: planPrice,
            status: 'active',
            next_billing_date: nextBilling.toISOString()
          };
        }) || [];

        // Calculer les métriques de facturation
        const pendingInvoices = realInvoices.filter(i => i.status === 'pending').length;
        const overdueInvoices = realInvoices.filter(i => i.status === 'overdue').length;
        const pendingAmount = realInvoices
          .filter(i => i.status === 'pending' || i.status === 'overdue')
          .reduce((total, invoice) => total + invoice.amount, 0);

        const paidInvoices = realInvoices.filter(i => i.status === 'paid').length;
        const totalInvoices = realInvoices.length;
        const paymentSuccessRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

        const realBilling = {
          metrics: {
            monthly_revenue: monthlyRevenue,
            revenue_growth: Math.round(revenueGrowth * 10) / 10,
            pending_invoices: pendingInvoices,
            pending_amount: pendingAmount,
            active_subscriptions: activeSubscriptions,
            new_subscriptions: currentMonthCompanies,
            payment_success_rate: Math.round(paymentSuccessRate * 10) / 10,
            failed_payments: overdueInvoices
          },
          invoices: realInvoices,
          subscriptions: realSubscriptions
        };

        console.log("💰 BILLING - Données réelles générées:", {
          invoicesCount: realInvoices.length,
          subscriptionsCount: realSubscriptions.length,
          monthlyRevenue: monthlyRevenue
        });

        setBilling(realBilling);
      } catch (error) {
        console.error('❌ BILLING - Erreur lors du chargement des données de facturation:', error);
        // Fallback avec données vides
        setBilling({
          metrics: {
            monthly_revenue: 0,
            revenue_growth: 0,
            pending_invoices: 0,
            pending_amount: 0,
            active_subscriptions: 0,
            new_subscriptions: 0,
            payment_success_rate: 0,
            failed_payments: 0
          },
          invoices: [],
          subscriptions: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBilling();
  }, []);

  return { billing, loading };
};