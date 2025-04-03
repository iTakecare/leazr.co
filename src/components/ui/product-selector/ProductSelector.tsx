
import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Product } from "@/types/catalog";
import { useProductData } from "./useProductData";
import ProductSearch from "./ProductSearch";
import CategoryTabs from "./CategoryTabs";
import ProductGrid from "./ProductGrid";

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
  const {
    filteredProducts,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    error
  } = useProductData(isOpen);
  
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        
        <div className="p-4 border-b">
          <div className="flex gap-2 items-center">
            <ProductSearch searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <SheetClose asChild>
              <Button variant="outline" onClick={onClose}>Fermer</Button>
            </SheetClose>
          </div>
        </div>

        <CategoryTabs 
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
        >
          <ScrollArea className="flex-1">
            <div className="p-4 pb-24">
              <ProductGrid
                products={filteredProducts}
                isLoading={isLoading}
                error={error}
                onProductClick={onSelectProduct}
                onViewVariants={onViewVariants}
              />
            </div>
          </ScrollArea>
        </CategoryTabs>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSelector;
