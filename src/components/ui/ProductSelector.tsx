
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, Info } from "lucide-react";
import CatalogProductCard from "./CatalogProductCard";
import { toast } from "sonner";
import { Product } from "@/types/catalog";

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
  
  const fetchProducts = async (): Promise<Product[]> => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      
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
      
      const productsWithVariants = productsData.map(product => {
        const productVariantPrices = variantPricesData.filter(price => 
          price.product_id === product.id
        );
        
        const isParent = productVariantPrices.length > 0;
        
        let variationAttributes = product.variation_attributes;
        if (isParent && (!variationAttributes || Object.keys(variationAttributes).length === 0)) {
          variationAttributes = extractVariationAttributes(productVariantPrices);
        }
        
        return {
          ...product,
          variant_combination_prices: productVariantPrices,
          is_parent: isParent || product.is_parent,
          variation_attributes: variationAttributes,
          createdAt: product.created_at || new Date(),
          updatedAt: product.updated_at || new Date()
        };
      });
      
      return productsWithVariants;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw error;
    }
  };
  
  const extractVariationAttributes = (variantPrices: any[]): Record<string, string[]> => {
    const attributes: Record<string, Set<string>> = {};
    
    variantPrices.forEach(price => {
      if (price.attributes) {
        Object.entries(price.attributes).forEach(([key, value]) => {
          if (!attributes[key]) {
            attributes[key] = new Set();
          }
          attributes[key].add(String(value));
        });
      }
    });
    
    const result: Record<string, string[]> = {};
    Object.entries(attributes).forEach(([key, values]) => {
      result[key] = Array.from(values);
    });
    
    return result;
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
    
    return filtered;
  };

  const filteredProducts = getFilteredProducts();
  
  const handleProductSelect = (product: Product) => {
    onSelectProduct(product);
  };
  
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        
        <div className="p-4 border-b">
          <div className="flex gap-2 items-center">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <SheetClose asChild>
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </SheetClose>
          </div>
        </div>

        <Tabs 
          value={selectedCategory} 
          onValueChange={setSelectedCategory}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-4 py-2 border-b overflow-x-auto">
            <TabsList className="w-auto inline-flex">
              <TabsTrigger value="all">Tous</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-4 pb-24">
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
                <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                  <Info className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-lg font-medium">Aucun produit trouvé</p>
                  <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="cursor-pointer">
                      <CatalogProductCard 
                        product={product} 
                        onClick={() => handleProductSelect(product)}
                        onViewVariants={onViewVariants ? (e) => onViewVariants(product, e) : undefined}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSelector;
