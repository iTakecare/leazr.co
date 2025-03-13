
import React from "react";
import { Building2, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Leaser } from "@/types/equipment";

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
                <div className="h-8 w-14 flex items-center">
                  <img 
                    src={selectedLeaser.logo_url} 
                    alt={selectedLeaser.name} 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : null}
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
