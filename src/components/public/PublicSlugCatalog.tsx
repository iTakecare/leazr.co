
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
  
  // Fetch company by slug avec robustesse améliorée
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async () => {
      if (!companySlug) return null;
      
      console.log('🏪 [DEBUT] Fetching company:', companySlug);
      
      // Protection contre les erreurs d'extensions
      let companyData = null;
      
      try {
        console.log('🏪 [STEP 1] Tentative RPC get_company_by_slug...');
        
        // Timeout de sécurité pour éviter les blocages
        const rpcPromise = supabase.rpc('get_company_by_slug', { company_slug: companySlug });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('RPC timeout after 10s')), 10000)
        );
        
        const { data, error } = await Promise.race([rpcPromise, timeoutPromise]) as any;
        
        if (error) {
          console.error('🏪 [ERROR] RPC error:', error.message);
          throw error;
        }
        
        console.log('🏪 [SUCCESS] RPC result:', { dataLength: data?.length, firstCompany: data?.[0]?.name });
        companyData = data && data.length > 0 ? data[0] : null;
        
      } catch (rpcError) {
        console.error('🏪 [FALLBACK] RPC failed, trying direct query:', rpcError);
        
        try {
          console.log('🏪 [STEP 2] Tentative requête directe...');
          
          const { data: directData, error: directError } = await supabase
            .from('companies')
            .select('*')
            .eq('slug', companySlug)
            .eq('is_active', true)
            .single();
          
          if (directError && directError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('🏪 [ERROR] Direct query error:', directError.message);
            throw directError;
          }
          
          console.log('🏪 [SUCCESS] Direct query result:', directData?.name || 'None');
          companyData = directData;
          
        } catch (directError) {
          console.error('🏪 [FATAL] Both RPC and direct query failed:', directError);
          throw directError;
        }
      }
      
      console.log('🏪 [FINAL] Company result:', companyData?.name || 'Not found');
      return companyData;
    },
    enabled: !!companySlug,
    retry: 3,
    retryDelay: 1000,
    staleTime: 60000, // Cache pendant 1 minute
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
