
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductCard from "./ProductCard";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductCatalogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  isSheet?: boolean;
  title?: string;
  description?: string;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({ 
  isOpen, 
  onClose, 
  onSelectProduct,
  isSheet = false,
  title = "Catalogue de produits",
  description = "Sélectionnez un produit à ajouter à votre offre"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  // Utiliser useQuery pour récupérer les produits réels depuis la base de données
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: isOpen, // Ne récupère les produits que lorsque le catalogue est ouvert
  });

  // Extraire les catégories uniques des produits
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set<string>();
    products.forEach((product: Product) => {
      if (product.category) {
        uniqueCategories.add(product.category);
      }
    });
    return ["all", ...Array.from(uniqueCategories)];
  }, [products]);

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const DialogOrSheet = isSheet ? Sheet : Dialog;
  const ContentComponent = isSheet ? SheetContent : DialogContent;
  const HeaderComponent = isSheet ? SheetHeader : DialogHeader;
  const TitleComponent = isSheet ? SheetTitle : DialogTitle;
  const DescriptionComponent = isSheet ? SheetDescription : DialogDescription;

  return (
    <DialogOrSheet open={isOpen} onOpenChange={() => !isLoading && onClose()}>
      <ContentComponent className={isSheet ? "sm:max-w-md" : "sm:max-w-[700px]"}>
        <HeaderComponent>
          <TitleComponent>{title}</TitleComponent>
          <DescriptionComponent>{description}</DescriptionComponent>
        </HeaderComponent>
        
        <div className="relative my-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="my-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === "all" ? "Toutes les catégories" : 
                    category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">
            Une erreur est survenue lors du chargement des produits.
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div key={product.id} onClick={() => onSelectProduct(product)}>
                    <ProductCard product={product} />
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-10 text-muted-foreground">
                  Aucun produit trouvé
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </ContentComponent>
    </DialogOrSheet>
  );
};

export default ProductCatalog;
