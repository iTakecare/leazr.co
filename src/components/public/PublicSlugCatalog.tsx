
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicCatalogAnonymous from '@/pages/PublicCatalogAnonymous';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Container from '@/components/layout/Container';

const PublicSlugCatalog = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  console.log('🏪 PUBLIC SLUG CATALOG - Component rendered with slug:', companySlug);
  
  // Reserved keywords that should not be treated as company slugs
  const reservedKeywords = ['admin', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register'];
  
  // Check if the slug is a reserved keyword
  if (companySlug && reservedKeywords.includes(companySlug.toLowerCase())) {
    console.warn('🏪 PUBLIC SLUG CATALOG - Reserved keyword detected:', companySlug);
    return (
      <Container>
        <Alert className="max-w-lg mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Le slug "{companySlug}" est réservé par le système.
          </AlertDescription>
        </Alert>
      </Container>
    );
  }
  
  // Fetch company by slug
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async () => {
      if (!companySlug) return null;
      
      console.log('🏪 PUBLIC SLUG CATALOG - Fetching company for slug:', companySlug);
      
      const { data, error } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      if (error) {
        console.error('🏪 PUBLIC SLUG CATALOG - Error fetching company:', error);
        throw error;
      }
      
      console.log('🏪 PUBLIC SLUG CATALOG - Company data:', data);
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!companySlug,
  });

  // Loading state
  if (isLoadingCompany) {
    console.log('🏪 PUBLIC SLUG CATALOG - Loading company...');
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement de l'entreprise...</p>
          </div>
        </div>
      </Container>
    );
  }

  // Error state
  if (companyError) {
    console.error('🏪 PUBLIC SLUG CATALOG - Company error:', companyError);
    return (
      <Container>
        <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erreur lors du chargement de l'entreprise.
            <br />
            <small>Erreur: {companyError.message}</small>
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  // Company not found
  if (!company) {
    console.error('🏪 PUBLIC SLUG CATALOG - Company not found for slug:', companySlug, {
      pathname: window.location.pathname,
      search: window.location.search,
      origin: window.location.origin
    });
    return (
      <Container>
        <Alert className="max-w-lg mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Entreprise non trouvée pour le slug: <strong>{companySlug}</strong>
            <br />
            <small className="text-xs">URL: {window.location.pathname}</small>
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  console.log('🏪 PUBLIC SLUG CATALOG - Rendering PublicCatalogAnonymous with company:', company.name);
  
  // Render the actual catalog with company context
  return <PublicCatalogAnonymous />;
};

export default PublicSlugCatalog;
