import React from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicSimplifiedFilterState } from "@/hooks/products/usePublicSimplifiedFilter";

interface Category {
  name: string;
  label: string;
  icon: string;
  count: number;
}

interface PublicCatalogFilterBarProps {
  filters: PublicSimplifiedFilterState;
  updateFilter: <K extends keyof PublicSimplifiedFilterState>(key: K, value: PublicSimplifiedFilterState[K]) => void;
  resetFilters: () => void;
  categories: Category[];
  hasActiveFilters: boolean;
  resultsCount: number;
}

const PublicCatalogFilterBar: React.FC<PublicCatalogFilterBarProps> = ({
  filters,
  updateFilter,
  resetFilters,
  categories,
  hasActiveFilters,
  resultsCount
}) => {
  const sortOptions = [
    { value: 'newest', label: 'Plus récents' },
    { value: 'name', label: 'Nom A-Z' },
    { value: 'price', label: 'Prix' },
    { value: 'brand', label: 'Marque' }
  ];

  const handleSortChange = (value: string) => {
    updateFilter('sortBy', value as typeof filters.sortBy);
  };

  return (
    <div className="bg-card border rounded-lg p-4 mb-6 space-y-4">
      {/* Top row: Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un produit..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter('searchQuery', e.target.value)}
            className="pl-10 pr-10"
          />
          {filters.searchQuery && (
            <button
              onClick={() => updateFilter('searchQuery', '')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Right side: Results count, Sort, Reset */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {resultsCount} produit{resultsCount > 1 ? 's' : ''}
          </span>
          
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {/* Categories row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm font-medium text-foreground mr-2">Catégories:</span>
        
        {/* All categories button */}
        <Badge
          variant={filters.selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer transition-all hover:scale-105"
          onClick={() => updateFilter('selectedCategory', null)}
        >
          Toutes
        </Badge>

        {/* Category buttons with icons */}
        {categories.map((category) => (
          <Badge
            key={category.name}
            variant={filters.selectedCategory === category.name ? "default" : "outline"}
            className="cursor-pointer transition-all hover:scale-105 gap-1"
            onClick={() => updateFilter('selectedCategory', category.name)}
          >
            <span>{category.icon}</span>
            {category.label}
            <span className="text-xs opacity-70">({category.count})</span>
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default PublicCatalogFilterBar;