
import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { findProductBySlugDirectly } from '@/services/productServiceOptimized';
import PublicProductDetail from './PublicProductDetail';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import Container from '@/components/layout/Container';

const PublicSlugProductBySlug = () => {
  const { companySlug, productSlug } = useParams<{ companySlug: string; productSlug: string }>();
  
  console.log('🔗 PublicSlugProductBySlug rendered with:', { companySlug, productSlug });
  
  // Reserved keywords that should redirect to proper routes
  const reservedKeywords = ['admin', 'ambassador', 'ambassadors', 'client', 'api', 'dashboard', 'login', 'register', 'signup', 'contracts', 'solutions', 'services', 'ressources', 'about', 'a-propos', 'contact', 'support', 'help', 'catalog', 'products', 'pricing', 'tarifs', 'features', 'blog', 'news', 'home', 'create-offer'];
  
  // Check if companySlug is a reserved keyword and redirect appropriately
  if (companySlug && reservedKeywords.includes(companySlug.toLowerCase())) {
    console.log('🔗 PublicSlugProductBySlug - Reserved keyword detected:', companySlug, 'redirecting to proper route');
    
    // Extract product ID from productSlug if it contains UUID pattern
    const uuidMatch = productSlug?.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
    const productId = uuidMatch ? uuidMatch[1] : productSlug;
    
    if (companySlug === 'ambassador' && productId) {
      // Redirect to ambassador product route
      return <Navigate to={`/ambassador/products/${productId}`} replace />;
    }
    
    // For other reserved keywords, redirect to appropriate route or 404
    return <Navigate to="/" replace />;
  }
  
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

  // Fetch product by slug
  const { data: product, isLoading: isLoadingProduct, error: productError } = useQuery({
    queryKey: ['product-by-slug', company?.id, productSlug],
    queryFn: async () => {
      if (!company?.id || !productSlug) return null;
      
      const foundProduct = await findProductBySlugDirectly(company.id, productSlug);
      console.log('🎯 Product found by slug search:', foundProduct?.name || 'none');
      return foundProduct;
    },
    enabled: !!company?.id && !!productSlug,
  });

  // Loading state
  if (isLoadingCompany || isLoadingProduct) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du produit...</p>
          </div>
        </div>
      </Container>
    );
  }

  // Error or not found
  if (companyError || !company) {
    return (
      <Container>
        <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Entreprise non trouvée pour le slug: {companySlug}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (productError || !product) {
    return (
      <Container>
        <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Produit non trouvé pour le slug: {productSlug}
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  console.log('✅ Rendering PublicProductDetail for:', product.name);

  // Render the public product detail component
  return (
    <PublicProductDetail
      companyId={company.id}
      companySlug={companySlug!}
      productId={product.id}
      company={company}
    />
  );
};

export default PublicSlugProductBySlug;
