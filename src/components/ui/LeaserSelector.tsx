
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Leaser } from '@/types/leaser';

export interface LeaserSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeaser: Leaser | null;
  onSelect: (leaser: Leaser) => void;
  leasers: Leaser[];
}

const LeaserSelector: React.FC<LeaserSelectorProps> = ({ 
  isOpen, 
  onClose, 
  selectedLeaser, 
  onSelect, 
  leasers 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sélectionner un financier</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {leasers.map(leaser => (
            <div
              key={leaser.id}
              className={`p-3 border rounded-md cursor-pointer hover:bg-muted transition-colors ${
                selectedLeaser?.id === leaser.id ? 'border-primary bg-primary/10' : ''
              }`}
              onClick={() => onSelect(leaser)}
            >
              <div className="font-medium">{leaser.name}</div>
              <div className="text-sm text-muted-foreground">
                {leaser.description || 'Aucune description'}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaserSelector;
