
import React, { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Container from "@/components/layout/Container";
import CatalogHeader from "@/components/catalog/public/CatalogHeader";
import PublicProductGrid from "@/components/catalog/public/PublicProductGrid";
import SimpleHeader from "@/components/catalog/public/SimpleHeader";
import PublicFilterSidebar from "@/components/catalog/public/filters/PublicFilterSidebar";
import FilterMobileToggle from "@/components/catalog/public/filters/FilterMobileToggle";
import FilterBadges from "@/components/catalog/public/filters/FilterBadges";
import SortFilter from "@/components/catalog/public/filters/SortFilter";
import { getPublicProducts } from "@/services/catalogService";
import { useQuery } from "@tanstack/react-query";
import { usePublicProductFilter } from "@/hooks/products/usePublicProductFilter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PublicCatalogAnonymous = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { companySlug } = useParams<{ companySlug: string }>();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Safari-compatible logging
  try {
    console.log('📱 PUBLIC CATALOG - Rendering for:', companySlug || 'undefined');
  } catch (e) {
    // Silent fail for Safari compatibility
  }

  // Fetch company by slug directly
  const { data: company, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async () => {
      if (!companySlug) return null;
      
      try {
        console.log('📱 Fetching company:', companySlug);
      } catch (e) {}
      
      const { data, error } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      if (error) {
        console.error('📱 Company error:', error.message);
        throw error;
      }
      
      try {
        console.log('📱 Company loaded:', data?.[0]?.name || 'None');
      } catch (e) {}
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!companySlug,
  });

  const companyId = company?.id;

  // Safari-compatible logging
  try {
    console.log('📱 Company status:', companyId ? 'Found' : 'Not found');
  } catch (e) {}

  // Clear stale product data when company changes (optimized for Safari)
  const prevCompanyId = useRef<string | null>(null);
  useEffect(() => {
    if (companyId && companyId !== prevCompanyId.current) {
      // Only invalidate if company actually changed
      queryClient.removeQueries({ queryKey: ['products'], exact: false });
      prevCompanyId.current = companyId;
    }
  }, [companyId, queryClient]);

  // Fetch products data
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['public-products', companyId],
    queryFn: () => getPublicProducts(companyId!),
    enabled: !!companyId,
  });

  // Initialize filter system
  const {
    filters,
    updateFilter,
    resetFilters,
    filteredProducts,
    categories,
    brands,
    priceRange,
    hasActiveFilters,
    resultsCount
  } = usePublicProductFilter(products);

  // Company info is now directly from the RPC call

  // Safari-compatible logging
  try {
    console.log('📱 Products loaded:', products?.length || 0);
  } catch (e) {}

  // Close mobile filter on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileFilterOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Loading state
  if (isLoadingCompany) {
    console.log('📱 PUBLIC CATALOG - Showing company loading');
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader />
        <Container className="max-w-[1320px]">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Chargement de l'entreprise...</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // Company error
  if (companyError) {
    console.error('📱 PUBLIC CATALOG - Company error:', companyError);
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader />
        <Container className="max-w-[1320px]">
          <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement de l'entreprise.
              <br />
              <small>Erreur: {companyError.message}</small>
            </AlertDescription>
          </Alert>
        </Container>
      </div>
    );
  }

  // No company found
  if (!company) {
    try {
      console.error('📱 No company found:', companySlug);
    } catch (e) {}
    return (
      <div className="min-h-screen bg-white">
        <SimpleHeader />
        <Container className="max-w-[1320px]">
          <Alert className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Entreprise non trouvée pour le slug: <strong>{companySlug}</strong>
              <br />
              <small className="text-xs">URL: {location.pathname}</small>
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

  // Safari-compatible logging
  try {
    console.log('📱 Rendering products:', filteredProducts?.length || 0);
  } catch (e) {}

  return (
    <div className="min-h-screen bg-white">
      <SimpleHeader companyId={companyId} companyLogo={company?.logo_url} companyName={company?.name} />
      
      <Container className="py-6 max-w-[1320px]">
        <div className="space-y-8">
          <CatalogHeader 
            companyName={company?.name}
            companyLogo={company?.logo_url}
          />
          
          <div className="flex gap-6">
            {/* Filter Sidebar */}
            <PublicFilterSidebar
              isOpen={isMobileFilterOpen}
              onClose={() => setIsMobileFilterOpen(false)}
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              categories={categories}
              brands={brands}
              priceRange={priceRange}
              hasActiveFilters={hasActiveFilters}
              resultsCount={resultsCount}
            />

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Header with mobile toggle and sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-4">
                  <FilterMobileToggle
                    isOpen={isMobileFilterOpen}
                    onToggle={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                    filterCount={
                      (filters.searchQuery ? 1 : 0) +
                      (filters.selectedCategory ? 1 : 0) +
                      filters.selectedBrands.length +
                      (filters.inStockOnly ? 1 : 0) +
                      (filters.priceRange[0] > priceRange[0] || filters.priceRange[1] < priceRange[1] ? 1 : 0)
                    }
                  />
                  <div className="text-sm text-muted-foreground">
                    {resultsCount} produit{resultsCount > 1 ? 's' : ''} trouvé{resultsCount > 1 ? 's' : ''}
                  </div>
                </div>

                <SortFilter
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onSortByChange={(value) => updateFilter('sortBy', value)}
                  onSortOrderChange={(value) => updateFilter('sortOrder', value)}
                />
              </div>

              {/* Active Filter Badges */}
              <FilterBadges
                searchQuery={filters.searchQuery}
                selectedCategory={filters.selectedCategory}
                selectedBrands={filters.selectedBrands}
                inStockOnly={filters.inStockOnly}
                categoryTranslation={categories.find(c => c.name === filters.selectedCategory)?.translation}
                onRemoveSearch={() => updateFilter('searchQuery', '')}
                onRemoveCategory={() => updateFilter('selectedCategory', null)}
                onRemoveBrand={(brand) => updateFilter('selectedBrands', filters.selectedBrands.filter(b => b !== brand))}
                onRemoveStock={() => updateFilter('inStockOnly', false)}
                onClearAll={resetFilters}
              />

              {/* Product Grid */}
              <PublicProductGrid products={filteredProducts || []} />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default PublicCatalogAnonymous;
