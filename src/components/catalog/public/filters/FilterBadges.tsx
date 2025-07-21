
import React from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilterBadgesProps {
  searchQuery: string;
  selectedCategory: string | null;
  selectedBrands: string[];
  inStockOnly: boolean;
  categoryTranslation?: string;
  onRemoveSearch: () => void;
  onRemoveCategory: () => void;
  onRemoveBrand: (brand: string) => void;
  onRemoveStock: () => void;
  onClearAll: () => void;
}

const FilterBadges: React.FC<FilterBadgesProps> = ({
  searchQuery,
  selectedCategory,
  selectedBrands,
  inStockOnly,
  categoryTranslation,
  onRemoveSearch,
  onRemoveCategory,
  onRemoveBrand,
  onRemoveStock,
  onClearAll
}) => {
  const hasFilters = searchQuery || selectedCategory || selectedBrands.length > 0 || inStockOnly;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm text-muted-foreground">Filtres actifs:</span>
      
      {searchQuery && (
        <Badge variant="secondary" className="flex items-center gap-1">
          Recherche: "{searchQuery}"
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={onRemoveSearch}
          />
        </Badge>
      )}
      
      {selectedCategory && (
        <Badge variant="secondary" className="flex items-center gap-1">
          {categoryTranslation || selectedCategory}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={onRemoveCategory}
          />
        </Badge>
      )}
      
      {selectedBrands.map(brand => (
        <Badge key={brand} variant="secondary" className="flex items-center gap-1">
          {brand}
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={() => onRemoveBrand(brand)}
          />
        </Badge>
      ))}
      
      {inStockOnly && (
        <Badge variant="secondary" className="flex items-center gap-1">
          En stock uniquement
          <X 
            className="h-3 w-3 cursor-pointer hover:text-destructive" 
            onClick={onRemoveStock}
          />
        </Badge>
      )}
      
      <button
        onClick={onClearAll}
        className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-2"
      >
        Tout effacer
      </button>
    </div>
  );
};

export default FilterBadges;
