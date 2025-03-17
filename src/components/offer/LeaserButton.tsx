
import React from 'react';
import { Button } from "@/components/ui/button";
import { Leaser } from '@/types/equipment';

interface LeaserButtonProps {
  selectedLeaser: Leaser | null;
  onSelect: () => void;
}

const LeaserButton: React.FC<LeaserButtonProps> = ({ 
  selectedLeaser, 
  onSelect
}) => {
  return (
    <Button 
      onClick={onSelect} 
      variant="outline" 
      className="flex-1 justify-start text-left font-normal"
    >
      <span className="truncate">
        {selectedLeaser ? selectedLeaser.name : "Sélectionner un leaser"}
      </span>
    </Button>
  );
};

export default LeaserButton;
