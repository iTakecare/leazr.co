
import React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Info } from "lucide-react";

interface VariantSelectorProps {
  attributeName: string;
  options: string[];
  selectedValue: string;
  onChange: (value: string) => void;
  isOptionAvailable: (optionName: string, value: string) => boolean;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({
  attributeName,
  options,
  selectedValue,
  onChange,
  isOptionAvailable
}) => {
  if (!options || options.length === 0) {
    return (
      <div className="text-blue-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="flex items-center">
          <Info className="h-5 w-5 mr-2" />
          Aucune option disponible pour {attributeName}.
        </p>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
      <label className="block text-sm font-medium text-gray-700 capitalize mb-3">
        {attributeName}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((value) => {
          const isAvailable = isOptionAvailable(attributeName, value);
          const isSelected = selectedValue === value;
          
          return (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={isSelected ? "default" : "outline"}
              className={`
                ${isSelected ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                ${!isAvailable ? "opacity-50 cursor-not-allowed" : ""}
              `}
              onClick={() => isAvailable && onChange(value)}
              disabled={!isAvailable}
            >
              {value}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default VariantSelector;
