import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CompanyProvider } from "@/context/CompanyContext";
import { useAuth } from "@/context/AuthContext";
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

const AmbassadorPrivateRoute = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const { user, isLoading: authLoading } = useAuth();
  
  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassador', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register', 'signup', 'contracts', 'solutions', 'services', 'ressources', 'about', 'a-propos', 'contact', 'support', 'help', 'catalog', 'products', 'pricing', 'tarifs', 'features', 'blog', 'news', 'home', 'create-offer'];
  
  console.log('🛡️ AMBASSADOR PRIVATE ROUTE - Auth status:', {
    user: !!user,
    authLoading,
    companySlug,
    pathname: window.location.pathname
  });

  // Check authentication first
  if (authLoading) {
    console.log('🛡️ AMBASSADOR PRIVATE ROUTE - Auth loading...');
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
        <div className="ml-3 text-sm text-muted-foreground">Vérification de l'authentification...</div>
      </div>
    );
  }

  if (!user) {
    console.log('🛡️ AMBASSADOR PRIVATE ROUTE - User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check company slug
  if (!companySlug) {
    console.error('🛡️ AMBASSADOR PRIVATE ROUTE - No slug provided, redirecting to home');
    return <Navigate to="/" replace />;
  }
  
  // Check if the slug is a reserved keyword
  if (reservedKeywords.includes(companySlug.toLowerCase())) {
    console.error('🛡️ AMBASSADOR PRIVATE ROUTE - Reserved keyword detected:', companySlug);
    return <Navigate to="/" replace />;
  }

  const { data: company, isLoading: companyLoading, error } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async (): Promise<Company | null> => {
      console.log('🏢 AMBASSADOR PRIVATE ROUTE - Fetching company for slug:', companySlug);
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, modules_enabled')
        .eq('slug', companySlug)
        .single();

      if (error) {
        console.error('🏢 AMBASSADOR PRIVATE ROUTE - Error fetching company:', error);
        throw error;
      }

      console.log('🏢 AMBASSADOR PRIVATE ROUTE - Company found:', data);
      return data;
    },
    enabled: !!companySlug && !!user,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (companyLoading) {
    console.log('🛡️ AMBASSADOR PRIVATE ROUTE - Company loading...');
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary"></div>
        <div className="ml-3 text-sm text-muted-foreground">Chargement de l'entreprise...</div>
      </div>
    );
  }

  if (error || !company) {
    console.error('🛡️ AMBASSADOR PRIVATE ROUTE - Company not found or error:', { error, company });
    return <Navigate to="/" replace />;
  }

  console.log('🛡️ AMBASSADOR PRIVATE ROUTE - Success! Rendering ambassador content for:', company.name);
  
  return (
    <CompanyProvider company={company}>
      <Outlet />
    </CompanyProvider>
  );
};

export default AmbassadorPrivateRoute;