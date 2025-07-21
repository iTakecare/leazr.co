
import React from "react";
import { Slider } from "@/components/ui/slider";

interface PriceRangeFilterProps {
  priceRange: [number, number];
  priceRangeLimits: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  isPriceFilterActive: boolean;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  priceRange,
  priceRangeLimits,
  onPriceRangeChange,
  isPriceFilterActive,
}) => {
  const [minLimit, maxLimit] = priceRangeLimits;

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-gray-900">Prix</h3>
      <div className="px-1">
        <Slider
          value={priceRange}
          onValueChange={(value) => onPriceRangeChange([value[0], value[1]])}
          max={maxLimit}
          min={minLimit}
          step={10}
          className="w-full"
        />
      </div>
      <div className="flex justify-between text-sm text-gray-600">
        <span>{priceRange[0]}€</span>
        <span>{priceRange[1]}€</span>
      </div>
      {isPriceFilterActive && (
        <p className="text-xs text-blue-600">Filtre prix actif</p>
      )}
    </div>
  );
};

export default PriceRangeFilter;
