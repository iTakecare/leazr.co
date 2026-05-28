
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ProductSelector from "@/components/ui/ProductSelector";
import { Product } from "@/types/catalog";
import { StockItem } from "@/services/stockService";
import { type SelectableExternalService } from "@/components/ui/product-selector/ProviderSelectorList";

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: Product) => void;
  stockCompanyId?: string;
  onSelectStockItem?: (item: StockItem) => void;
  providersCompanyId?: string;
  onSelectExternalService?: (service: SelectableExternalService) => void;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({
  isOpen,
  onClose,
  handleProductSelect,
  stockCompanyId,
  onSelectStockItem,
  providersCompanyId,
  onSelectExternalService,
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

  const handleStockItemSelect = (item: StockItem) => {
    onSelectStockItem?.(item);
    onClose();
  };

  const handleExternalServiceSelect = (service: SelectableExternalService) => {
    onSelectExternalService?.(service);
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
            stockCompanyId={stockCompanyId}
            onSelectStockItem={onSelectStockItem ? handleStockItemSelect : undefined}
            providersCompanyId={providersCompanyId}
            onSelectExternalService={onSelectExternalService ? handleExternalServiceSelect : undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
