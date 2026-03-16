import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Brand {
  name: string;
  count: number;
}

interface CatalogBrandFilterProps {
  brands: Brand[];
  selectedBrands: string[];
  onBrandToggle: (brand: string) => void;
}

const CatalogBrandFilter: React.FC<CatalogBrandFilterProps> = ({
  brands,
  selectedBrands,
  onBrandToggle,
}) => {
  if (brands.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Marques</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {brands.map((brand) => {
          const isSelected = selectedBrands.includes(brand.name);
          return (
            <Badge
              key={brand.name}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer transition-all hover:scale-105 gap-1.5 px-3 py-1.5 text-xs font-medium",
                isSelected && "bg-[#4ab6c4] hover:bg-[#3a9aa6] border-[#4ab6c4]"
              )}
              onClick={() => onBrandToggle(brand.name)}
            >
              {brand.name}
              <span className="opacity-70">({brand.count})</span>
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export default CatalogBrandFilter;
