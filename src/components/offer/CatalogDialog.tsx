
import React, { useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "@/components/ui/ProductCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getCategories, getBrands } from "@/services/catalogService";

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: any) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedBrand: string;
  setSelectedBrand: (value: string) => void;
  categories: Array<{ name: string; translation: string }>;
  brands: Array<{ name: string; translation: string }>;
  filteredProducts: any[];
  isLoading: boolean;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({
  isOpen,
  onClose,
  handleProductSelect,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedBrand,
  setSelectedBrand,
  categories,
  brands,
  filteredProducts,
  isLoading
}) => {
  // Fetch data directly in the component rather than relying on passed props
  const { data: allProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["catalogProducts"],
    queryFn: getProducts,
    enabled: isOpen,
  });

  const { data: categoriesData = [] } = useQuery({
    queryKey: ["catalogCategories"],
    queryFn: getCategories,
    enabled: isOpen,
  });

  const { data: brandsData = [] } = useQuery({
    queryKey: ["catalogBrands"],
    queryFn: getBrands,
    enabled: isOpen,
  });

  // Filter products client-side
  const localFilteredProducts = React.useMemo(() => {
    if (!allProducts || !Array.isArray(allProducts)) {
      return [];
    }
    
    return allProducts.filter((product) => {
      // Search term filter - handle null values safely
      const nameMatch = !searchTerm || (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Category filter - handle 'all' filter correctly
      const categoryMatch = selectedCategory === "all" || (product.category && product.category === selectedCategory);
      
      // Brand filter - handle 'all' filter correctly  
      const brandMatch = selectedBrand === "all" || (product.brand && product.brand === selectedBrand);
      
      return nameMatch && categoryMatch && brandMatch;
    });
  }, [allProducts, searchTerm, selectedCategory, selectedBrand]);

  // Use local categories/brands from the query instead of props
  const localCategories = React.useMemo(() => {
    return categoriesData.map(c => ({ name: c.name, translation: c.translation }));
  }, [categoriesData]);

  const localBrands = React.useMemo(() => {
    return brandsData.map(b => ({ name: b.name, translation: b.translation }));
  }, [brandsData]);

  useEffect(() => {
    if (isOpen) {
      console.log("[CatalogDialog] Opened with products count:", allProducts?.length || 0);
      console.log("[CatalogDialog] Filtered products count:", localFilteredProducts?.length || 0);
      console.log("[CatalogDialog] Categories:", localCategories);
      console.log("[CatalogDialog] Brands:", localBrands);
      console.log("[CatalogDialog] Search term:", searchTerm);
      console.log("[CatalogDialog] Selected category:", selectedCategory);
      console.log("[CatalogDialog] Selected brand:", selectedBrand);
    }
  }, [isOpen, allProducts, localFilteredProducts, localCategories, localBrands, searchTerm, selectedCategory, selectedBrand]);

  // Determine actual loading state
  const actualLoading = isLoading || productsLoading;
  
  // Use products from our direct query, not from props
  const productsToShow = localFilteredProducts.length > 0 ? localFilteredProducts : [];
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="flex flex-col gap-4 my-4">
              {productsToShow.length > 0 ? (
                productsToShow.map((product) => (
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
