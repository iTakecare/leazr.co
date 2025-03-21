
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
  variation_attributes?: Record<string, string[]>;
  attributes?: Record<string, any>;
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
      // Récupérer les produits principaux
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      
      if (productsError) {
        console.error("Error fetching products:", productsError);
        throw productsError;
      }
      
      console.log(`Retrieved ${productsData.length} products`);
      
      // Récupérer les prix des variantes
      const { data: variantPricesData, error: variantPricesError } = await supabase
        .from("product_variant_prices")
        .select("*");
      
      if (variantPricesError) {
        console.error("Error fetching variant prices:", variantPricesError);
        throw variantPricesError;
      }
      
      console.log(`Retrieved ${variantPricesData.length} variant prices`);
      
      // Associer les prix de variantes aux produits parents
      const productsWithVariants = productsData.map(product => {
        // Pour chaque produit, chercher les prix de variante associés
        const productVariantPrices = variantPricesData.filter(price => 
          price.product_id === product.id
        );
        
        // Si le produit a des prix de variante, le marquer comme parent
        const isParent = productVariantPrices.length > 0;
        
        // Créer un objet produit enrichi
        return {
          ...product,
          variant_combination_prices: productVariantPrices,
          is_parent: isParent || product.is_parent,
          // Si le produit a des variation_attributes définis, les utiliser
          variation_attributes: product.variation_attributes || 
            // Sinon, extraire les attributs uniques des prix de variante
            (isParent ? extractVariationAttributes(productVariantPrices) : undefined)
        };
      });
      
      console.log("Processed products:", productsWithVariants);
      return productsWithVariants;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw error;
    }
  };
  
  // Extraire les attributs de variation des prix de variante
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
    
    // Convertir les Set en Array
    const result: Record<string, string[]> = {};
    Object.entries(attributes).forEach(([key, values]) => {
      result[key] = Array.from(values);
    });
    
    return result;
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
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query))
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
      // Pour les variantes, nous cherchons des produits avec des attributs de variation
      filtered = filtered.filter(product => 
        product.variation_attributes && 
        Object.keys(product.variation_attributes).length > 0
      );
    } else if (selectedTab === "individuels") {
      filtered = filtered.filter(product => 
        !product.is_parent && 
        (!product.variation_attributes || Object.keys(product.variation_attributes).length === 0)
      );
    }
    
    return filtered;
  };

  const filteredProducts = getFilteredProducts();
  
  // Fonction appelée quand un produit est sélectionné
  const handleProductSelect = (product: Product) => {
    // Si le produit a des attributs de variation, on garde ces informations
    // pour permettre la sélection de variantes spécifiques plus tard
    console.log("Selected product:", product);
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
                    <div key={product.id} className="cursor-pointer" onClick={() => handleProductSelect(product)}>
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
