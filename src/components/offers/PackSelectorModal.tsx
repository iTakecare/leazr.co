import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PackSelector from './PackSelector';
import { ProductPack } from '@/types/pack';

interface PackSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPacks: Array<{
    pack_id: string;
    pack: ProductPack;
    quantity: number;
    unit_monthly_price: number;
  }>;
  onPackSelect: (pack: ProductPack, quantity: number) => void;
  onPackRemove: (packId: string) => void;
}

const PackSelectorModal: React.FC<PackSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedPacks,
  onPackSelect,
  onPackRemove,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sélectionner des packs</DialogTitle>
          <DialogDescription>
            Choisissez un ou plusieurs packs à ajouter à votre offre. Tous les produits du pack seront ajoutés automatiquement.
          </DialogDescription>
        </DialogHeader>
        <PackSelector
          selectedPacks={selectedPacks}
          onPackSelect={onPackSelect}
          onPackRemove={onPackRemove}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PackSelectorModal;
