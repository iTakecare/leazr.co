
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, Info } from "lucide-react";
import ProductCard from "./ProductCard";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useProductMapper } from "@/hooks/products/useProductMapper";
import { jsonToStringArrayRecord } from "@/utils/typeMappers";

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onViewVariants?: (product: Product, e: React.MouseEvent) => void;
  title?: string;
  description?: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onViewVariants,
  title = "Sélectionner un produit",
  description = "Parcourez notre catalogue pour ajouter un produit à votre offre"
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTab, setSelectedTab] = useState("tous");
  
  const { mapDatabaseProductsToAppProducts } = useProductMapper();
  
  const fetchProducts = async (): Promise<Product[]> => {
    console.log("Fetching products from Supabase");
    
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      
      if (productsError) {
        console.error("Error fetching products:", productsError);
        throw productsError;
      }
      
      console.log(`Retrieved ${productsData?.length} products`);
      
      const { data: variantPricesData, error: variantPricesError } = await supabase
        .from("product_variant_prices")
        .select("*");
      
      if (variantPricesError) {
        console.error("Error fetching variant prices:", variantPricesError);
        throw variantPricesError;
      }
      
      console.log(`Retrieved ${variantPricesData?.length} variant prices`);
      
      // Map products from DB format to app format
      const mappedProducts = mapDatabaseProductsToAppProducts(productsData || []);
      
      console.log("Processed products with variants:", mappedProducts.length);
      return mappedProducts;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw error;
    }
  };

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products-selector"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
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
    
    if (selectedTab === "parents") {
      filtered = filtered.filter(product => 
        product.is_parent || 
        (product.variant_combination_prices && product.variant_combination_prices.length > 0)
      );
    } else if (selectedTab === "variantes") {
      filtered = filtered.filter(product => product.is_variation);
    }
    
    return filtered;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <SheetClose asChild>
              <Button variant="outline">Fermer</Button>
            </SheetClose>
          </div>
        </div>
        
        <div className="p-4 border-b">
          <Tabs
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            className="w-full"
          >
            <TabsList className="w-full flex-wrap h-auto">
              <TabsTrigger value="all" className="mb-1">
                Toutes catégories
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger key={category} value={category} className="mb-1">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        <div className="p-4 border-b">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger value="tous">Tous les produits</TabsTrigger>
              <TabsTrigger value="parents">Modèles</TabsTrigger>
              <TabsTrigger value="variantes">Variantes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <ScrollArea className="flex-1 h-[calc(100%-16rem)]">
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Info className="h-10 w-10 text-destructive mb-2" />
                <p className="text-muted-foreground">
                  Erreur lors du chargement des produits.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Actualiser
                </Button>
              </div>
            ) : getFilteredProducts().length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Aucun produit trouvé.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {getFilteredProducts().map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => onSelectProduct(product)}
                    onViewVariants={onViewVariants ? (e) => onViewVariants(product, e) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSelector;
