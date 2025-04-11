
import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ProductSelector from '@/components/ui/ProductSelector';

interface CatalogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  handleProductSelect: (product: any) => void;
}

const CatalogDialog: React.FC<CatalogDialogProps> = ({ 
  isOpen, 
  onClose, 
  handleProductSelect 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogTitle>Sélectionnez un produit</DialogTitle>
        <DialogDescription>
          Choisissez un produit du catalogue pour l'ajouter à votre offre
        </DialogDescription>
        
        <ProductSelector
          isOpen={isOpen}
          onClose={onClose}
          onSelectProduct={handleProductSelect}
          title="Ajouter un équipement"
          description="Sélectionnez un produit du catalogue à ajouter à votre offre"
          embedded={true}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CatalogDialog;
