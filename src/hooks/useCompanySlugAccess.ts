import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Company {
  id: string;
  name: string;
  slug: string;
}

export const useCompanySlugAccess = (companySlug?: string) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !companySlug) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 COMPANY SLUG ACCESS - Checking access for slug:', companySlug, 'user:', user.email);

        // First, get the company by slug
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('id, name, slug')
          .eq('slug', companySlug)
          .single();

        if (companyError || !companyData) {
          console.error('🔍 COMPANY SLUG ACCESS - Company not found:', companyError);
          setHasAccess(false);
          setCompany(null);
          setLoading(false);
          return;
        }

        setCompany(companyData);

        // Check if user has access to this company through their profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          console.error('🔍 COMPANY SLUG ACCESS - Profile not found:', profileError);
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const userHasAccess = profileData.company_id === companyData.id;
        console.log('🔍 COMPANY SLUG ACCESS - Access check result:', {
          userCompanyId: profileData.company_id,
          targetCompanyId: companyData.id,
          hasAccess: userHasAccess
        });

        setHasAccess(userHasAccess);
      } catch (error) {
        console.error('🔍 COMPANY SLUG ACCESS - Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [user, companySlug]);

  return { hasAccess, loading, company };
};