
import React from "react";
import { Slider } from "@/components/ui/slider";

interface PriceRangeFilterProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min: number;
  max: number;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  value,
  onChange,
  min,
  max
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-foreground">Prix mensuel</h3>
      <div className="px-2">
        <Slider
          value={value}
          onValueChange={onChange}
          min={min}
          max={max}
          step={10}
          className="w-full"
        />
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{formatPrice(value[0])}</span>
          <span>{formatPrice(value[1])}</span>
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>Min: {formatPrice(min)}</span>
          <span>Max: {formatPrice(max)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceRangeFilter;
