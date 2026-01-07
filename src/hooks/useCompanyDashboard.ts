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
 * @param selectedYear - Année optionnelle pour filtrer les données (défaut: année courante)
 */
export const useCompanyDashboard = (selectedYear?: number) => {
  const { companyId, loading: companyLoading } = useMultiTenant();
  const [realTimeMetrics, setRealTimeMetrics] = useState<CompanyDashboardMetrics | null>(null);
  
  // Utiliser l'année courante par défaut
  const currentYear = new Date().getFullYear();
  const year = selectedYear || currentYear;

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

  // Récupérer les données financières mensuelles - FILTRÉ PAR ANNÉE
  const { 
    data: monthlyData = [], 
    isLoading: monthlyLoading,
    refetch: refetchMonthly
  } = useQuery({
    queryKey: ['company-monthly-data', companyId, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_financial_data', { p_year: year });

      if (error) throw error;
      return data as MonthlyFinancialData[] || [];
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000, // Actualisation toutes les minutes
  });

  // Récupérer les statistiques "En Attente" - MÊME LOGIQUE QUE L'EXPORT EXCEL
  const { 
    data: pendingStats,
    isLoading: pendingStatsLoading,
    refetch: refetchPendingStats
  } = useQuery({
    queryKey: ['company-pending-stats-excel', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      // Récupérer les offres avec équipements - même requête que useFetchOffers
      const { data: offers, error } = await supabase
        .from('offers')
        .select(`
          id, workflow_status, financed_amount, amount, converted_to_contract,
          offer_equipment(purchase_price, quantity, selling_price, margin)
        `)
        .eq('company_id', companyId)
        .eq('converted_to_contract', false);

      if (error) throw error;

      // Filtrer les offres en attente (même logique que l'export Excel)
      const pendingOffers = (offers || []).filter(o => 
        ['draft', 'sent', 'offer_send', 'info_requested', 'info_received',
         'internal_docs_requested', 'internal_approved', 'leaser_review', 
         'leaser_introduced', 'approved', 'pending'].includes(o.workflow_status || '')
      );

      let count = 0;
      let totalPurchases = 0;
      let totalCA = 0;

      for (const offer of pendingOffers) {
        count++;
        
        // Achats = SUM(purchase_price * quantity) - même calcul que offersExportService
        const purchases = (offer.offer_equipment || []).reduce(
          (sum: number, eq: any) => sum + ((eq.purchase_price || 0) * (eq.quantity || 1)), 0
        );
        totalPurchases += purchases;
        
        // CA potentiel = financed_amount || amount || calcul depuis equipment
        let ca = offer.financed_amount || offer.amount;
        if (!ca && offer.offer_equipment) {
          ca = (offer.offer_equipment || []).reduce((sum: number, eq: any) => {
            const qty = eq.quantity || 1;
            const sellingPrice = eq.selling_price || ((eq.purchase_price || 0) * (1 + (eq.margin || 0) / 100));
            return sum + (sellingPrice * qty);
          }, 0);
        }
        totalCA += ca || 0;
      }

      // Marge = CA - Achats (même calcul que offersExportService)
      const totalMargin = totalCA - totalPurchases;

      return {
        status: 'pending',
        count,
        total_revenue: totalCA,
        total_purchases: totalPurchases,
        total_margin: totalMargin
      } as ContractStatistics;
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000,
  });

  // Récupérer les autres statistiques par statut (signed, forecast) - FILTRÉ PAR ANNÉE
  const { 
    data: otherContractStats = [], 
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['company-contract-stats', companyId, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_contract_statistics_by_status', { p_year: year });

      if (error) throw error;
      // Filtrer pour ne garder que signed et forecast (pending est calculé séparément)
      return (data as ContractStatistics[] || []).filter(s => s.status !== 'pending');
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000,
  });

  // Combiner les stats: pending calculé côté frontend + autres depuis RPC
  const contractStats: ContractStatistics[] = [
    ...(pendingStats ? [pendingStats] : []),
    ...otherContractStats
  ];

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
      refetchPendingStats(),
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
    isLoading: metricsLoading || activityLoading || companyLoading || monthlyLoading || statsLoading || overdueLoading || pendingStatsLoading,
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