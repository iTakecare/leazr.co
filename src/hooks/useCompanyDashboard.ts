import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';

export interface CompanyDashboardMetrics {
  total_revenue: number;
  total_clients: number;
  total_offers: number;
  total_contracts: number;
  pending_offers: number;
  active_contracts: number;
  monthly_growth_revenue: number;
  monthly_growth_clients: number;
}

export interface RecentActivity {
  activity_type: string;
  activity_description: string;
  entity_id: string;
  entity_name: string;
  created_at: string;
  user_name: string;
}

/**
 * Hook pour les métriques du dashboard multi-tenant
 */
export const useCompanyDashboard = (timeFilter: string = 'month') => {
  const { companyId, loading: companyLoading } = useMultiTenant();
  const [realTimeMetrics, setRealTimeMetrics] = useState<CompanyDashboardMetrics | null>(null);

  // Récupérer les métriques principales
  const { 
    data: metrics, 
    isLoading: metricsLoading, 
    refetch: refetchMetrics 
  } = useQuery({
    queryKey: ['company-dashboard-metrics', companyId, timeFilter],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase.rpc('get_company_dashboard_metrics', {
        p_company_id: companyId,
        time_filter: timeFilter
      });

      if (error) throw error;
      return data?.[0] as CompanyDashboardMetrics || null;
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 30000, // Actualisation toutes les 30 secondes
  });

  // Récupérer l'activité récente
  const { 
    data: recentActivity = [], 
    isLoading: activityLoading 
  } = useQuery({
    queryKey: ['company-recent-activity', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase.rpc('get_company_recent_activity', {
        p_company_id: companyId,
        p_limit: 10
      });

      if (error) throw error;
      return data as RecentActivity[] || [];
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000, // Actualisation toutes les minutes
  });

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
    metrics: realTimeMetrics || metrics,
    recentActivity,
    isLoading: metricsLoading || activityLoading || companyLoading,
    refetch: refetchMetrics
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