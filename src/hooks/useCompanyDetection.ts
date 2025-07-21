import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";

export const useCompanyDetection = () => {
  const { companyId: urlCompanyId, companySlug } = useParams<{ 
    companyId: string; 
    companySlug: string; 
  }>();
  const [searchParams] = useSearchParams();
  const { detectCompany } = useCustomAuth();
  
  const companyParam = searchParams.get('company');
  const companySlugParam = searchParams.get('slug');
  
  const resolveCompanyId = async (): Promise<string | null> => {
    console.log('🔍 COMPANY DETECTION - Starting detection', {
      urlCompanyId,
      companyParam,
      companySlug,
      companySlugParam,
      origin: window.location.origin
    });
    
    // 1. Direct company ID from URL params
    if (urlCompanyId) {
      console.log('✅ COMPANY DETECTION - Company ID found in URL:', urlCompanyId);
      return urlCompanyId;
    }
    
    // 2. Company slug from URL params (new slug-based routing)
    if (companySlug) {
      console.log('🔍 COMPANY DETECTION - Searching by slug:', companySlug);
      
      const { data: slugData, error: slugError } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      console.log('🔍 COMPANY DETECTION - Slug result:', { slugData, slugError });
      
      if (slugData && slugData.length > 0) {
        console.log('✅ COMPANY DETECTION - Company found via slug:', slugData[0].id);
        return slugData[0].id;
      }
    }
    
    // 3. Company name/slug from query params
    if (companyParam || companySlugParam) {
      const identifier = companyParam || companySlugParam;
      console.log('🔍 COMPANY DETECTION - Searching by identifier:', identifier);
      
      // Try to find company by subdomain first
      const { data: domainData, error: domainError } = await supabase
        .from('company_domains')
        .select('company_id')
        .eq('subdomain', identifier)
        .eq('is_active', true)
        .maybeSingle();
      
      if (domainData?.company_id) {
        console.log('✅ COMPANY DETECTION - Company found via subdomain:', domainData.company_id);
        return domainData.company_id;
      }
      
      // Fallback: try to find by company name
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', `%${identifier}%`)
        .maybeSingle();
      
      if (companyData?.id) {
        console.log('✅ COMPANY DETECTION - Company found via name:', companyData.id);
        return companyData.id;
      }
    }
    
    // 4. Detect from domain/origin using edge function
    try {
      const companyInfo = await detectCompany({ 
        origin: window.location.origin,
        companyParam: companyParam || undefined,
        companySlug: companySlugParam || undefined
      });
      if (companyInfo?.success && companyInfo.companyId) {
        return companyInfo.companyId;
      }
    } catch (error) {
      console.error('Error detecting company from domain:', error);
    }
    
    return null;
  };

  const { data: companyId, isLoading: isLoadingCompanyId } = useQuery({
    queryKey: ['company-detection', urlCompanyId, companyParam, companySlug, companySlugParam, window.location.origin],
    queryFn: resolveCompanyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    companyId,
    companySlug,
    isLoadingCompanyId,
    urlCompanyId,
    companyParam,
    companySlugParam
  };
};