import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductSelector, { ProductWithVariants } from "@/components/ui/ProductSelector";
import VariantSelector from "@/components/catalog/VariantSelector";

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
  
  useEffect(() => {
    if (!isOpen) {
      setSelectedProduct(null);
      setShowVariantSelector(false);
    }
  }, [isOpen]);
  
  const onSelectProduct = (product: ProductWithVariants) => {
    console.log("Product selected:", product);
    
    const hasVariants = 
      (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) &&
      (product.variant_combination_prices && product.variant_combination_prices.length > 0);
    
    if (hasVariants) {
      setSelectedProduct(product);
      setShowVariantSelector(true);
    } else {
      handleProductSelect(product);
      onClose();
    }
  };
  
  const handleViewVariants = (product: ProductWithVariants, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProduct(product);
    setShowVariantSelector(true);
  };
  
  const onVariantSelect = (productWithVariant: ProductWithVariants) => {
    handleProductSelect(productWithVariant);
    onClose();
  };
  
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
