
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info } from "lucide-react";

interface VariantSelectorProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  isOptionAvailable: (value: string) => boolean;
  getDisplayName: (value: string) => string;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  isOptionAvailable,
  getDisplayName
}) => {
  if (!options || options.length === 0) {
    return (
      <div className="text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-200 text-xs">
        <p className="flex items-center">
          <Info className="h-3.5 w-3.5 mr-1.5" />
          Aucune option de variation n'est disponible pour {label}.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isAvailable = isOptionAvailable(option);
          const isSelected = value === option;
          const displayName = getDisplayName(option);
          
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={`
                ${isSelected ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                text-xs h-7 px-2.5
              `}
              onClick={() => isAvailable && onChange(option)}
              disabled={!isAvailable}
            >
              {displayName}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;
