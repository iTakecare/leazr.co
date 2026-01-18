import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/hooks/useMultiTenant';

export interface MonthlyFinancialData {
  month_name: string;
  month_number: number;
  year: number;
  revenue: number;
  direct_sales_revenue: number;
  purchases: number;
  margin: number;
  margin_percentage: number;
  contracts_count: number;
  offers_count: number;
  credit_notes_amount: number;
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

  // Récupérer les statistiques "Contrats Réalisés" (factures leasing + contrats en propre)
  const { 
    data: realizedStats,
    isLoading: realizedStatsLoading,
    refetch: refetchRealizedStats
  } = useQuery({
    queryKey: ['company-realized-stats', companyId, year],
    queryFn: async () => {
      if (!companyId) return null;
      
      // 1. Récupérer les factures de type 'leasing' pour l'année sélectionnée
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, amount, contract_id, invoice_date')
        .eq('company_id', companyId)
        .eq('invoice_type', 'leasing')
        .gte('invoice_date', `${year}-01-01`)
        .lte('invoice_date', `${year}-12-31`);

      if (error) throw error;

      // Récupérer les achats depuis contract_equipment pour ces contrats (factures)
      const contractIds = [...new Set((invoices || []).map(i => i.contract_id).filter(Boolean))] as string[];
      
      let invoicePurchases = 0;
      if (contractIds.length > 0) {
        const { data: equipment } = await supabase
          .from('contract_equipment')
          .select('contract_id, purchase_price, quantity')
          .in('contract_id', contractIds);
        
        invoicePurchases = (equipment || []).reduce(
          (sum, e) => sum + ((e.purchase_price || 0) * (e.quantity || 1)), 0
        );
      }

      const invoiceRevenue = (invoices || []).reduce((sum, i) => sum + (i.amount || 0), 0);
      
      // 2. Récupérer les contrats en propre (self-leasing) actifs pour l'année
      const { data: selfLeasingContracts } = await supabase
        .from('contracts')
        .select(`
          id, monthly_payment, contract_start_date, contract_end_date, contract_duration,
          contract_equipment(purchase_price, quantity)
        `)
        .eq('company_id', companyId)
        .eq('is_self_leasing', true)
        .in('status', ['signed', 'active', 'delivered'])
        .lte('contract_start_date', `${year}-12-31`);

      // Calculer les revenus et achats des contrats en propre
      let selfLeasingRevenue = 0;
      let selfLeasingPurchases = 0;
      let selfLeasingCount = 0;

      for (const contract of selfLeasingContracts || []) {
        const startDate = contract.contract_start_date ? new Date(contract.contract_start_date) : null;
        const endDate = contract.contract_end_date ? new Date(contract.contract_end_date) : null;
        
        if (!startDate) continue;
        
        // Calculer les mois actifs dans l'année sélectionnée
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        const effectiveStart = startDate > yearStart ? startDate : yearStart;
        const effectiveEnd = endDate && endDate < yearEnd ? endDate : yearEnd;
        
        if (effectiveStart > effectiveEnd) continue;
        
        // Nombre de mois actifs
        const monthsActive = (effectiveEnd.getFullYear() - effectiveStart.getFullYear()) * 12 
          + effectiveEnd.getMonth() - effectiveStart.getMonth() + 1;
        
        selfLeasingRevenue += (contract.monthly_payment || 0) * monthsActive;
        
        // Achats répartis sur la durée du contrat (purchase / contract_duration)
        const totalEquipmentPurchase = (contract.contract_equipment || []).reduce(
          (sum: number, e: any) => sum + ((e.purchase_price || 0) * (e.quantity || 1)), 0
        );
        const contractDuration = contract.contract_duration || 36;
        const monthlyPurchase = totalEquipmentPurchase / contractDuration;
        selfLeasingPurchases += monthlyPurchase * monthsActive;
        
        selfLeasingCount++;
      }

      // Combiner factures leasing + contrats en propre
      const totalRevenue = invoiceRevenue + selfLeasingRevenue;
      const totalPurchases = invoicePurchases + selfLeasingPurchases;
      const totalCount = (invoices?.length || 0) + selfLeasingCount;
      
      return {
        status: 'realized',
        count: totalCount,
        total_revenue: totalRevenue,
        total_purchases: totalPurchases,
        total_margin: totalRevenue - totalPurchases
      } as ContractStatistics;
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000,
  });

  // Récupérer les statistiques "Ventes Directes" (factures purchase)
  const { 
    data: directSalesStats,
    isLoading: directSalesStatsLoading,
    refetch: refetchDirectSalesStats
  } = useQuery({
    queryKey: ['company-direct-sales-stats', companyId, year],
    queryFn: async () => {
      if (!companyId) return null;
      
      // Récupérer les factures de type 'purchase' pour l'année sélectionnée
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, amount, offer_id, invoice_date')
        .eq('company_id', companyId)
        .eq('invoice_type', 'purchase')
        .gte('invoice_date', `${year}-01-01`)
        .lte('invoice_date', `${year}-12-31`);

      if (error) throw error;

      // Récupérer les achats depuis offer_equipment pour ces offres
      const offerIds = [...new Set((invoices || []).map(i => i.offer_id).filter(Boolean))] as string[];
      
      let totalPurchases = 0;
      if (offerIds.length > 0) {
        const { data: equipment } = await supabase
          .from('offer_equipment')
          .select('offer_id, purchase_price, quantity')
          .in('offer_id', offerIds);
        
        totalPurchases = (equipment || []).reduce(
          (sum, e) => sum + ((e.purchase_price || 0) * (e.quantity || 1)), 0
        );
      }

      const totalRevenue = (invoices || []).reduce((sum, i) => sum + (i.amount || 0), 0);
      
      return {
        status: 'direct_sales',
        count: invoices?.length || 0,
        total_revenue: totalRevenue,
        total_purchases: totalPurchases,
        total_margin: totalRevenue - totalPurchases
      } as ContractStatistics;
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000,
  });

  // Récupérer les statistiques "Refusés/Sans Suite" (offres refusées)
  const { 
    data: refusedStats,
    isLoading: refusedStatsLoading,
    refetch: refetchRefusedStats
  } = useQuery({
    queryKey: ['company-refused-stats', companyId, year],
    queryFn: async () => {
      if (!companyId) return null;
      
      // Récupérer les offres refusées de l'année sélectionnée
      const { data: offers, error } = await supabase
        .from('offers')
        .select(`
          id, financed_amount, amount, created_at,
          offer_equipment(purchase_price, quantity)
        `)
        .eq('company_id', companyId)
        .in('workflow_status', ['internal_rejected', 'leaser_rejected', 'rejected', 'cancelled', 'without_follow_up'])
        .gte('created_at', `${year}-01-01`)
        .lte('created_at', `${year}-12-31T23:59:59`);

      if (error) throw error;

      let totalRevenue = 0;
      let totalPurchases = 0;

      for (const offer of offers || []) {
        totalRevenue += offer.financed_amount || offer.amount || 0;
        totalPurchases += (offer.offer_equipment || []).reduce(
          (sum: number, e: any) => sum + ((e.purchase_price || 0) * (e.quantity || 1)), 0
        );
      }
      
      return {
        status: 'refused',
        count: offers?.length || 0,
        total_revenue: totalRevenue,
        total_purchases: totalPurchases,
        total_margin: totalRevenue - totalPurchases
      } as ContractStatistics;
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000,
  });

  // Récupérer les autres statistiques par statut (forecast uniquement) - FILTRÉ PAR ANNÉE
  const { 
    data: otherContractStats = [], 
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['company-contract-stats', companyId, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_contract_statistics_by_status', { p_year: year });

      if (error) throw error;
      // Ne garder que forecast (les autres sont calculés séparément)
      return (data as ContractStatistics[] || []).filter(s => s.status === 'forecast');
    },
    enabled: !companyLoading && !!companyId,
    refetchInterval: 60000,
  });

  // Combiner toutes les stats calculées côté frontend
  const contractStats: ContractStatistics[] = [
    ...(pendingStats ? [pendingStats] : []),
    ...(realizedStats ? [realizedStats] : []),
    ...(directSalesStats ? [directSalesStats] : []),
    ...(refusedStats ? [refusedStats] : []),
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
        .in('status', ['sent', 'pending'])
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
      refetchRealizedStats(),
      refetchDirectSalesStats(),
      refetchRefusedStats(),
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
    isLoading: metricsLoading || activityLoading || companyLoading || monthlyLoading || statsLoading || overdueLoading || pendingStatsLoading || realizedStatsLoading || directSalesStatsLoading || refusedStatsLoading,
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