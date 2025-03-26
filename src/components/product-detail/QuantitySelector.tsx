
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
    <div className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
      <h4 className="block text-sm font-medium text-gray-700 capitalize mb-3">Quantité</h4>
      <div className="flex items-center border rounded-md w-fit">
        <Button 
          variant="ghost" 
          size="sm"
          className="rounded-r-none h-10"
          onClick={() => onQuantityChange(quantity - 1)}
          disabled={quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="px-4 py-2 font-medium border-x">{quantity}</div>
        <Button 
          variant="ghost" 
          size="sm"
          className="rounded-l-none h-10"
          onClick={() => onQuantityChange(quantity + 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default QuantitySelector;
