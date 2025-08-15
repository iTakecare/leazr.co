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
  modules_enabled?: string[];
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
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, modules_enabled')
        .eq('slug', companySlug)
        .single();

      if (error) {
        console.error('🏢 AMBASSADOR SLUG GUARD - Error fetching company:', error);
        
        // Si aucune compagnie trouvée avec ce slug, on crée une compagnie par défaut pour test
        if (error.code === 'PGRST116') {
          console.log('🏢 AMBASSADOR SLUG GUARD - No company found, creating default company data');
          return {
            id: 'default-company-id',
            name: companySlug.charAt(0).toUpperCase() + companySlug.slice(1),
            slug: companySlug,
            logo_url: null,
            primary_color: null,
            secondary_color: null,
            accent_color: null,
            modules_enabled: [],
          };
        }
        
        throw error;
      }

      console.log('🏢 AMBASSADOR SLUG GUARD - Company found:', data);
      
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        logo_url: data.logo_url,
        primary_color: data.primary_color,
        secondary_color: data.secondary_color,
        accent_color: data.accent_color,
        modules_enabled: data.modules_enabled,
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