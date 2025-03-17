
import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "@/components/ui/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories, getBrands } from "@/services/catalogService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: any) => void;
  searchTerm?: string;
  setSearchTerm?: (value: string) => void;
  selectedCategory?: string;
  setSelectedCategory?: (value: string) => void;
  selectedBrand?: string;
  setSelectedBrand?: (value: string) => void;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({
  isOpen,
  onClose,
  handleProductSelect,
  searchTerm: externalSearchTerm,
  setSearchTerm: externalSetSearchTerm,
  selectedCategory: externalSelectedCategory,
  setSelectedCategory: externalSetSelectedCategory,
  selectedBrand: externalSelectedBrand,
  setSelectedBrand: externalSetSelectedBrand
}) => {
  // Internal state for standalone usage
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string>("all");
  const [internalSelectedBrand, setInternalSelectedBrand] = useState<string>("all");
  
  // Use either the external state (if provided) or the internal state
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm;
  const setSearchTerm = externalSetSearchTerm || setInternalSearchTerm;
  const selectedCategory = externalSelectedCategory !== undefined ? externalSelectedCategory : internalSelectedCategory;
  const setSelectedCategory = externalSetSelectedCategory || setInternalSelectedCategory;
  const selectedBrand = externalSelectedBrand !== undefined ? externalSelectedBrand : internalSelectedBrand;
  const setSelectedBrand = externalSetSelectedBrand || setInternalSelectedBrand;
  
  // Fetch products directly using the useQuery hook
  const { data: allProducts = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["catalogProducts", isOpen],
    queryFn: async () => {
      try {
        console.log("Fetching products directly from Supabase");
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true);
          
        if (error) {
          throw error;
        }
        
        console.log("Products fetched successfully, count:", data?.length);
        return data || [];
      } catch (error) {
        console.error("Error fetching products:", error);
        toast.error("Erreur lors du chargement des produits");
        return [];
      }
    },
    enabled: isOpen,
  });

  // Fetch categories directly
  const { data: categoriesData = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["catalogCategories", isOpen],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
          
        if (error) {
          throw error;
        }
        
        console.log("Categories fetched successfully, count:", data?.length);
        return data || [];
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
    },
    enabled: isOpen,
  });

  // Fetch brands directly
  const { data: brandsData = [], isLoading: brandsLoading, error: brandsError } = useQuery({
    queryKey: ["catalogBrands", isOpen],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('brands')
          .select('*')
          .order('name');
          
        if (error) {
          throw error;
        }
        
        console.log("Brands fetched successfully, count:", data?.length);
        return data || [];
      } catch (error) {
        console.error("Error fetching brands:", error);
        return [];
      }
    },
    enabled: isOpen,
  });

  // Filter products client-side
  const filteredProducts = React.useMemo(() => {
    if (!allProducts || !Array.isArray(allProducts)) {
      console.log("[CatalogDialog] allProducts is not an array:", allProducts);
      return [];
    }
    
    console.log("[CatalogDialog] Filtering products, total count:", allProducts.length);
    console.log("[CatalogDialog] Search term:", searchTerm);
    console.log("[CatalogDialog] Selected category:", selectedCategory);
    console.log("[CatalogDialog] Selected brand:", selectedBrand);
    
    return allProducts.filter((product) => {
      // Search term filter - handle null values safely
      const nameMatch = !searchTerm || 
        (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter - handle 'all' filter correctly
      const categoryMatch = selectedCategory === "all" || 
        (product.category && product.category === selectedCategory);
      
      // Brand filter - handle 'all' filter correctly  
      const brandMatch = selectedBrand === "all" || 
        (product.brand && product.brand === selectedBrand);
      
      const matches = nameMatch && categoryMatch && brandMatch;
      
      return matches;
    });
  }, [allProducts, searchTerm, selectedCategory, selectedBrand]);

  // Use local categories/brands from the query
  const localCategories = React.useMemo(() => {
    return categoriesData.map(c => ({ name: c.name, translation: c.translation }));
  }, [categoriesData]);

  const localBrands = React.useMemo(() => {
    return brandsData.map(b => ({ name: b.name, translation: b.translation }));
  }, [brandsData]);

  useEffect(() => {
    if (isOpen) {
      console.log("[CatalogDialog] Opened with products count:", allProducts?.length || 0);
      console.log("[CatalogDialog] Filtered products count:", filteredProducts?.length || 0);
      console.log("[CatalogDialog] Categories:", localCategories);
      console.log("[CatalogDialog] Brands:", localBrands);
    }
  }, [isOpen, allProducts, filteredProducts, localCategories, localBrands]);

  // Determine actual loading state
  const actualLoading = productsLoading || categoriesLoading || brandsLoading;
  const hasError = productsError || categoriesError || brandsError;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Sélectionner un équipement</DialogTitle>
          <DialogDescription>Choisissez un produit du catalogue à ajouter à votre offre</DialogDescription>
        </DialogHeader>
        
        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 my-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {localCategories && localCategories.length > 0 ? localCategories.map((category) => (
                <SelectItem key={category.name} value={category.name}>
                  {category.translation}
                </SelectItem>
              )) : null}
            </SelectContent>
          </Select>

          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue placeholder="Marque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les marques</SelectItem>
              {localBrands && localBrands.length > 0 ? localBrands.map((brand) => (
                <SelectItem key={brand.name} value={brand.name}>
                  {brand.translation}
                </SelectItem>
              )) : null}
            </SelectContent>
          </Select>
        </div>
        
        {actualLoading ? (
          <div className="flex flex-col gap-4 my-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : hasError ? (
          <div className="text-center py-10 text-red-500">
            Une erreur s'est produite lors du chargement des données
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="flex flex-col gap-4 my-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div key={product.id} onClick={() => handleProductSelect(product)} className="cursor-pointer">
                    <ProductCard product={product} />
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  Aucun produit trouvé
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
