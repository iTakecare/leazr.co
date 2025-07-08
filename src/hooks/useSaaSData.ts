import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SaaSMetrics {
  totalClients: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  supportTickets: number;
  churnRate: number;
  newClientsThisMonth: number;
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

export const useSaaSData = () => {
  const [metrics, setMetrics] = useState<SaaSMetrics>({
    totalClients: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    supportTickets: 0,
    churnRate: 0,
    newClientsThisMonth: 0
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

        if (companiesError) {
          console.error('Erreur lors de la récupération des entreprises:', companiesError);
        } else if (companiesData) {
          const formattedCompanies = companiesData.map(company => ({
            ...company,
            profile: Array.isArray(company.profiles) ? company.profiles[0] : company.profiles
          }));
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

        // Calculer le taux de churn (simplifié)
        const churnRate = totalCompanies > 0 ? ((totalCompanies - activeCompanies) / totalCompanies * 100) : 0;

        setMetrics({
          totalClients: totalCompanies,
          activeSubscriptions: activeCompanies,
          monthlyRevenue,
          supportTickets: 0, // À implémenter avec une vraie table de tickets
          churnRate: Math.round(churnRate * 10) / 10,
          newClientsThisMonth: newThisMonth
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