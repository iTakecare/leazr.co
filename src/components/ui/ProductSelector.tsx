
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

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  title?: string;
  description?: string;
}

// Interface pour les produits et leurs variantes
interface ProductVariant {
  id: string;
  price: number;
  monthly_price?: number;
  attributes: Record<string, any>;
}

interface Product {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  price: number;
  monthly_price?: number;
  image_url?: string;
  active: boolean;
  variants?: ProductVariant[];
  is_parent?: boolean;
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
  const [selectedTab, setSelectedTab] = useState("tous");
  
  // Fonction pour récupérer les produits depuis Supabase
  const fetchProducts = async (): Promise<Product[]> => {
    console.log("Fetching products from Supabase");
    
    try {
      // Récupérer les produits
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      
      if (productsError) {
        console.error("Error fetching products:", productsError);
        throw productsError;
      }
      
      console.log(`Retrieved ${productsData.length} products`);
      
      // Récupérer les variantes pour les produits
      const { data: variantsData, error: variantsError } = await supabase
        .from("product_variant_prices")
        .select("*");
      
      if (variantsError) {
        console.error("Error fetching variants:", variantsError);
        throw variantsError;
      }
      
      console.log(`Retrieved ${variantsData.length} variants`);
      
      // Organiser les variantes par produit parent
      const variantsByProductId: Record<string, ProductVariant[]> = {};
      
      variantsData.forEach(variant => {
        if (!variantsByProductId[variant.product_id]) {
          variantsByProductId[variant.product_id] = [];
        }
        variantsByProductId[variant.product_id].push({
          id: variant.id,
          price: variant.price || 0,
          monthly_price: variant.monthly_price || 0,
          attributes: variant.attributes || {}
        });
      });
      
      // Ajouter les variantes aux produits
      const processedProducts = productsData.map(product => {
        const variants = variantsByProductId[product.id] || [];
        const isParent = variants.length > 0;
        
        return {
          ...product,
          variants,
          is_parent: isParent
        };
      });
      
      return processedProducts;
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
        toast.error("Erreur lors du chargement des produits");
      }
    }
  });

  // Obtenir les catégories uniques pour les filtres
  const categories: string[] = products 
    ? [...new Set(products.map(product => product.category))]
      .filter((category): category is string => typeof category === 'string' && Boolean(category))
    : [];
    
  // Filtrer les produits en fonction de la recherche et de la catégorie
  const getFilteredProducts = () => {
    if (!products) return [];
    
    let filtered = products;
    
    // Filtrer par texte de recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) || 
        (product.brand || '').toLowerCase().includes(query) ||
        (product.description || '').toLowerCase().includes(query)
      );
    }
    
    // Filtrer par catégorie
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filtrer par type de produit (parent, variante, individuel)
    if (selectedTab === "parents") {
      filtered = filtered.filter(product => product.is_parent);
    } else if (selectedTab === "variantes") {
      filtered = filtered.filter(product => product.variants && product.variants.length > 0);
    } else if (selectedTab === "individuels") {
      filtered = filtered.filter(product => !product.is_parent && (!product.variants || product.variants.length === 0));
    }
    
    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  const handleSelectProduct = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };
  
  useEffect(() => {
    // Si on ouvre le sélecteur, réinitialiser les filtres
    if (isOpen) {
      setSearchQuery("");
      setSelectedCategory("all");
      setSelectedTab("tous");
    }
  }, [isOpen]);

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

          <Tabs 
            value={selectedCategory} 
            onValueChange={setSelectedCategory}
            className="flex-1 flex flex-col"
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
            
            <div className="px-4 py-2 border-b">
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="tous" className="flex-1">Tous</TabsTrigger>
                  <TabsTrigger value="parents" className="flex-1">Parents</TabsTrigger>
                  <TabsTrigger value="variantes" className="flex-1">Variantes</TabsTrigger>
                  <TabsTrigger value="individuels" className="flex-1">Individuels</TabsTrigger>
                </TabsList>
              </Tabs>
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
                <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                  <Info className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-lg font-medium">Aucun produit trouvé</p>
                  <p className="text-sm mt-1">Essayez de modifier vos critères de recherche</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="cursor-pointer" onClick={() => handleSelectProduct(product)}>
                      <ProductCard product={product} />
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
