
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";

interface BrandFilterProps {
  brands: string[];
  selectedBrands: string[];
  onBrandChange: (brands: string[]) => void;
}

const BrandFilter: React.FC<BrandFilterProps> = ({
  brands,
  selectedBrands,
  onBrandChange,
}) => {
  const handleBrandToggle = (brand: string, checked: boolean) => {
    if (checked) {
      onBrandChange([...selectedBrands, brand]);
    } else {
      onBrandChange(selectedBrands.filter(b => b !== brand));
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm text-gray-900">Marques</h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {brands.map((brand) => (
          <div key={brand} className="flex items-center space-x-2">
            <Checkbox
              id={`brand-${brand}`}
              checked={selectedBrands.includes(brand)}
              onCheckedChange={(checked) => handleBrandToggle(brand, checked as boolean)}
            />
            <label
              htmlFor={`brand-${brand}`}
              className="text-sm text-gray-700 cursor-pointer flex-1"
            >
              {brand}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandFilter;
