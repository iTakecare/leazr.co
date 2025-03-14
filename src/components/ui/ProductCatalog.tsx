
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
import { Card, CardContent } from "@/components/ui/card";

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

  // Components for modal/sheet version
  const DialogOrSheet = isSheet ? Sheet : Dialog;
  const ContentComponent = isSheet ? SheetContent : DialogContent;
  const HeaderComponent = isSheet ? SheetHeader : DialogHeader;
  const TitleComponent = isSheet ? SheetTitle : DialogTitle;
  const DescriptionComponent = isSheet ? SheetDescription : DialogDescription;

  // For modal/dialog display (calculator or client requests)
  if (isSheet || (isOpen !== true)) {
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
            <div className="flex flex-col gap-4 my-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-6 text-red-500">
              Une erreur est survenue lors du chargement des produits.
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="flex flex-col gap-4 my-4">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <div key={product.id} onClick={() => onSelectProduct(product)}>
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
        </ContentComponent>
      </DialogOrSheet>
    );
  }

  // For regular catalog display (full page)
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-60">
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
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10 border rounded-lg">
          <div className="text-red-500 font-medium">Une erreur est survenue lors du chargement des produits.</div>
          <div className="text-sm text-muted-foreground mt-2">Veuillez réessayer plus tard ou contactez l'administrateur.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex p-4" onClick={() => onSelectProduct(product)}>
                    <div className="w-24 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center mr-4">
                      <img 
                        src={product.image_url || "/placeholder.svg"} 
                        alt={product.name}
                        className="object-contain max-h-20 max-w-20"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        Catégorie: {product.category || "Non catégorisé"}
                      </p>
                      <p className="text-sm font-medium">
                        Mensualité: {product.monthly_price ? (product.monthly_price + "€/mois") : "Non définie"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-10 border rounded-lg">
              <div className="text-muted-foreground">Aucun produit trouvé</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
