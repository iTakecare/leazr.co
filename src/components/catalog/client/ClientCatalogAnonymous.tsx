import React, { useEffect, useState, useRef } from "react";
import WaveLoader from "@/components/ui/WaveLoader";
import { useQueryClient } from "@tanstack/react-query";
import Container from "@/components/layout/Container";
import PublicProductGrid from "@/components/catalog/public/PublicProductGrid";
import PublicPackGrid from "@/components/catalog/public/PublicPackGrid";
import InlinePublicProductDetail from "@/components/catalog/public/InlinePublicProductDetail";
import InlinePublicCart from "@/components/catalog/public/InlinePublicCart";
import InlineRequestSteps from "@/components/catalog/public/InlineRequestSteps";
import UnifiedNavigationBar from "@/components/layout/UnifiedNavigationBar";
import { getPublicProductsOptimized, getPublicPacksOptimized, getClientCustomCatalog } from "@/services/catalogServiceOptimized";
import { Client } from "@/types/client";
import { useQuery } from "@tanstack/react-query";
import { usePublicSimplifiedFilter } from "@/hooks/products/usePublicSimplifiedFilter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useParams, useLocation } from "react-router-dom";
import { CompanyProvider } from "@/context/CompanyContext";
import { useCart } from "@/context/CartContext";
import { useSiteSettingsByCompanyId } from "@/hooks/useSiteSettings";

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
  const { companySlug } = useParams<{ companySlug: string }>();
  const { cartCount } = useCart();
  const [activeTab, setActiveTab] = useState<'products' | 'packs'>('products');
  
  // State for inline views (same as public catalog)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'product-detail' | 'cart' | 'request-steps'>('grid');
  
  const companyId = company?.id;
  const { settings } = useSiteSettingsByCompanyId(companyId);

  // Clear stale product data when company changes
  const prevCompanyId = useRef<string | null>(null);
  useEffect(() => {
    if (companyId && companyId !== prevCompanyId.current) {
      queryClient.removeQueries({ queryKey: ['products'], exact: false });
      queryClient.removeQueries({ queryKey: ['public-products-optimized'], exact: false });
      queryClient.removeQueries({ queryKey: ['client-custom-catalog'], exact: false });
      prevCompanyId.current = companyId;
    }
  }, [companyId, queryClient]);

  // Detect custom catalog
  const hasCustomCatalog = clientData?.has_custom_catalog === true;
  const clientId = clientData?.id;

  // Products fetch - uses custom catalog if available
  const { data: products = [], isLoading: isLoadingProducts, error: productsError } = useQuery({
    queryKey: hasCustomCatalog ? ['client-custom-catalog', clientId] : ['public-products-optimized', companyId],
    queryFn: async () => {
      const result = hasCustomCatalog && clientId 
        ? await getClientCustomCatalog(clientId) 
        : await getPublicProductsOptimized(companyId!);
      return result;
    },
    enabled: !!companyId && (hasCustomCatalog ? !!clientId : true),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Packs fetch
  const { data: packs = [], isLoading: isLoadingPacks, error: packsError } = useQuery({
    queryKey: ['public-packs-optimized', companyId],
    queryFn: () => getPublicPacksOptimized(companyId!),
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Simplified filter system (same as public catalog)
  const {
    filters,
    updateFilter,
    resetFilters,
    filteredProducts,
    categories,
    hasActiveFilters,
    resultsCount
  } = usePublicSimplifiedFilter(products);

  // Navigation handlers (same as public catalog)
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
    setViewMode('grid');
  };

  // Loading
  if (isLoadingProducts || isLoadingPacks) {
    return (
      <div className="min-h-screen bg-white">
        <Container className="max-w-[1320px]">
          <div className="flex items-center justify-center min-h-[400px]">
            <WaveLoader message="Chargement du catalogue..." />
          </div>
        </Container>
      </div>
    );
  }

  // Error
  if (productsError || packsError) {
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

  return (
    <CompanyProvider company={company}>
      <div className="min-h-screen bg-white">
        {/* Unified Navigation Bar - identical to public catalog */}
        <UnifiedNavigationBar
          company={company}
          showFilters={viewMode === 'grid'}
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
          categories={categories}
          hasActiveFilters={hasActiveFilters}
          resultsCount={resultsCount}
          showCartButton={true}
          showQuoteButton={true}
          onCartClick={handleCartClick}
          onRequestQuote={handleRequestQuote}
          quoteLink={settings?.quote_request_url}
        />
        
        <Container className="py-6 max-w-[1320px]">
          <div className="space-y-8">
            <div className="space-y-6">

              {/* Custom pricing badge */}
              {hasCustomCatalog && viewMode === 'grid' && (
                <div className="flex justify-end">
                  <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">
                    ✨ Prix personnalisés
                  </div>
                </div>
              )}

              {/* Tabs for Products and Packs - identical style to public catalog */}
              {viewMode === 'grid' && (
                <div className={`flex ${!(settings?.header_enabled ?? true) ? '' : 'border-b border-gray-200'}`}>
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
                      onProductSelect={handleProductSelect}
                    />
                  )}
                </>
              )}

              {activeTab === 'packs' && viewMode === 'grid' && (
                <div className="space-y-6">
                  <PublicPackGrid packs={packs || []} companySlug={companySlug} />
                </div>
              )}

              {/* Cart View */}
              {viewMode === 'cart' && (
                <InlinePublicCart
                  onBackToCatalog={handleBackToCatalog}
                  onRequestQuote={handleRequestQuote}
                />
              )}

              {/* Request Steps View */}
              {viewMode === 'request-steps' && (
                <InlineRequestSteps
                  companyId={company?.id}
                  clientData={clientData}
                  onBackToCart={handleBackToCart}
                  onRequestCompleted={handleRequestCompleted}
                />
              )}
            </div>
          </div>
        </Container>
      </div>
    </CompanyProvider>
  );
};

export default ClientCatalogAnonymous;
