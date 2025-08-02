import { supabase } from '@/integrations/supabase/client';

/**
 * Service to get company slug for the current user
 */
export const getCompanySlugForUser = async (): Promise<string | null> => {
  try {
    console.log('🏢 COMPANY SLUG SERVICE - Getting company slug for current user');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('🏢 COMPANY SLUG SERVICE - No authenticated user');
      return null;
    }

    // Get user's company through profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        company_id,
        companies!inner (
          slug
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profileData) {
      console.error('🏢 COMPANY SLUG SERVICE - Error getting profile:', profileError);
      return null;
    }

    const companySlug = (profileData.companies as any)?.slug;
    console.log('🏢 COMPANY SLUG SERVICE - Company slug found:', companySlug);

    return companySlug || null;
  } catch (error) {
    console.error('🏢 COMPANY SLUG SERVICE - Error:', error);
    return null;
  }
};