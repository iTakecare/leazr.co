
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatters";

export type TimeFilter = "month" | "year" | "quarter" | "all";

export type DashboardStats = {
  pendingOffers: number;
  pendingRequests: number;
  totalRevenue: number;
  formattedRevenue: string;
  clientsCount: number;
  grossMargin: number;
  formattedGrossMargin: string;
  marginPercentage: number;
  acceptedOffers: number;
};

export const getDashboardStats = async (
  timeFilter: TimeFilter = "month"
): Promise<DashboardStats> => {
  try {
    console.log("Fetching dashboard stats with filter:", timeFilter);
    let timeConstraint;
    
    // Définir la contrainte de temps en fonction du filtre
    switch (timeFilter) {
      case "month":
        timeConstraint = "created_at >= date_trunc('month', now())";
        break;
      case "quarter":
        timeConstraint = "created_at >= date_trunc('quarter', now())";
        break;
      case "year":
        timeConstraint = "created_at >= date_trunc('year', now())";
        break;
      case "all":
      default:
        timeConstraint = "TRUE";
        break;
    }

    // Obtenir le nombre d'offres en attente
    const { count: pendingOffersCount, error: pendingOffersError } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('converted_to_contract', false);

    if (pendingOffersError) throw pendingOffersError;

    // Obtenir le nombre de demandes clients en attente
    const { count: pendingRequestsCount, error: pendingRequestsError } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'client_request')
      .eq('status', 'pending');

    if (pendingRequestsError) throw pendingRequestsError;

    // Obtenir le nombre d'offres acceptées
    const { count: acceptedOffersCount, error: acceptedOffersError } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or('workflow_status.eq.client_approved,workflow_status.eq.leaser_approved');

    if (acceptedOffersError) throw acceptedOffersError;

    // Obtenir le chiffre d'affaire des contrats signés
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('calculate_total_revenue', { time_filter: timeFilter });

    if (revenueError) {
      console.error("Error calculating revenue:", revenueError);
      // Utiliser une requête alternative si la RPC n'est pas disponible
      const { data: contractsData, error: contractsError } = await supabase
        .from('contracts')
        .select('monthly_payment')
        .filter(timeConstraint);

      if (contractsError) throw contractsError;

      const totalRevenue = contractsData?.reduce((sum, contract) => sum + (contract.monthly_payment || 0), 0) || 0;
      
      // Obtenir la marge brute (commission totale)
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('commission')
        .eq('status', 'accepted')
        .filter(timeConstraint);

      if (offersError) throw offersError;

      const grossMargin = offersData?.reduce((sum, offer) => sum + (offer.commission || 0), 0) || 0;
      
      // Obtenir le nombre total de clients
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (clientsError) throw clientsError;

      // Calculer le pourcentage de marge
      const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

      return {
        pendingOffers: pendingOffersCount || 0,
        pendingRequests: pendingRequestsCount || 0,
        totalRevenue: totalRevenue,
        formattedRevenue: formatCurrency(totalRevenue),
        clientsCount: clientsCount || 0,
        grossMargin: grossMargin,
        formattedGrossMargin: formatCurrency(grossMargin),
        marginPercentage: parseFloat(marginPercentage.toFixed(2)),
        acceptedOffers: acceptedOffersCount || 0
      };
    }

    // Si la RPC a fonctionné, utiliser ses résultats
    const totalRevenue = revenueData?.total_revenue || 0;
    const grossMargin = revenueData?.gross_margin || 0;
    const clientsCount = revenueData?.clients_count || 0;
    const marginPercentage = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;

    return {
      pendingOffers: pendingOffersCount || 0,
      pendingRequests: pendingRequestsCount || 0,
      totalRevenue: totalRevenue,
      formattedRevenue: formatCurrency(totalRevenue),
      clientsCount: clientsCount || 0,
      grossMargin: grossMargin,
      formattedGrossMargin: formatCurrency(grossMargin),
      marginPercentage: parseFloat(marginPercentage.toFixed(2)),
      acceptedOffers: acceptedOffersCount || 0
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // Retourner des données par défaut en cas d'erreur
    return {
      pendingOffers: 0,
      pendingRequests: 0,
      totalRevenue: 0,
      formattedRevenue: formatCurrency(0),
      clientsCount: 0,
      grossMargin: 0,
      formattedGrossMargin: formatCurrency(0),
      marginPercentage: 0,
      acceptedOffers: 0
    };
  }
};

export const getRecentActivity = async (limit: number = 10) => {
  try {
    // Récupérer les activités récentes à partir des logs de workflow des offres
    const { data: offerLogs, error: offerLogsError } = await supabase
      .from('offer_workflow_logs')
      .select(`
        id,
        created_at,
        offer_id,
        previous_status,
        new_status,
        profiles:user_id (first_name, last_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (offerLogsError) throw offerLogsError;

    // Récupérer les activités récentes à partir des logs de workflow des contrats
    const { data: contractLogs, error: contractLogsError } = await supabase
      .from('contract_workflow_logs')
      .select(`
        id,
        created_at,
        contract_id,
        previous_status,
        new_status,
        profiles:user_id (first_name, last_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (contractLogsError) throw contractLogsError;

    // Combiner les deux types de logs
    const allLogs = [
      ...(offerLogs || []).map(log => ({
        ...log,
        type: 'offer' as const
      })),
      ...(contractLogs || []).map(log => ({
        ...log,
        type: 'contract' as const
      }))
    ];

    // Trier par date
    return allLogs.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }).slice(0, limit);
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return [];
  }
};
