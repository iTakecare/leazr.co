import { supabase } from "@/integrations/supabase/client";

export type TimeFilter = 'all' | 'month' | 'quarter' | 'year';

export interface DashboardStats {
  totalRevenue: number;
  grossMargin: number;
  clientsCount: number;
  offersCount: number;
  offersAccepted: number;
  offersPending: number;
  contractsCount: number;
  contractsActive: number;
  avgCommission: number;
  conversionRate: number;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
  }>;
  topProducts: Array<{
    name: string;
    count: number;
  }>;
  pendingOffers: number;
  pendingRequests: number;
  formattedRevenue: string;
  acceptedOffers: number;
  formattedGrossMargin: string;
  marginPercentage: number;
}

export const getDashboardStats = async (timeFilter: TimeFilter = 'month'): Promise<DashboardStats> => {
  try {
    // Get financial data using the database function
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('calculate_total_revenue', { time_filter: timeFilter });
    
    if (revenueError) throw revenueError;
    
    const totalRevenue = revenueData?.[0]?.total_revenue || 0;
    const grossMargin = revenueData?.[0]?.gross_margin || 0;
    const clientsCount = revenueData?.[0]?.clients_count || 0;
    
    // Get offers data
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id, status')
      .order('created_at', { ascending: false });
      
    if (offersError) throw offersError;
    
    const offersCount = offers ? offers.length : 0;
    const offersAccepted = offers ? offers.filter(o => o.status === 'accepted').length : 0;
    const offersPending = offers ? offers.filter(o => o.status === 'pending' || o.status === 'sent').length : 0;
    
    // Get contracts data
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, status')
      .order('created_at', { ascending: false });
      
    if (contractsError) throw contractsError;
    
    const contractsCount = contracts ? contracts.length : 0;
    const contractsActive = contracts ? contracts.filter(c => c.status === 'active' || c.status === 'signed').length : 0;
    
    // Calculate conversion rate (offers accepted / total offers)
    const conversionRate = offersCount > 0 ? (offersAccepted / offersCount) * 100 : 0;
    
    // Get revenue by month (last 6 months)
    const { data: monthlyRevenue, error: monthlyError } = await supabase
      .from('contracts')
      .select('created_at, monthly_payment')
      .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())
      .order('created_at', { ascending: true });
      
    if (monthlyError) throw monthlyError;
    
    // Group by month and sum
    const revenueByMonth = groupRevenueByMonth(monthlyRevenue || []);
    
    // Get top products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('name, id')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (productsError) {
      console.warn('Error fetching top products:', productsError);
      // Continue despite this error
    }
    
    // Calculate average commission
    const { data: commissions, error: commissionsError } = await supabase
      .from('partner_commissions')
      .select('amount')
      .eq('status', 'paid');
      
    if (commissionsError) throw commissionsError;
    
    const totalCommission = commissions ? commissions.reduce((sum, c) => sum + Number(c.amount), 0) : 0;
    const avgCommission = commissions && commissions.length > 0 ? totalCommission / commissions.length : 0;
    
    // Format values for the UI
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    
    const formattedRevenue = formatter.format(totalRevenue);
    const formattedGrossMargin = formatter.format(grossMargin);
    const marginPercentage = totalRevenue > 0 ? Math.round((grossMargin / totalRevenue) * 100) : 0;
    
    // Map products to the required format
    const topProductsData = products ? products.map((p: any) => ({
      name: p.name,
      count: Math.floor(Math.random() * 20) + 1 // Mock count since we don't have real data
    })) : [];
    
    return {
      totalRevenue: Number(totalRevenue),
      grossMargin: Number(grossMargin),
      clientsCount: Number(clientsCount),
      offersCount,
      offersAccepted,
      offersPending,
      contractsCount,
      contractsActive,
      avgCommission,
      conversionRate,
      revenueByMonth,
      topProducts: topProductsData,
      pendingOffers: offersPending,
      pendingRequests: Math.floor(Math.random() * 5), // Mocked value
      formattedRevenue,
      acceptedOffers: offersAccepted,
      formattedGrossMargin,
      marginPercentage
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    // Return default values
    return {
      totalRevenue: 0,
      grossMargin: 0,
      clientsCount: 0,
      offersCount: 0,
      offersAccepted: 0,
      offersPending: 0,
      contractsCount: 0,
      contractsActive: 0,
      avgCommission: 0,
      conversionRate: 0,
      revenueByMonth: [],
      topProducts: [],
      pendingOffers: 0,
      pendingRequests: 0,
      formattedRevenue: '€0',
      acceptedOffers: 0,
      formattedGrossMargin: '€0',
      marginPercentage: 0
    };
  }
};

// Helper function to group contracts by month
const groupRevenueByMonth = (contracts: any[]): Array<{ month: string; revenue: number }> => {
  const months: Record<string, number> = {};
  
  contracts.forEach(contract => {
    const date = new Date(contract.created_at);
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const monthName = date.toLocaleString('default', { month: 'short' });
    const displayKey = `${monthName} ${date.getFullYear()}`;
    
    if (!months[displayKey]) {
      months[displayKey] = 0;
    }
    
    months[displayKey] += Number(contract.monthly_payment) || 0;
  });
  
  // Convert to array and limit to last 6 months
  return Object.entries(months)
    .map(([month, revenue]) => ({ month, revenue }))
    .slice(-6);
};

// Function to get recent activity
export const getRecentActivity = async (limit: number = 20): Promise<any[]> => {
  try {
    // Get recent offers
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id, client_name, created_at, amount, status')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (offersError) throw offersError;
    
    // Get recent contracts
    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('id, client_name, created_at, monthly_payment, status')
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (contractsError) throw contractsError;
    
    // Combine and format activities
    const activities = [
      ...(offers || []).map(offer => ({
        id: offer.id,
        type: 'offer',
        name: offer.client_name,
        amount: Number(offer.amount),
        status: offer.status,
        date: offer.created_at,
        message: `Nouvelle offre créée pour ${offer.client_name}`
      })),
      ...(contracts || []).map(contract => ({
        id: contract.id,
        type: 'contract',
        name: contract.client_name,
        amount: Number(contract.monthly_payment),
        status: contract.status,
        date: contract.created_at,
        message: `Nouveau contrat pour ${contract.client_name}`
      }))
    ];
    
    // Sort by date
    const sortedActivities = activities.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    return sortedActivities.slice(0, limit);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
};

// Function to get partner performance
export const getPartnerPerformance = async (partnerId: string): Promise<any> => {
  try {
    // Get partner details
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single();
      
    if (partnerError) throw partnerError;
    
    // Get partner commissions
    const { data: commissions, error: commissionsError } = await supabase
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partnerId)
      .order('date', { ascending: false });
      
    if (commissionsError) throw commissionsError;
    
    // Get partner clients
    const { data: clientRelations, error: clientsError } = await supabase
      .from('partner_clients')
      .select('client_id')
      .eq('partner_id', partnerId);
      
    if (clientsError) throw clientsError;
    
    const clientIds = clientRelations ? clientRelations.map(r => r.client_id) : [];
    
    // Get offers from partner's clients
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .in('client_id', clientIds)
      .order('created_at', { ascending: false });
      
    if (offersError) throw offersError;
    
    return {
      partner,
      commissions: commissions || [],
      clientsCount: clientIds.length,
      offersCount: offers ? offers.length : 0,
      totalCommission: commissions ? commissions.reduce((sum, c) => sum + Number(c.amount), 0) : 0,
      recentOffers: offers ? offers.slice(0, 5) : []
    };
  } catch (error) {
    console.error('Error getting partner performance:', error);
    return {
      partner: null,
      commissions: [],
      clientsCount: 0,
      offersCount: 0,
      totalCommission: 0,
      recentOffers: []
    };
  }
};
