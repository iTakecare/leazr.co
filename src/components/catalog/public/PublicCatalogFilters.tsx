
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Tag, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Product } from '@/types/catalog';
import { useProductFilter } from '@/hooks/products/useProductFilter';

interface PublicCatalogFiltersProps {
  products: Product[];
  isLoading: boolean;
  onToggleFilters: () => void;
}

const PublicCatalogFilters = ({ products, isLoading, onToggleFilters }: PublicCatalogFiltersProps) => {
  const [categoryExpanded, setCategoryExpanded] = useState(true);
  const [priceExpanded, setPriceExpanded] = useState(true);
  
  const {
    resetFilters,
    setSelectedCategory,
    selectedCategory,
    priceRange,
    setPriceRange,
    priceRangeLimits,
    categories,
  } = useProductFilter(products);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Filtres</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="text-[#2d618f] hover:text-[#1e4a70] text-sm"
        >
          Réinitialiser
        </Button>
      </div>

      {/* Categories filter */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
        <div
          className="flex justify-between items-center cursor-pointer mb-4"
          onClick={() => setCategoryExpanded(!categoryExpanded)}
        >
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#2d618f]" />
            <h3 className="font-medium text-gray-800">Catégories</h3>
          </div>
          {categoryExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>

        {categoryExpanded && (
          <div className="space-y-2">
            <div
              className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                selectedCategory === null ? 'bg-blue-50 text-[#2d618f]' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelectedCategory(null)}
            >
              <span className="text-sm">Toutes les catégories</span>
            </div>
            {categories.map((category) => (
              <div
                key={category.name}
                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer ${
                  selectedCategory === category.name ? 'bg-blue-50 text-[#2d618f]' : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedCategory(category.name)}
              >
                <span className="text-sm">{category.translation}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price filter */}
      <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
        <div
          className="flex justify-between items-center cursor-pointer mb-4"
          onClick={() => setPriceExpanded(!priceExpanded)}
        >
          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-[#2d618f]" />
            <h3 className="font-medium text-gray-800">Prix</h3>
          </div>
          {priceExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>

        {priceExpanded && (
          <div className="space-y-6">
            <Slider
              defaultValue={[priceRange[0], priceRange[1]]}
              min={priceRangeLimits[0]}
              max={priceRangeLimits[1]}
              step={1}
              value={[priceRange[0], priceRange[1]]}
              onValueChange={(value) => setPriceRange([value[0], value[1]])}
              className="mt-6"
            />
            <div className="flex items-center justify-between">
              <div className="px-3 py-2 border rounded-md text-sm">
                {priceRange[0]}€
              </div>
              <div className="px-3 py-2 border rounded-md text-sm">
                {priceRange[1]}€
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicCatalogFilters;
