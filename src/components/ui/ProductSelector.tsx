
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import ProductGridCard from "@/components/catalog/public/ProductGridCard";

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  title?: string;
  description?: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  title = "Sélectionner un produit",
  description = "Parcourez notre catalogue pour ajouter un produit à votre offre"
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fonction pour récupérer les produits depuis Supabase
  const fetchProducts = async () => {
    console.log("Fetching products from Supabase");
    
    try {
      let query = supabase
        .from("products")
        .select(`
          *,
          variants:product_variant_prices(*)
        `)
        .eq("active", true);
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching products:", error);
        throw error;
      }
      
      // Traiter les données pour formater correctement les variantes
      const processedData = data.map(product => {
        if (product.variants && product.variants.length > 0) {
          return {
            ...product,
            is_parent: true
          };
        }
        return product;
      });
      
      console.log(`Retrieved ${processedData.length} products`);
      return processedData;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw error;
    }
  };

  // Utiliser React Query pour récupérer les produits
  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    meta: {
      onError: (err: Error) => {
        console.error("Products query failed:", err);
      }
    }
  });

  // Obtenir les catégories uniques pour les filtres
  const categories: string[] = products 
    ? [...new Set(products.map(product => product.category))]
      .filter((category): category is string => typeof category === 'string' && Boolean(category))
    : [];

  // Filtrer les produits en fonction de la recherche et de la catégorie
  const filteredProducts = products 
    ? products.filter(product => {
        const matchesSearch = searchQuery.trim() === "" || 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.brand && product.brand.toLowerCase().includes(searchQuery.toLowerCase()));
        
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      })
    : [];

  const handleSelectProduct = (product: any) => {
    onSelectProduct(product);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden">
        <div className="flex flex-col h-full">
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

          <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1 flex flex-col">
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
            
            <ScrollArea className="flex-1 p-4">
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
                <div className="text-center p-8 text-gray-500">
                  <p>Aucun produit trouvé.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="cursor-pointer" onClick={() => handleSelectProduct(product)}>
                      <ProductGridCard product={product} onClick={() => handleSelectProduct(product)} />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSelector;
