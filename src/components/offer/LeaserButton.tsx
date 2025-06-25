
import React from "react";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { Leaser } from "@/types/equipment";

interface LeaserButtonProps {
  selectedLeaser: Leaser | null;
  onOpen: () => void;
}

const LeaserButton: React.FC<LeaserButtonProps> = ({ selectedLeaser, onOpen }) => {
  return (
    <Button 
      variant="outline" 
      onClick={onOpen}
      className="flex justify-between items-center h-10 w-full px-3 py-2"
    >
      <div className="flex items-center min-w-0 flex-1">
        <Coins className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
        <div className="text-left min-w-0 flex-1">
          <p className="text-xs font-medium truncate">
            {selectedLeaser ? selectedLeaser.name : "Sélectionner"}
          </p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">•••</span>
    </Button>
  );
};

export default LeaserButton;
