
import React from "react";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ 
  quantity, 
  onQuantityChange 
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">Quantité souhaitée</label>
      <div className="flex items-center">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-r-none border-gray-200"
          onClick={() => onQuantityChange(quantity - 1)}
          disabled={quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="h-10 px-4 flex items-center justify-center border-y border-gray-200">
          {quantity}
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-l-none border-gray-200"
          onClick={() => onQuantityChange(quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default QuantitySelector;
