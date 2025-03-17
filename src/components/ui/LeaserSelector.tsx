
import React from 'react';
import { Leaser } from '@/types/equipment';

interface LeaserSelectorProps {
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
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
      <div className="bg-white rounded-lg w-full max-w-md p-4 max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Sélectionner un leaser</h2>
          <button onClick={onClose} className="text-gray-500">&times;</button>
        </div>
        
        <div className="space-y-2">
          {leasers && leasers.length > 0 ? (
            leasers.map(leaser => (
              <div
                key={leaser.id}
                className={`p-3 border rounded-md cursor-pointer hover:bg-muted transition-colors ${
                  selectedLeaser?.id === leaser.id ? 'border-primary bg-primary/10' : ''
                }`}
                onClick={() => onSelect(leaser)}
              >
                <div className="font-medium">{leaser.name}</div>
                <div className="text-sm text-muted-foreground">
                  {leaser.description || 'No description'}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun leaser disponible
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaserSelector;
