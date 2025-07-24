
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCustomAuth } from "@/hooks/useCustomAuth";

export const useCompanyDetection = () => {
  const { companyId: urlCompanyId, companySlug } = useParams<{ 
    companyId: string; 
    companySlug: string; 
  }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { detectCompany } = useCustomAuth();
  
  const companyParam = searchParams.get('company');
  const companySlugParam = searchParams.get('slug');
  
  console.log('🔍 COMPANY DETECTION - Hook triggered with:', {
    urlCompanyId,
    companySlug,
    companyParam,
    companySlugParam,
    pathname: location.pathname,
    origin: window.location.origin,
    url: window.location.href
  });
  
  const resolveCompanyId = async (): Promise<string | null> => {
    console.log('🔍 COMPANY DETECTION - Starting detection', {
      urlCompanyId,
      companyParam,
      companySlug,
      companySlugParam,
      origin: window.location.origin,
      pathname: window.location.pathname
    });
    
    // 1. Direct company ID from URL params
    if (urlCompanyId) {
      console.log('✅ COMPANY DETECTION - Company ID found in URL:', urlCompanyId);
      return urlCompanyId;
    }
    
    // 2. Company slug from URL params (new slug-based routing)
    if (companySlug) {
      console.log('🔍 COMPANY DETECTION - Searching by slug:', companySlug);
      
      try {
        const { data: slugData, error: slugError } = await supabase
          .rpc('get_company_by_slug', { company_slug: companySlug });
        
        console.log('🔍 COMPANY DETECTION - Slug RPC result:', { 
          slugData, 
          slugError,
          dataLength: slugData?.length 
        });
        
        if (slugError) {
          console.error('❌ COMPANY DETECTION - Slug RPC error:', slugError);
          throw slugError;
        }
        
        if (slugData && slugData.length > 0) {
          console.log('✅ COMPANY DETECTION - Company found via slug:', {
            id: slugData[0].id,
            name: slugData[0].name,
            slug: slugData[0].slug
          });
          return slugData[0].id;
        } else {
          console.error('❌ COMPANY DETECTION - No company found for slug:', companySlug);
          console.log('🔍 COMPANY DETECTION - Available data:', slugData);
          return null;
        }
      } catch (error) {
        console.error('❌ COMPANY DETECTION - Error in slug lookup:', error);
        // Continue to other detection methods
      }
    }
    
    // 3. Company name/slug from query params
    if (companyParam || companySlugParam) {
      const identifier = companyParam || companySlugParam;
      console.log('🔍 COMPANY DETECTION - Searching by identifier:', identifier);
      
      try {
        // Try to find company by subdomain first
        const { data: domainData, error: domainError } = await supabase
          .from('company_domains')
          .select('company_id')
          .eq('subdomain', identifier)
          .eq('is_active', true)
          .maybeSingle();
        
        console.log('🔍 COMPANY DETECTION - Domain lookup result:', { domainData, domainError });
        
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
        
        console.log('🔍 COMPANY DETECTION - Company name lookup result:', { companyData, companyError });
        
        if (companyData?.id) {
          console.log('✅ COMPANY DETECTION - Company found via name:', companyData.id);
          return companyData.id;
        }
      } catch (error) {
        console.error('❌ COMPANY DETECTION - Error in identifier lookup:', error);
      }
    }
    
    // 4. Detect from domain/origin using edge function
    try {
      console.log('🔍 COMPANY DETECTION - Trying edge function detection');
      const companyInfo = await detectCompany({ 
        origin: window.location.origin,
        companyParam: companyParam || undefined,
        companySlug: companySlugParam || undefined
      });
      
      console.log('🔍 COMPANY DETECTION - Edge function result:', companyInfo);
      
      if (companyInfo?.success && companyInfo.companyId) {
        console.log('✅ COMPANY DETECTION - Company found via edge function:', companyInfo.companyId);
        return companyInfo.companyId;
      }
    } catch (error) {
      console.error('❌ COMPANY DETECTION - Error in edge function:', error);
    }
    
    console.log('❌ COMPANY DETECTION - No company found with any method');
    return null;
  };

  // Force the query to run even when parameters are null by making the key more dynamic
  const shouldRun = Boolean(urlCompanyId || companySlug || companyParam || companySlugParam || location.pathname.includes('/'));
  
  const { data: companyId, isLoading: isLoadingCompanyId, error: detectionError } = useQuery({
    queryKey: ['company-detection', urlCompanyId, companyParam, companySlug, companySlugParam, location.pathname, window.location.origin],
    queryFn: resolveCompanyId,
    enabled: shouldRun,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });

  console.log('🔍 COMPANY DETECTION - Final result:', {
    companyId,
    isLoadingCompanyId,
    detectionError,
    companySlug,
    shouldRun
  });

  return {
    companyId,
    companySlug,
    isLoadingCompanyId,
    urlCompanyId,
    companyParam,
    companySlugParam,
    detectionError
  };
};
