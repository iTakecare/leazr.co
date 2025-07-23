import React, { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Container from "@/components/layout/Container";
import AmbassadorProductGrid from "@/components/ambassador/AmbassadorProductGrid";
import PublicFilterSidebar from "@/components/catalog/public/filters/PublicFilterSidebar";
import FilterMobileToggle from "@/components/catalog/public/filters/FilterMobileToggle";
import FilterBadges from "@/components/catalog/public/filters/FilterBadges";
import SortFilter from "@/components/catalog/public/filters/SortFilter";
import { getPublicProducts } from "@/services/catalogService";
import { useQuery } from "@tanstack/react-query";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { usePublicProductFilter } from "@/hooks/products/usePublicProductFilter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Package } from "lucide-react";

const AmbassadorCatalogPage = () => {
  const queryClient = useQueryClient();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Get company info from multi-tenant context
  const { companyId } = useMultiTenant();

  // Clear potentially stale cache when component mounts or company changes
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.removeQueries({ queryKey: ['products'] });
  }, [companyId, queryClient]);

  // Fetch products data
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['ambassador-products', companyId],
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
  if (isLoadingProducts) {
    return (
      <Container className="max-w-[1320px]">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Chargement du catalogue...</p>
          </div>
        </div>
      </Container>
    );
  }

  // Products error
  if (productsError) {
    return (
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
    );
  }

  return (
    <Container className="py-6 max-w-[1320px]">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catalogue Produits</h1>
            <p className="text-muted-foreground">Consultez le catalogue complet de votre entreprise</p>
          </div>
        </div>
        
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
            <AmbassadorProductGrid products={filteredProducts || []} />
          </div>
        </div>
      </div>
    </Container>
  );
};

export default AmbassadorCatalogPage;