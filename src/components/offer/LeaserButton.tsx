
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
      className="w-full flex justify-between items-center h-auto py-3"
    >
      <div className="flex items-center">
        <Coins className="h-5 w-5 mr-2 text-primary" />
        <div className="text-left">
          <p className="font-medium text-sm">Prestataire de leasing</p>
          <p className="text-xs text-muted-foreground">
            {selectedLeaser ? selectedLeaser.name : "Aucun prestataire sélectionné"}
          </p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Changer</span>
    </Button>
  );
};

export default LeaserButton;
