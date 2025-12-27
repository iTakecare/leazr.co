import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';

export interface MonthlyFinancialData {
  month_name: string;
  month_number: number;
  year: number;
  revenue: number;
  purchases: number;
  margin: number;
  margin_percentage: number;
  contracts_count: number;
  offers_count: number;
}

export interface ContractStatistics {
  status: string;
  count: number;
  total_revenue: number;
  total_purchases: number;
  total_margin: number;
}

export interface CompanyDashboardMetrics {
  total_revenue: number;
  total_clients: number;
  total_offers: number;
  total_contracts: number;
  pending_offers: number;
  active_contracts: number;
  recent_signups: number;
  monthly_data?: MonthlyFinancialData[];
  contract_stats?: ContractStatistics[];
}

export interface RecentActivity {
  activity_type: string;
  activity_description: string;
  entity_id: string;
  entity_name: string;
  created_at: string;
  user_name: string;
}

export interface OverdueInvoicesData {
  overdue_count: number;
  overdue_amount: number;
}

/**
 * Hook pour les métriques du dashboard multi-tenant
 */
export const useCompanyDashboard = () => {
  const { companyId, loading: companyLoading } = useMultiTenant();
  const [realTimeMetrics, setRealTimeMetrics] = useState<CompanyDashboardMetrics | null>(null);

  // Récupérer les métriques principales
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useQuery({
    queryKey: ['company-dashboard-metrics', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_dashboard_metrics');

      if (error) throw error;
      return data?.[0] as CompanyDashboardMetrics || null;
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 30000, // Actualisation toutes les 30 secondes
  });

  // Récupérer les données financières mensuelles
  const { 
    data: monthlyData = [], 
    isLoading: monthlyLoading,
    refetch: refetchMonthly
  } = useQuery({
    queryKey: ['company-monthly-data', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_financial_data');

      if (error) throw error;
      return data as MonthlyFinancialData[] || [];
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000, // Actualisation toutes les minutes
  });

  // Récupérer les statistiques par statut
  const { 
    data: contractStats = [], 
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['company-contract-stats', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_contract_statistics_by_status');

      if (error) throw error;
      return data as ContractStatistics[] || [];
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000, // Actualisation toutes les minutes
  });

  // Récupérer l'activité récente
  const { 
    data: recentActivity = [], 
    isLoading: activityLoading,
    refetch: refetchActivity
  } = useQuery({
    queryKey: ['company-recent-activity', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_company_recent_activity');

      if (error) throw error;
      return data as RecentActivity[] || [];
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000, // Actualisation toutes les minutes
  });

  // Récupérer les factures en retard de paiement
  const { 
    data: overdueInvoices, 
    isLoading: overdueLoading,
    refetch: refetchOverdue
  } = useQuery({
    queryKey: ['company-overdue-invoices', companyId],
    queryFn: async () => {
      if (!companyId) return { overdue_count: 0, overdue_amount: 0 };
      
      const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('invoices')
        .select('id, amount')
        .eq('company_id', companyId)
        .neq('status', 'paid')
        .lte('due_date', today);
      
      if (error) throw error;
      
      const count = data?.length || 0;
      const total = data?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
      
      return { overdue_count: count, overdue_amount: total };
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000,
  });

  // Fonction pour rafraîchir toutes les données
  const refetchAll = async () => {
    await Promise.all([
      refetchMetrics(),
      refetchMonthly(),
      refetchStats(),
      refetchActivity(),
      refetchOverdue()
    ]);
  };

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('company-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          refetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'offers',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          refetchMetrics();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          refetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, refetchMetrics]);

  return {
    metrics: realTimeMetrics || (metrics ? { ...metrics, monthly_data: monthlyData, contract_stats: contractStats } : null),
    recentActivity,
    overdueInvoices: overdueInvoices || { overdue_count: 0, overdue_amount: 0 },
    isLoading: metricsLoading || activityLoading || companyLoading || monthlyLoading || statsLoading || overdueLoading,
    refetch: refetchAll
  };
};

/**
 * Hook pour les données CRM filtrées par entreprise
 */
export const useCompanyCRM = () => {
  const { companyId, loading: companyLoading } = useMultiTenant();

  // Clients de l'entreprise
  const { 
    data: clients = [], 
    isLoading: clientsLoading 
  } = useQuery({
    queryKey: ['company-clients', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !companyLoading && !!companyId,
  });

  // Offres de l'entreprise
  const { 
    data: offers = [], 
    isLoading: offersLoading 
  } = useQuery({
    queryKey: ['company-offers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !companyLoading && !!companyId,
  });

  // Contrats de l'entreprise
  const { 
    data: contracts = [], 
    isLoading: contractsLoading 
  } = useQuery({
    queryKey: ['company-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !companyLoading && !!companyId,
  });

  // Ambassadeurs de l'entreprise
  const { 
    data: ambassadors = [], 
    isLoading: ambassadorsLoading 
  } = useQuery({
    queryKey: ['company-ambassadors', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('ambassadors')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !companyLoading && !!companyId,
  });

  // Partenaires de l'entreprise
  const { 
    data: partners = [], 
    isLoading: partnersLoading 
  } = useQuery({
    queryKey: ['company-partners', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !companyLoading && !!companyId,
  });

  return {
    clients,
    offers,
    contracts,
    ambassadors,
    partners,
    isLoading: clientsLoading || offersLoading || contractsLoading || ambassadorsLoading || partnersLoading || companyLoading,
    stats: {
      totalClients: clients.length,
      totalOffers: offers.length,
      totalContracts: contracts.length,
      totalAmbassadors: ambassadors.length,
      totalPartners: partners.length,
      pendingOffers: offers.filter(o => o.status === 'pending').length,
      activeContracts: contracts.filter(c => c.status === 'active').length,
    }
  };
};

export default useCompanyDashboard;