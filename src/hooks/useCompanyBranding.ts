import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyBranding {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

export const useCompanyBranding = (companySlug: string | null) => {
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companySlug) {
      setBranding(null);
      return;
    }

    const fetchCompanyBranding = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.rpc('get_public_company_info', {
          company_slug: companySlug
        });

        if (error) throw error;

        if (data && data.length > 0) {
          setBranding(data[0]);
        } else {
          setBranding(null);
        }
      } catch (err) {
        console.error('Error fetching company branding:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setBranding(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyBranding();
  }, [companySlug]);

  return { branding, loading, error };
};