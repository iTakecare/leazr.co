
import React, { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Container from "@/components/layout/Container";
import CatalogHeader from "@/components/catalog/public/CatalogHeader";
import PublicProductGrid from "@/components/catalog/public/PublicProductGrid";
import PublicPackGrid from "@/components/catalog/public/PublicPackGrid";
import InlinePublicProductDetail from "@/components/catalog/public/InlinePublicProductDetail";
import InlinePublicCart from "@/components/catalog/public/InlinePublicCart";
import InlineRequestSteps from "@/components/catalog/public/InlineRequestSteps";

import PublicFilterSidebar from "@/components/catalog/public/filters/PublicFilterSidebar";
import FilterMobileToggle from "@/components/catalog/public/filters/FilterMobileToggle";
import FilterBadges from "@/components/catalog/public/filters/FilterBadges";
import SortFilter from "@/components/catalog/public/filters/SortFilter";
import { getPublicProductsOptimized, getPublicPacksOptimized } from "@/services/catalogServiceOptimized";
import { useQuery } from "@tanstack/react-query";
import { useOptimizedCatalogFilter } from "@/hooks/products/useOptimizedCatalogFilter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { CompanyProvider } from "@/context/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface PublicCatalogAnonymousProps {
  company?: Company;
}

const PublicCatalogAnonymous: React.FC<PublicCatalogAnonymousProps> = ({ company: providedCompany }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { companySlug } = useParams<{ companySlug: string }>();
  const { settings } = useSiteSettings();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'packs'>('products');
  
  // State for inline views
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'product-detail' | 'cart' | 'request-steps'>('grid');
  
  // Fetch company by slug if not provided (fallback for legacy routes)
  const { data: fetchedCompany, isLoading: isLoadingCompany, error: companyError } = useQuery({
    queryKey: ['company-by-slug', companySlug],
    queryFn: async () => {
      if (!companySlug) return null;
      
      try {
        console.log('📱 Fetching company (fallback):', companySlug);
      } catch (e) {}
      
      const { data, error } = await supabase
        .rpc('get_company_by_slug', { company_slug: companySlug });
      
      if (error) {
        console.error('📱 Company error (fallback):', error.message);
        throw error;
      }
      
      try {
        console.log('📱 Company loaded (fallback):', data?.[0]?.name || 'None');
      } catch (e) {}
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!companySlug && !providedCompany,
  });

  // Use provided company or fetch fallback
  const company = providedCompany || fetchedCompany;
  
  // Safari-compatible logging
  try {
    console.log('📱 PUBLIC CATALOG - Rendering for:', company?.name || 'undefined');
  } catch (e) {
    // Silent fail for Safari compatibility
  }

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

  // Optimized products fetch
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: ['public-products-optimized', companyId],
    queryFn: () => getPublicProductsOptimized(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false
  });

  // Optimized packs fetch
  const { data: packs = [], isLoading: isLoadingPacks, error: packsError } = useQuery({
    queryKey: ['public-packs-optimized', companyId],
    queryFn: () => getPublicPacksOptimized(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnWindowFocus: false
  });

  // Optimized filter system
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
  } = useOptimizedCatalogFilter(products);

  // Simplified resize handler
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileFilterOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigation handlers
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    setViewMode('product-detail');
  };

  const handleBackToCatalog = () => {
    setSelectedProductId(null);
    setViewMode('grid');
  };

  const handleCartClick = () => {
    setViewMode('cart');
  };

  const handleRequestQuote = () => {
    setViewMode('request-steps');
  };

  const handleBackToCart = () => {
    setViewMode('cart');
  };

  const handleRequestCompleted = () => {
    // Clear cart and return to catalog
    setViewMode('grid');
  };

  // Loading state for company fetch
  if (isLoadingCompany) {
    return (
      <div className="min-h-screen bg-white">
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
    return (
      <div className="min-h-screen bg-white">
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

  // Early return if no company data
  if (!company) {
    return (
      <div className="min-h-screen bg-white">
        <Container className="max-w-[1320px]">
          <Alert className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Entreprise non trouvée pour le slug: <strong>{companySlug}</strong>
            </AlertDescription>
          </Alert>
        </Container>
      </div>
    );
  }

  // Products and packs loading
  if (isLoadingProducts || isLoadingPacks) {
    console.log('📱 PUBLIC CATALOG - Showing catalog loading');
    return (
      <div className="min-h-screen bg-white">
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

  // Products or packs error
  if (productsError || packsError) {
    console.error('📱 PUBLIC CATALOG - Catalog error:', productsError || packsError);
    return (
      <div className="min-h-screen bg-white">
        <Container className="max-w-[1320px]">
          <Alert variant="destructive" className="max-w-lg mx-auto mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erreur lors du chargement du catalogue.
              <br />
              <small>Erreur: {(productsError || packsError)?.message}</small>
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
    <CompanyProvider company={company}>
      <div className="min-h-screen bg-white">
        <Container className="py-6 max-w-[1320px]">
          <div className="space-y-8">
            <CatalogHeader 
              companyName={company?.name}
              companyLogo={company?.logo_url}
              companyId={companyId}
              onCartClick={handleCartClick}
              headerEnabled={settings?.header_enabled ?? true}
              headerTitle={settings?.header_title}
              headerDescription={settings?.header_description}
              headerBackgroundType={settings?.header_background_type}
              headerBackgroundConfig={settings?.header_background_config}
              onRequestQuote={handleRequestQuote}
            />
            
            {/* Show cart view */}
            {viewMode === 'cart' && (
              <InlinePublicCart
                onBackToCatalog={handleBackToCatalog}
                onRequestQuote={handleRequestQuote}
              />
            )}

            {/* Show request steps view */}
            {viewMode === 'request-steps' && (
              <InlineRequestSteps
                companyId={company?.id}
                onBackToCart={handleBackToCart}
                onRequestCompleted={handleRequestCompleted}
              />
            )}

            {/* Show catalog grid/detail view */}
            {viewMode !== 'cart' && viewMode !== 'request-steps' && (
              <div className="flex gap-6">
                {/* Filter Sidebar - Only show in grid view */}
                {viewMode === 'grid' && (
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
                )}

                {/* Main Content */}
                <div className={`${viewMode === 'grid' ? 'flex-1' : 'w-full'} space-y-6`}>
                  {/* Header with mobile toggle and sort - Only show in grid view */}
                  {viewMode === 'grid' && (
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FilterMobileToggle
                      isOpen={isMobileFilterOpen}
                      onToggle={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                      filterCount={
                        (filters.searchQuery ? 1 : 0) +
                        (filters.selectedCategory ? 1 : 0) +
                        filters.selectedBrands.length +
                         (filters.inStockOnly ? 1 : 0)
                      }
                    />
                     <div className="text-sm text-muted-foreground">
                       {activeTab === 'products' 
                         ? `${resultsCount} produit${resultsCount > 1 ? 's' : ''} trouvé${resultsCount > 1 ? 's' : ''}` 
                         : `${packs.length} pack${packs.length > 1 ? 's' : ''} disponible${packs.length > 1 ? 's' : ''}`
                       }
                     </div>
                  </div>

                  <SortFilter
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSortByChange={(value) => updateFilter('sortBy', value)}
                    onSortOrderChange={(value) => updateFilter('sortOrder', value)}
                    />
                    </div>
                  )}

                   {/* Tabs for Products and Packs - Only show in grid view */}
                   {viewMode === 'grid' && (
                 <div className="flex border-b border-gray-200">
                   <button
                     onClick={() => setActiveTab('products')}
                     className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                       activeTab === 'products'
                         ? 'border-[#4ab6c4] text-[#4ab6c4]'
                         : 'border-transparent text-gray-500 hover:text-gray-700'
                     }`}
                   >
                     Produits ({products.length})
                   </button>
                   <button
                     onClick={() => setActiveTab('packs')}
                     className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                       activeTab === 'packs'
                         ? 'border-[#4ab6c4] text-[#4ab6c4]'
                         : 'border-transparent text-gray-500 hover:text-gray-700'
                     }`}
                   >
                      Packs ({packs.length})
                    </button>
                    </div>
                   )}

                 {activeTab === 'products' && (
                   <>
                      {/* Active Filter Badges - Only show in grid view */}
                      {viewMode === 'grid' && (
                        <FilterBadges
                          searchQuery={filters.searchQuery}
                          selectedCategory={filters.selectedCategory}
                          selectedBrands={filters.selectedBrands}
                          inStockOnly={filters.inStockOnly}
                          categoryTranslation={categories.find(c => c.name === filters.selectedCategory)?.translation}
                          onRemoveSearch={() => updateFilter('searchQuery', '')}
                          onRemoveCategory={() => updateFilter('selectedCategory', '')}
                          onRemoveBrand={(brand) => updateFilter('selectedBrands', filters.selectedBrands.filter(b => b !== brand))}
                          onRemoveStock={() => updateFilter('inStockOnly', false)}
                          onClearAll={resetFilters}
                        />
                      )}

                      {/* Product Grid or Detail View */}
                       {viewMode === 'grid' && (
                         <PublicProductGrid 
                           products={filteredProducts || []}
                           onProductSelect={handleProductSelect}
                         />
                       )}
                       
                       {viewMode === 'product-detail' && selectedProductId && (
                         <InlinePublicProductDetail
                           companyId={company.id}
                           companySlug={companySlug || company.slug}
                           productId={selectedProductId}
                           company={company}
                           onBackToCatalog={handleBackToCatalog}
                         />
                       )}
                   </>
                 )}

                  {activeTab === 'packs' && viewMode === 'grid' && (
                    <div className="space-y-6">
                      {/* Pack Grid */}
                      <PublicPackGrid packs={packs || []} companySlug={companySlug} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Container>
      </div>
    </CompanyProvider>
  );
};

export default PublicCatalogAnonymous;
