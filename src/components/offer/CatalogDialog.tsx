
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductSelector from "@/components/ui/ProductSelector";
import VariantSelector from "@/components/catalog/VariantSelector";
import { Product } from "@/types/catalog";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (!isOpen) {
      setSelectedProduct(null);
      setShowVariantSelector(false);
      setSelectedOptions({});
    }
  }, [isOpen]);
  
  const onSelectProduct = (product: any) => {
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
  
  const handleViewVariants = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedProduct(product);
    setShowVariantSelector(true);
  };
  
  const onVariantSelect = (productWithVariant: Product) => {
    handleProductSelect(productWithVariant);
    onClose();
  };
  
  const handleBackToProducts = () => {
    setShowVariantSelector(false);
    setSelectedProduct(null);
    setSelectedOptions({});
  };

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  const isOptionAvailable = (optionName: string, value: string): boolean => {
    if (!selectedProduct?.variant_combination_prices) return true;
    
    return selectedProduct.variant_combination_prices.some(variant => 
      variant.attributes && variant.attributes[optionName] === value
    );
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
        
        <div className="flex-1 overflow-hidden">
          {showVariantSelector && selectedProduct ? (
            <ScrollArea className="h-full max-h-[calc(90vh-80px)]">
              <div className="p-4">
                <VariantSelector 
                  variationAttributes={selectedProduct.variation_attributes || {}}
                  selectedOptions={selectedOptions}
                  onOptionChange={handleOptionChange}
                  isOptionAvailable={isOptionAvailable}
                  hasVariants={true}
                  hasOptions={Object.keys(selectedProduct.variation_attributes || {}).length > 0}
                />
              </div>
            </ScrollArea>
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
