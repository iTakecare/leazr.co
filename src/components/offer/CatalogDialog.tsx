
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductSelector from "@/components/ui/ProductSelector";
import VariantSelector from "@/components/catalog/VariantSelector";
import { Product } from "@/types/catalog";

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: Product) => void;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({
  isOpen,
  onClose,
  handleProductSelect
}) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  
  // Clear selected product when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedProduct(null);
      setShowVariantSelector(false);
    }
  }, [isOpen]);
  
  // Handle product selection from the selector
  const onSelectProduct = (product: Product) => {
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
  
  // Handle variant selection
  const onVariantSelect = (productWithVariant: Product) => {
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
                product={selectedProduct}
                onVariantSelect={onVariantSelect}
              />
            </div>
          ) : (
            <ProductSelector
              isOpen={isOpen && !showVariantSelector}
              onClose={onClose}
              onSelectProduct={onSelectProduct}
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
