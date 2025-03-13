
import React from "react";
import { Building2, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Leaser } from "@/types/equipment";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface LeaserButtonProps {
  selectedLeaser: Leaser | null;
  onOpen: () => void;
}

const LeaserButton: React.FC<LeaserButtonProps> = ({
  selectedLeaser,
  onOpen,
}) => {
  return (
    <div>
      <Label className="block text-sm font-medium text-gray-700 mb-2">
        Leaser
      </Label>
      <div className="flex gap-3 items-center">
        <div 
          onClick={onOpen}
          className="flex-1 relative border border-gray-300 rounded-lg p-3 flex items-center cursor-pointer hover:border-blue-500 transition-colors"
        >
          <Building2 className="h-5 w-5 text-gray-400 mr-3" />
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {selectedLeaser?.logo_url ? (
                <Avatar className="h-8 w-8 rounded-md">
                  <AvatarImage 
                    src={selectedLeaser.logo_url} 
                    alt={selectedLeaser.name} 
                    className="object-contain p-2 bg-white"
                  />
                  <AvatarFallback className="bg-primary/10 rounded-md">
                    <Building2 className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
              )}
              <span>{selectedLeaser?.name || 'Sélectionner un leaser'}</span>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaserButton;
