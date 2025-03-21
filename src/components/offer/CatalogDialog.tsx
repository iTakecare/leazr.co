import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>
            {showVariantSelector ? "Sélectionner une variante" : "Sélectionner un produit"}
          </DialogTitle>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
