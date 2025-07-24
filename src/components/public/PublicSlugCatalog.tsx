
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicCatalogAnonymous from '@/pages/PublicCatalogAnonymous';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Container from '@/components/layout/Container';
import ErrorBoundary from '@/components/ErrorBoundary';

const PublicSlugCatalog = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  
  // Safari-compatible logging
  try {
    console.log('🏪 PUBLIC SLUG CATALOG - Slug:', companySlug || 'undefined');
  } catch (e) {
    // Silent fail for Safari compatibility
  }
  
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
      
      try {
        console.log('🏪 Fetching company:', companySlug);
      } catch (e) {}
      
      const { data, error } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      if (error) {
        console.error('🏪 Company fetch error:', error.message);
        throw error;
      }
      
      try {
        console.log('🏪 Company found:', data?.[0]?.name || 'None');
      } catch (e) {}
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
    try {
      console.error('🏪 Company not found:', companySlug);
    } catch (e) {}
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

  try {
    console.log('🏪 Rendering catalog for:', company.name);
  } catch (e) {}
  
  // Render the actual catalog with company context
  return (
    <ErrorBoundary>
      <PublicCatalogAnonymous />
    </ErrorBoundary>
  );
};

export default PublicSlugCatalog;
