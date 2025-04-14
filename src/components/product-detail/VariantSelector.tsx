
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info } from "lucide-react";

interface VariantSelectorProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  isOptionAvailable: (value: string) => boolean;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  label,
  options,
  value,
  onChange,
  isOptionAvailable
}) => {
  if (!options || options.length === 0) {
    return (
      <div className="text-gray-500 text-xs">Aucune option disponible pour cet attribut.</div>
    );
  }
  
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => {
          const isAvailable = isOptionAvailable(option);
          const isSelected = value === option;
          
          return (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={`
                ${isSelected ? "bg-primary" : ""}
                ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
                text-xs h-8 px-3
              `}
              onClick={() => isAvailable && onChange(option)}
              disabled={!isAvailable}
            >
              {option}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;
