
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductSelector from "@/components/ui/ProductSelector";
import VariantSelector from "@/components/catalog/VariantSelector";
import type { Product } from "@/types/catalog";

interface ProductWithVariants extends Omit<Product, 'variants'> {
  variation_attributes?: Record<string, string[]>;
  variant_combination_prices?: any[];
  is_parent?: boolean;
  selected_variant_id?: string;
  attributes?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
  active: boolean;
}

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: ProductWithVariants) => void;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({
  isOpen,
  onClose,
  handleProductSelect
}) => {
  const [selectedProduct, setSelectedProduct] = useState<ProductWithVariants | null>(null);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  
  // Clear selected product when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProduct(null);
      setShowVariantSelector(false);
    }
  }, [isOpen]);
  
  // Handle product selection from the selector
  const onSelectProduct = (product: ProductWithVariants) => {
    console.log("Product selected:", product);
    
    // Check if the product has variants
    const hasVariants = 
      (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) &&
      (product.variant_combination_prices && product.variant_combination_prices.length > 0);
    
    if (hasVariants) {
      // If product has variants, show the variant selector
      setSelectedProduct(product);
      setShowVariantSelector(true);
    } else {
      // Otherwise, directly select the product
      handleProductSelect(product);
      onClose();
    }
  };
  
  // Handle clicking on "Voir les configurations disponibles" in ProductCard
  const handleViewVariants = (product: ProductWithVariants, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProduct(product);
    setShowVariantSelector(true);
  };
  
  // Handle variant selection
  const onVariantSelect = (productWithVariant: ProductWithVariants) => {
    handleProductSelect(productWithVariant);
    onClose();
  };
  
  // Go back to product selection
  const handleBackToProducts = () => {
    setShowVariantSelector(false);
    setSelectedProduct(null);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-2xl lg:max-w-4xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center">
            {showVariantSelector && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="mr-2" 
                onClick={handleBackToProducts}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
            )}
            <DialogTitle className="text-xl">
              {showVariantSelector ? "Sélectionner une configuration" : "Sélectionner un produit"}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {showVariantSelector && selectedProduct ? (
            <div className="p-4">
              <VariantSelector 
                product={selectedProduct as any}
                onVariantSelect={onVariantSelect as any}
              />
            </div>
          ) : (
            <ProductSelector
              isOpen={isOpen && !showVariantSelector}
              onClose={onClose}
              onSelectProduct={onSelectProduct}
              onViewVariants={handleViewVariants}
              title="Sélectionner un produit"
              description="Parcourez notre catalogue pour ajouter un produit à votre offre"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
