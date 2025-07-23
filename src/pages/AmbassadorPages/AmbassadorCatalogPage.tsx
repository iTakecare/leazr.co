import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Info, Package } from "lucide-react";
import CatalogProductCard from "@/components/ui/CatalogProductCard";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import { Product } from "@/types/catalog";
import { toast } from "sonner";

const AmbassadorCatalogPage = () => {
  const { companyId } = useMultiTenant();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
          brand_translation: product.brands?.translation || product.brand,
          category: product.categories?.name || product.category,
          category_translation: product.categories?.translation || product.category,
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

  const categories: string[] = products 
    ? [...new Set(products.map(product => product.category))]
      .filter((category): category is string => Boolean(category))
    : [];
    
  const getFilteredProducts = () => {
    if (!products) return [];
    
    let filtered = products;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query))
      );
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex w-full">
        <div className="flex-1 overflow-auto">
          <Container className="py-8 max-w-[1320px]">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Catalogue Produits</h1>
                <p className="text-muted-foreground">Consultez le catalogue complet de votre entreprise</p>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4 mb-8">
              <div className="flex gap-2 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Rechercher un produit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Tabs 
                value={selectedCategory} 
                onValueChange={setSelectedCategory}
                className="w-full"
              >
                <TabsList className="w-auto">
                  <TabsTrigger value="all">Tous ({products.length})</TabsTrigger>
                  {categories.map(category => {
                    const count = products.filter(p => p.category === category).length;
                    return (
                      <TabsTrigger key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            {/* Results count */}
            <div className="text-sm text-muted-foreground mb-4">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
            </div>

            {/* Product Grid */}
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Chargement des produits...</span>
                </div>
              ) : error ? (
                <div className="text-center p-8 text-red-500">
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
                    {searchQuery ? 
                      "Essayez de modifier vos critères de recherche" : 
                      "Aucun produit disponible dans cette catégorie"
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
                  {filteredProducts.map((product) => (
                    <div key={product.id}>
                      <CatalogProductCard 
                        product={product} 
                        onClick={() => {
                          // Simple consultation - pas de sélection pour panier
                          toast.info(`Consultation du produit: ${product.name}`);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Container>
        </div>
      </div>
    </PageTransition>
  );
};

export default AmbassadorCatalogPage;