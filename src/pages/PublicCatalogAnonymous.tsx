
import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Container from "@/components/layout/Container";
import CatalogHeader from "@/components/catalog/public/CatalogHeader";
import PublicProductGrid from "@/components/catalog/public/PublicProductGrid";
import SimpleHeader from "@/components/catalog/public/SimpleHeader";
import PublicCatalogSidebar from "@/components/catalog/public/filters/PublicCatalogSidebar";
import FilterMobileToggle from "@/components/catalog/public/filters/FilterMobileToggle";
import { getPublicProducts } from "@/services/catalogService";
import { useQuery } from "@tanstack/react-query";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";
import { usePublicProductFilter } from "@/hooks/products/usePublicProductFilter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";

const PublicCatalogAnonymous = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { companySlug } = useParams<{ companySlug: string }>();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  console.log('📱 PUBLIC CATALOG - Component rendered with:', {
    companySlug,
    pathname: location.pathname,
    search: location.search,
    origin: window.location.origin,
    href: window.location.href
  });

  // Force detection to run
  const { 
    companyId, 
    isLoadingCompanyId, 
    detectionError,
    companySlug: detectedSlug
  } = useCompanyDetection();

  console.log('📱 PUBLIC CATALOG - Company detection result:', {
    companyId,
    isLoadingCompanyId,
    detectionError,
    detectedSlug
  });

  // Clear potentially stale cache when component mounts or company changes
  useEffect(() => {
    console.log('📱 PUBLIC CATALOG - Clearing stale cache for company change');
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.removeQueries({ queryKey: ['products'] });
  }, [companyId, queryClient]);

  // Fetch products data
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['public-products', companyId],
    queryFn: () => getPublicProducts(companyId!),
    enabled: !!companyId,
  });

  // Initialize filters
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    isPriceFilterActive,
    selectedBrands,
    setSelectedBrands,
    filteredProducts,
    categories,
    brands,
    priceRangeLimits,
    resetFilters
  } = usePublicProductFilter(products);

  // For now, we'll get company info from the detection hook result
  const company = detectedSlug ? { name: detectedSlug, logo_url: undefined } : null;

  console.log('📱 PUBLIC CATALOG - Products data:', {
    productsCount: products?.length || 0,
    filteredCount: filteredProducts?.length || 0,
    company: company?.name,
    isLoadingProducts,
    productsError
  });

  // Loading state
  if (isLoadingCompanyId) {
    console.log('📱 PUBLIC CATALOG - Showing company detection loading');
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader />
        <Container className="max-w-[1320px]">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Détection de l'entreprise...</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Company detection error
  if (detectionError && !companyId) {
    console.error('📱 PUBLIC CATALOG - Company detection error:', detectionError);
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader />
        <Container className="max-w-[1320px]">
          <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors de la détection de l'entreprise. Veuillez réessayer.
              <br />
              <small>Erreur: {detectionError.message}</small>
            </AlertDescription>
          </Alert>
        </Container>
      </div>
    );
  }

  // No company found
  if (!companyId && !isLoadingCompanyId) {
    console.warn('📱 PUBLIC CATALOG - No company detected');
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader />
        <Container className="max-w-[1320px]">
          <Alert className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune entreprise trouvée pour cette URL.
              <br />
              <small>Slug recherché: {companySlug || 'N/A'}</small>
            </AlertDescription>
          </Alert>
        </Container>
      </div>
    );
  }

  // Products loading
  if (isLoadingProducts) {
    console.log('📱 PUBLIC CATALOG - Showing products loading');
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader companyId={companyId} companyLogo={company?.logo_url} companyName={company?.name} />
        <Container className="max-w-[1320px]">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement du catalogue...</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Products error
  if (productsError) {
    console.error('📱 PUBLIC CATALOG - Products error:', productsError);
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader companyId={companyId} companyLogo={company?.logo_url} companyName={company?.name} />
        <Container className="max-w-[1320px]">
          <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement des produits.
              <br />
              <small>Erreur: {productsError.message}</small>
            </AlertDescription>
          </Alert>
        </Container>
      </div>
    );
  }

  console.log('📱 PUBLIC CATALOG - Rendering catalog with products:', filteredProducts?.length || 0);

  return (
    <div className="min-h-screen bg-white">
      <SimpleHeader companyId={companyId} companyLogo={company?.logo_url} companyName={company?.name} />
      
      <FilterMobileToggle
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        resultsCount={filteredProducts.length}
      />
      
      <div className="flex">
        <PublicCatalogSidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          priceRange={priceRange}
          priceRangeLimits={priceRangeLimits}
          onPriceRangeChange={setPriceRange}
          isPriceFilterActive={isPriceFilterActive}
          brands={brands}
          selectedBrands={selectedBrands}
          onBrandChange={setSelectedBrands}
          onResetFilters={resetFilters}
          resultsCount={filteredProducts.length}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <main className="flex-1 lg:ml-0">
          <Container className="py-6 max-w-[1200px]">
            <div className="space-y-8">
              <CatalogHeader 
                companyName={company?.name}
                companyLogo={company?.logo_url}
              />
              
              <PublicProductGrid products={filteredProducts} />
            </div>
          </Container>
        </main>
      </div>
    </div>
  );
};

export default PublicCatalogAnonymous;
