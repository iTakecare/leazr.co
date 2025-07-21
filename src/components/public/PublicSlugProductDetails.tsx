
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PublicProductDetail from './PublicProductDetail';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Container from '@/components/layout/Container';

const PublicSlugProductDetails = () => {
  const { companySlug, productId } = useParams<{ companySlug: string; productId: string }>();
  
  // Fetch company by slug
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async () => {
      if (!companySlug) return null;
      
      const { data, error } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!companySlug,
  });

  // Loading state
  if (isLoadingCompany) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
      </Container>
    );
  }

  // Error or not found
  if (companyError || !company || !productId) {
    return (
      <Container>
        <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {!company ? `Entreprise non trouvée pour le slug: ${companySlug}` : 'Produit non trouvé'}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  // Render the public product detail component
  return (
    <PublicProductDetail
      companyId={company.id}
      companySlug={companySlug!}
      productId={productId}
      company={company}
    />
  );
};

export default PublicSlugProductDetails;
