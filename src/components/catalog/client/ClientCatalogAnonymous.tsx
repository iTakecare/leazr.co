import React, { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Container from "@/components/layout/Container";
import ClientProductGrid from "@/components/catalog/client/ClientProductGrid";
import PublicPackGrid from "@/components/catalog/public/PublicPackGrid";
import ClientProductDetail from "@/components/catalog/client/ClientProductDetail";
import { ArrowLeft } from "lucide-react";
import PublicFilterSidebar from "@/components/catalog/public/filters/PublicFilterSidebar";
import FilterMobileToggle from "@/components/catalog/public/filters/FilterMobileToggle";
import FilterBadges from "@/components/catalog/public/filters/FilterBadges";
import SortFilter from "@/components/catalog/public/filters/SortFilter";
import { getPublicProductsOptimized, getPublicPacksOptimized, getClientCustomCatalog } from "@/services/catalogServiceOptimized";
import { Client } from "@/types/client";
import { useQuery } from "@tanstack/react-query";
import { useOptimizedCatalogFilter } from "@/hooks/products/useOptimizedCatalogFilter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, ShoppingCart } from "lucide-react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { CompanyProvider } from "@/context/CompanyContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  modules_enabled?: string[];
}

interface ClientCatalogAnonymousProps {
  company: Company;
  clientData?: Client | null;
}

const ClientCatalogAnonymous: React.FC<ClientCatalogAnonymousProps> = ({ company, clientData }) => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { companySlug } = useParams<{ companySlug: string }>();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'packs'>('products');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const { cartCount } = useCart();
  
  const companyId = company?.id;

  // Safari-compatible logging
  try {
    console.log('📱 CLIENT CATALOG - Rendering for company:', company?.name || 'undefined');
  } catch (e) {
    // Silent fail for Safari compatibility
  }

  // Clear stale product data when company changes (optimized for Safari)
  const prevCompanyId = useRef<string | null>(null);
  useEffect(() => {
    if (companyId && companyId !== prevCompanyId.current) {
      // Only invalidate if company actually changed
      queryClient.removeQueries({ queryKey: ['products'], exact: false });
      prevCompanyId.current = companyId;
    }
  }, [companyId, queryClient]);

  // Détecter si le client a un catalogue personnalisé
  const hasCustomCatalog = clientData?.has_custom_catalog === true;
  const clientId = clientData?.id;

  // Optimized products fetch - utilise le catalogue personnalisé si disponible
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: hasCustomCatalog ? ['client-custom-catalog', clientId] : ['public-products-optimized', companyId],
    queryFn: () => hasCustomCatalog && clientId 
      ? getClientCustomCatalog(clientId) 
      : getPublicProductsOptimized(companyId!),
    enabled: !!companyId && (hasCustomCatalog ? !!clientId : true),
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

  // Product selection handlers
  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
  };

  const handleBackToGrid = () => {
    setSelectedProductId(null);
  };

  // Products and packs loading
  if (isLoadingProducts || isLoadingPacks) {
    console.log('📱 CLIENT CATALOG - Showing catalog loading');
    return (
      <div className="min-h-screen bg-white">
        <Container className="max-w-[1320px] pt-6">
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
    console.error('📱 CLIENT CATALOG - Catalog error:', productsError || packsError);
    return (
      <div className="min-h-screen bg-white">
        <Container className="max-w-[1320px] pt-6">
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
    console.log('📱 CLIENT CATALOG - Rendering products:', filteredProducts?.length || 0);
  } catch (e) {}

  return (
    <CompanyProvider company={company}>
      <div className="min-h-screen bg-white">        
        <Container className="py-6 max-w-[1320px]">
          <div className="space-y-8">
            
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
                  <div className="flex items-center gap-4 flex-wrap">
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
                     {hasCustomCatalog && activeTab === 'products' && (
                       <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                         ✨ Prix personnalisés
                       </div>
                     )}
                  </div>

                  <SortFilter
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSortByChange={(value) => updateFilter('sortBy', value)}
                    onSortOrderChange={(value) => updateFilter('sortOrder', value)}
                  />
                </div>

                 {/* Tabs for Products and Packs with Cart Icon */}
                 <div className="flex border-b border-gray-200 justify-between items-center">
                   <div className="flex">
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
                   
                     {/* Cart Icon */}
                     <button
                       onClick={() => navigate(`/${companySlug}/client/panier`)}
                       className="relative p-2 text-gray-600 hover:text-[#4ab6c4] transition-colors"
                     >
                     <ShoppingCart className="h-6 w-6" />
                     {cartCount > 0 && (
                       <span className="absolute -top-1 -right-1 bg-[#4ab6c4] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                         {cartCount}
                       </span>
                     )}
                   </button>
                 </div>

                  {activeTab === 'products' && (
                    <>
                      {selectedProductId ? (
                        /* Product Detail View */
                        <div className="space-y-4">
                          <button
                            onClick={handleBackToGrid}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Retour au catalogue
                          </button>
                          <ClientProductDetail
                            companyId={company.id}
                            companySlug={company.slug}
                            productId={selectedProductId}
                            clientId={clientId || ""}
                            company={company}
                            onBackToCatalog={handleBackToGrid}
                          />
                        </div>
                      ) : (
                        /* Product Grid View */
                        <>
                          {/* Active Filter Badges */}
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

                          {/* Client Product Grid */}
                          <ClientProductGrid 
                            products={filteredProducts || []} 
                            onProductSelect={handleProductSelect}
                          />
                        </>
                      )}
                    </>
                  )}

                 {activeTab === 'packs' && (
                   <div className="space-y-6">
                     {/* Pack Grid */}
                     <PublicPackGrid packs={packs || []} companySlug={companySlug} />
                   </div>
                 )}
              </div>
            </div>
          </div>
        </Container>
      </div>
    </CompanyProvider>
  );
};

export default ClientCatalogAnonymous;