import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  modules_enabled?: string[];
}

export const useRefreshableCompanyData = () => {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCompanyData = useCallback(async () => {
    if (!user) {
      setCompany(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user's company data from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.company_id) {
        setCompany(null);
        setLoading(false);
        return;
      }

      // Fetch fresh company data including modules_enabled
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, modules_enabled')
        .eq('id', profile.company_id)
        .single();

      if (companyError) {
        throw companyError;
      }

      setCompany(companyData);
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refresh = useCallback(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  return {
    company,
    loading,
    error,
    refresh,
  };
};