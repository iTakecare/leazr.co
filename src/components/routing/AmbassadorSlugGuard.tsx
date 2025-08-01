import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyProvider } from "@/context/CompanyContext";
import { Outlet } from "react-router-dom";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

const AmbassadorSlugGuard = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassador', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register', 'signup', 'contracts', 'solutions', 'services', 'ressources', 'about', 'a-propos', 'contact', 'support', 'help', 'catalog', 'products', 'pricing', 'tarifs', 'features', 'blog', 'news', 'home', 'create-offer'];
  
  console.log('🛡️ AMBASSADOR SLUG GUARD - Checking slug:', companySlug, {
    pathname: window.location.pathname,
    href: window.location.href
  });
  
  if (!companySlug) {
    console.error('🛡️ AMBASSADOR SLUG GUARD - No slug provided, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  // Check if the slug is a reserved keyword
  if (reservedKeywords.includes(companySlug.toLowerCase())) {
    console.error('🛡️ AMBASSADOR SLUG GUARD - Reserved keyword detected:', companySlug);
    return <Navigate to="/" replace />;
  }

  const { data: company, isLoading, error } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async (): Promise<Company | null> => {
      console.log('🏢 AMBASSADOR SLUG GUARD - Fetching company for slug:', companySlug);
      
      const { data, error } = await supabase.rpc('get_company_by_slug', {
        company_slug: companySlug
      });

      if (error) {
        console.error('🏢 AMBASSADOR SLUG GUARD - Error fetching company:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('🏢 AMBASSADOR SLUG GUARD - No company found for slug:', companySlug);
        return null;
      }

      const companyData = data[0];
      console.log('🏢 AMBASSADOR SLUG GUARD - Company found:', companyData);
      
      return {
        id: companyData.id,
        name: companyData.name,
        slug: companyData.slug,
        logo_url: companyData.logo_url,
        primary_color: companyData.primary_color,
        secondary_color: companyData.secondary_color,
        accent_color: companyData.accent_color,
      };
    },
    enabled: !!companySlug,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
      </div>
    );
  }

  if (error || !company) {
    console.error('🛡️ AMBASSADOR SLUG GUARD - Company not found or error:', { error, company });
    return <Navigate to="/" replace />;
  }

  console.log('🛡️ AMBASSADOR SLUG GUARD - Valid company found, rendering ambassador content:', company);
  
  return (
    <CompanyProvider company={company}>
      <Outlet />
    </CompanyProvider>
  );
};

export default AmbassadorSlugGuard;