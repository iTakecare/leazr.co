
import React from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onQuantityChange,
  min = 1,
  max = 100
}) => {
  const increment = () => {
    if (quantity < max) {
      onQuantityChange(quantity + 1);
    }
  };

  const decrement = () => {
    if (quantity > min) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= min && value <= max) {
      onQuantityChange(value);
    }
  };

  return (
    <div className="flex items-center">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={decrement}
        disabled={quantity <= min}
      >
        <MinusIcon className="h-3 w-3" />
      </Button>

      <Input
        type="number"
        min={min}
        max={max}
        value={quantity}
        onChange={handleInputChange}
        className="h-8 w-14 text-center mx-1"
      />

      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={increment}
        disabled={quantity >= max}
      >
        <PlusIcon className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default QuantitySelector;
