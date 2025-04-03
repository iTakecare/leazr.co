
import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import SearchBar from "./SearchBar";
import ProductTypeTabs from "./ProductTypeTabs";
import ProductList from "./ProductList";
import { useProductSelector } from "@/hooks/products/useProductSelector";
import { useProductFilter } from "@/hooks/products/useProductFilter";
import { Product } from "@/types/catalog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  // Fetch products data
  const { products, isLoading, error } = useProductSelector(isOpen);
  
  // Filter products
  const {
    searchQuery,
    setSearchQuery,
    selectedTab,
    setSelectedTab,
    filteredProducts,
    resetFilters
  } = useProductFilter(products);
  
  // Handle product selection
  const handleProductSelect = (product: Product) => {
    console.log("Selected product:", product);
    onSelectProduct(product);
  };
  
  // Reset filters when the selector is opened
  React.useEffect(() => {
    if (isOpen) {
      resetFilters();
    }
  }, [isOpen, resetFilters]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 overflow-hidden flex flex-col">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          
          {/* Search bar and close button */}
          <div className="p-4 border-b">
            <div className="flex gap-2 items-center">
              <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              <SheetClose asChild>
                <Button variant="outline" onClick={onClose}>Fermer</Button>
              </SheetClose>
            </div>
          </div>
          
          {/* Product type tabs */}
          <div className="px-4 py-2 border-b">
            <ProductTypeTabs 
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
          </div>
          
          {/* Product list */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <ProductList 
                filteredProducts={filteredProducts}
                isLoading={isLoading}
                error={error}
                handleProductSelect={handleProductSelect}
                onViewVariants={onViewVariants}
              />
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductSelector;
