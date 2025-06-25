
import React from "react";
import { Button } from "@/components/ui/button";
import { UserCheck } from "lucide-react";
import { AmbassadorSelectorAmbassador } from "@/components/ui/AmbassadorSelector";

interface AmbassadorButtonProps {
  selectedAmbassador: AmbassadorSelectorAmbassador | null;
  onOpen: () => void;
}

const AmbassadorButton: React.FC<AmbassadorButtonProps> = ({ selectedAmbassador, onOpen }) => {
  return (
    <Button 
      variant="outline" 
      onClick={onOpen}
      className="flex justify-between items-center h-10 w-full px-3 py-2"
    >
      <div className="flex items-center min-w-0 flex-1">
        <UserCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
        <div className="text-left min-w-0 flex-1">
          <p className="text-xs font-medium truncate">
            {selectedAmbassador ? selectedAmbassador.name : "Sélectionner"}
          </p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">•••</span>
    </Button>
  );
};

export default AmbassadorButton;
