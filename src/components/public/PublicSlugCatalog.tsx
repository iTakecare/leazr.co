
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicCatalogAnonymous from '@/pages/PublicCatalogAnonymous';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Container from '@/components/layout/Container';
import ErrorBoundary from '@/components/ErrorBoundary';

const PublicSlugCatalog = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const queryClient = useQueryClient();
  
  // Safari-compatible logging
  try {
    console.log('🏪 PUBLIC SLUG CATALOG - Slug:', companySlug || 'undefined');
  } catch (e) {
    // Silent fail for Safari compatibility
  }

  // Invalidate old cache on mount to avoid conflicts
  useEffect(() => {
    try {
      console.log('🏪 Cache cleanup - Invalidating old company cache');
      queryClient.invalidateQueries({ queryKey: ['company-by-slug'] });
      queryClient.removeQueries({ queryKey: ['company-by-slug'] });
      console.log('🏪 Cache cleanup - Done');
    } catch (e) {
      console.warn('🏪 Cache cleanup failed:', e);
    }
  }, [queryClient]);
  
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
  
  // Fetch company by slug - cache key unique pour éviter les conflits
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company-by-slug-direct', companySlug],
    queryFn: async () => {
      if (!companySlug) {
        console.log('🏪 No slug provided');
        return null;
      }
      
      console.log('🏪 [START] Direct SQL query for:', companySlug);
      console.time('company-fetch');
      
      try {
        // Requête SQL directe ultra-simple
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color')
          .eq('slug', companySlug)
          .eq('is_active', true)
          .maybeSingle();
        
        console.timeEnd('company-fetch');
        
        if (error) {
          console.error('🏪 [ERROR] SQL query failed:', error.message, error.code);
          throw error;
        }
        
        console.log('🏪 [SUCCESS] Company found:', data?.name || 'Not found');
        return data;
        
      } catch (err) {
        console.timeEnd('company-fetch');
        console.error('🏪 [FATAL] Query exception:', err);
        throw err;
      }
    },
    enabled: !!companySlug,
    retry: 1, // Réduit pour détecter plus vite les problèmes
    retryDelay: 1000,
    staleTime: 30 * 1000, // Cache court pour forcer le refresh
    gcTime: 2 * 60 * 1000, // Garde en mémoire moins longtemps
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
      <PublicCatalogAnonymous company={company} />
    </ErrorBoundary>
  );
};

export default PublicSlugCatalog;
