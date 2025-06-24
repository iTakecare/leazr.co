
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ProductSelector from "@/components/ui/ProductSelector";
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
  useEffect(() => {
    if (!isOpen) {
      // Reset any state when dialog closes
    }
  }, [isOpen]);
  
  const onSelectProduct = (product: any) => {
    // Directly handle product selection - ProductSelector already manages variants
    handleProductSelect(product);
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-2xl lg:max-w-4xl p-0 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="p-4 border-b sticky top-0 bg-white z-10">
          <DialogTitle className="text-xl">
            Sélectionner un produit
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ProductSelector
            isOpen={isOpen}
            onClose={onClose}
            onSelectProduct={onSelectProduct}
            title="Sélectionner un produit"
            description="Parcourez notre catalogue pour ajouter un produit à votre offre"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
