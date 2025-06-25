
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
      className="flex justify-between items-center h-auto py-3 min-w-[200px]"
    >
      <div className="flex items-center">
        <UserCheck className="h-5 w-5 mr-2 text-primary" />
        <div className="text-left">
          <p className="font-medium text-sm">Ambassadeur</p>
          <p className="text-xs text-muted-foreground">
            {selectedAmbassador ? selectedAmbassador.name : "Sélectionner un ambassadeur"}
          </p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">Changer</span>
    </Button>
  );
};

export default AmbassadorButton;
