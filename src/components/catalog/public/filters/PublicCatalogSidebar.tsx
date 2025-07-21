
import React from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import SearchFilter from "./SearchFilter";
import CategoryFilter from "./CategoryFilter";
import PriceRangeFilter from "./PriceRangeFilter";
import BrandFilter from "./BrandFilter";

interface PublicCatalogSidebarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  priceRange: [number, number];
  priceRangeLimits: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  isPriceFilterActive: boolean;
  brands: string[];
  selectedBrands: string[];
  onBrandChange: (brands: string[]) => void;
  onResetFilters: () => void;
  resultsCount: number;
  isOpen: boolean;
  onClose?: () => void;
}

const PublicCatalogSidebar: React.FC<PublicCatalogSidebarProps> = ({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  priceRangeLimits,
  onPriceRangeChange,
  isPriceFilterActive,
  brands,
  selectedBrands,
  onBrandChange,
  onResetFilters,
  resultsCount,
  isOpen,
  onClose,
}) => {
  const hasActiveFilters = 
    searchQuery !== "" || 
    selectedCategory !== null || 
    isPriceFilterActive || 
    selectedBrands.length > 0;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
        w-80 lg:w-72 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full lg:h-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b lg:border-b-0">
          <div>
            <h2 className="font-semibold text-lg text-gray-900">Filtres</h2>
            <p className="text-sm text-gray-600">
              {resultsCount} produit{resultsCount !== 1 ? 's' : ''} trouvé{resultsCount !== 1 ? 's' : ''}
            </p>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="text-blue-600 hover:text-blue-700"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </div>

        {/* Filters content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />

          {categories.length > 0 && (
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={onCategoryChange}
            />
          )}

          <PriceRangeFilter
            priceRange={priceRange}
            priceRangeLimits={priceRangeLimits}
            onPriceRangeChange={onPriceRangeChange}
            isPriceFilterActive={isPriceFilterActive}
          />

          {brands.length > 0 && (
            <BrandFilter
              brands={brands}
              selectedBrands={selectedBrands}
              onBrandChange={onBrandChange}
            />
          )}
        </div>
      </div>
    </>
  );
};

export default PublicCatalogSidebar;
