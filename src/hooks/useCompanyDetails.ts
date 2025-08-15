import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CompanyDetails {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
  account_status: string;
  created_at: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  modules_enabled: string[];
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  // Statistics
  user_count: number;
  client_count: number;
  equipment_count: number;
  co2_saved: number;
  monthly_revenue: number;
  // Primary admin
  primary_admin: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null;
  // Customizations
  customizations: {
    header_enabled: boolean;
    header_title: string | null;
    header_description: string | null;
    company_name: string | null;
    company_email: string | null;
    company_phone: string | null;
    company_address: string | null;
    quote_request_url: string | null;
  } | null;
}

export const useCompanyDetails = (companyId: string) => {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchCompanyDetails = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        // Fetch company basic information
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select(`
            id,
            name,
            slug,
            logo_url,
            plan,
            account_status,
            created_at,
            trial_ends_at,
            subscription_ends_at,
            modules_enabled,
            primary_color,
            secondary_color,
            accent_color,
            stripe_customer_id,
            stripe_subscription_id,
            co2_saved
          `)
          .eq('id', companyId)
          .single();

        if (companyError) throw companyError;
        if (!company) throw new Error('Company not found');

        // Fetch primary admin (first admin created)
        const { data: primaryAdmin } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, role')
          .eq('company_id', companyId)
          .eq('role', 'admin')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        // Fetch user count
        const { count: userCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId)
          .neq('role', 'super_admin');

        // Fetch client count
        const { count: clientCount } = await supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId);

        // Fetch equipment count
        const { count: equipmentCount } = await supabase
          .from('contract_equipment')
          .select('id', { count: 'exact' })
          .eq('company_id', companyId);

        // Fetch company customizations
        const { data: customizations } = await supabase
          .from('company_customizations')
          .select(`
            header_enabled,
            header_title,
            header_description,
            company_name,
            company_email,
            company_phone,
            company_address,
            quote_request_url
          `)
          .eq('company_id', companyId)
          .single();

        // Calculate monthly revenue based on plan
        const planPricing = {
          starter: 49,
          pro: 149,
          business: 299,
          enterprise: 599
        };
        const monthlyRevenue = planPricing[company.plan as keyof typeof planPricing] || 0;

        const companyDetails: CompanyDetails = {
          ...company,
          user_count: userCount || 0,
          client_count: clientCount || 0,
          equipment_count: equipmentCount || 0,
          co2_saved: company.co2_saved || 0,
          monthly_revenue: monthlyRevenue,
          primary_admin: primaryAdmin || null,
          customizations: customizations || null,
        };

        setCompanyDetails(companyDetails);
      } catch (err) {
        console.error('Error fetching company details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch company details');
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [companyId]);

  const refetch = async () => {
    if (!companyId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch company basic information
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          slug,
          logo_url,
          plan,
          account_status,
          created_at,
          trial_ends_at,
          subscription_ends_at,
          modules_enabled,
          primary_color,
          secondary_color,
          accent_color,
          stripe_customer_id,
          stripe_subscription_id,
          co2_saved
        `)
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;
      if (!company) throw new Error('Company not found');

      // Fetch primary admin (first admin created)
      const { data: primaryAdmin } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, role')
        .eq('company_id', companyId)
        .eq('role', 'admin')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      // Fetch user count
      const { count: userCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId)
        .neq('role', 'super_admin');

      // Fetch client count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId);

      // Fetch equipment count
      const { count: equipmentCount } = await supabase
        .from('contract_equipment')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId);

      // Fetch company customizations
      const { data: customizations } = await supabase
        .from('company_customizations')
        .select(`
          header_enabled,
          header_title,
          header_description,
          company_name,
          company_email,
          company_phone,
          company_address,
          quote_request_url
        `)
        .eq('company_id', companyId)
        .single();

      // Calculate monthly revenue based on plan
      const planPricing = {
        starter: 49,
        pro: 149,
        business: 299,
        enterprise: 599
      };
      const monthlyRevenue = planPricing[company.plan as keyof typeof planPricing] || 0;

      const companyDetails: CompanyDetails = {
        ...company,
        user_count: userCount || 0,
        client_count: clientCount || 0,
        equipment_count: equipmentCount || 0,
        co2_saved: company.co2_saved || 0,
        monthly_revenue: monthlyRevenue,
        primary_admin: primaryAdmin || null,
        customizations: customizations || null,
      };

      setCompanyDetails(companyDetails);
    } catch (err) {
      console.error('Error fetching company details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch company details');
    } finally {
      setLoading(false);
    }
  };

  return { companyDetails, loading, error, refetch };
};