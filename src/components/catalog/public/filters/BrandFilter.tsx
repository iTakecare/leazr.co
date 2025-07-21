
import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Brand {
  name: string;
  count: number;
}

interface BrandFilterProps {
  brands: Brand[];
  selectedBrands: string[];
  onChange: (brands: string[]) => void;
}

const BrandFilter: React.FC<BrandFilterProps> = ({
  brands,
  selectedBrands,
  onChange
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBrands = useMemo(() => {
    if (!searchQuery) return brands;
    return brands.filter(brand => 
      brand.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [brands, searchQuery]);

  const toggleBrand = (brandName: string) => {
    if (selectedBrands.includes(brandName)) {
      onChange(selectedBrands.filter(b => b !== brandName));
    } else {
      onChange([...selectedBrands, brandName]);
    }
  };

  const clearBrands = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm text-foreground">Marques</h3>
        {selectedBrands.length > 0 && (
          <button
            onClick={clearBrands}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Effacer
          </button>
        )}
      </div>

      {selectedBrands.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedBrands.map(brand => (
            <Badge
              key={brand}
              variant="secondary"
              className="text-xs cursor-pointer"
              onClick={() => toggleBrand(brand)}
            >
              {brand} ×
            </Badge>
          ))}
        </div>
      )}

      {brands.length > 5 && (
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher une marque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      )}

      <div className="max-h-48 overflow-y-auto space-y-2">
        {filteredBrands.map((brand) => (
          <label
            key={brand.name}
            className="flex items-center space-x-2 cursor-pointer hover:bg-muted/50 rounded p-1 transition-colors"
          >
            <Checkbox
              checked={selectedBrands.includes(brand.name)}
              onCheckedChange={() => toggleBrand(brand.name)}
            />
            <span className="text-sm flex-1">{brand.name}</span>
            <span className="text-xs text-muted-foreground">({brand.count})</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default BrandFilter;
