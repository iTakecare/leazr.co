import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Loader2, Info, Package } from "lucide-react";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import AmbassadorProductGrid from "@/components/ambassador/AmbassadorProductGrid";
import AmbassadorFilterSidebar from "@/components/ambassador/AmbassadorFilterSidebar";
import FilterBadges from "@/components/catalog/public/filters/FilterBadges";
import { useAmbassadorProductFilter } from "@/hooks/products/useAmbassadorProductFilter";

const AmbassadorCatalogPage = () => {
  const { companyId } = useMultiTenant();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchProducts = async (): Promise<Product[]> => {
    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          brands!inner(id, name, translation),
          categories!inner(id, name, translation)
        `)
        .eq("active", true);

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      const { data: productsData, error: productsError } = await query;
      
      if (productsError) {
        console.error("Error fetching products:", productsError);
        throw productsError;
      }
      
      const { data: variantPricesData, error: variantPricesError } = await supabase
        .from("product_variant_prices")
        .select("*");
      
      if (variantPricesError) {
        console.error("Error fetching variant prices:", variantPricesError);
        throw variantPricesError;
      }
      
      const productsWithVariants = productsData?.map(product => {
        const productVariantPrices = variantPricesData?.filter(price => 
          price.product_id === product.id
        ) || [];
        
        return {
          ...product,
          brand: product.brands?.name || product.brand,
          category: product.categories?.name || product.category,
          variant_combination_prices: productVariantPrices,
          is_parent: productVariantPrices.length > 0 || product.is_parent,
          createdAt: product.created_at || new Date(),
          updatedAt: product.updated_at || new Date()
        };
      }) || [];
      
      return productsWithVariants;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw error;
    }
  };

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["ambassador-catalog-products", companyId],
    queryFn: fetchProducts,
    enabled: !!companyId,
    meta: {
      onError: (err: Error) => {
        console.error("Products query failed:", err);
        toast.error("Erreur lors du chargement des produits");
      }
    }
  });

  // Use the ambassador product filter hook
  const {
    filters,
    updateFilter,
    resetFilters,
    filteredProducts,
    categories,
    brands,
    priceRangeLimits,
    hasActiveFilters,
    resultsCount
  } = useAmbassadorProductFilter(products || []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Global Header with Title */}
        <div className="bg-card border-b shadow-sm">
          <Container className="py-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Package className="h-8 w-8 text-primary" />
                <h1 className="text-4xl font-bold text-foreground">Catalogue Produits</h1>
              </div>
              <p className="text-muted-foreground text-lg">Consultez le catalogue complet de votre entreprise</p>
              
              {/* Mobile Filter Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(true)}
                className="lg:hidden mt-4"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
            </div>
          </Container>
        </div>

        {/* Main Content Area */}
        <div className="flex w-full">
          {/* Filter Sidebar */}
          <AmbassadorFilterSidebar
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            filters={filters}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            categories={categories}
            brands={brands}
            priceRange={priceRangeLimits}
            hasActiveFilters={hasActiveFilters}
            resultsCount={resultsCount}
          />

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <Container className="py-8 max-w-[1200px]">
              {/* Filter Badges */}
              {hasActiveFilters && (
                <div className="mb-6">
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
                </div>
              )}

              {/* Results count */}
              <div className="text-sm text-muted-foreground mb-6 font-medium">
                {resultsCount} produit{resultsCount > 1 ? 's' : ''} trouvé{resultsCount > 1 ? 's' : ''}
              </div>

              {/* Product Grid */}
              <div className="min-h-[calc(100vh-400px)]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Chargement des produits...</span>
                  </div>
                ) : error ? (
                  <div className="text-center p-8 text-destructive">
                    <p>Une erreur est survenue lors du chargement des produits.</p>
                    <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
                      Réessayer
                    </Button>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                    <Info className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-lg font-medium">Aucun produit trouvé</p>
                    <p className="text-sm mt-1">
                      {hasActiveFilters ? 
                        "Essayez de modifier vos critères de recherche" : 
                        "Aucun produit disponible"
                      }
                    </p>
                  </div>
                ) : (
                  <AmbassadorProductGrid products={filteredProducts} />
                )}
              </div>
            </Container>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default AmbassadorCatalogPage;