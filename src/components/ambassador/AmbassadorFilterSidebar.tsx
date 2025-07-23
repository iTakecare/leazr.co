import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Package, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import SearchFilter from "@/components/catalog/public/filters/SearchFilter";
import CategoryFilter from "@/components/catalog/public/filters/CategoryFilter";
import PriceRangeFilter from "@/components/catalog/public/filters/PriceRangeFilter";
import BrandFilter from "@/components/catalog/public/filters/BrandFilter";
import SortFilter from "@/components/catalog/public/filters/SortFilter";

interface AmbassadorFilterState {
  searchQuery: string;
  selectedCategory: string | null;
  priceRange: [number, number];
  selectedBrands: string[];
  inStockOnly: boolean;
  sortBy: 'name' | 'price' | 'brand' | 'newest';
  sortOrder: 'asc' | 'desc';
}

interface AmbassadorFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: AmbassadorFilterState;
  updateFilter: <K extends keyof AmbassadorFilterState>(key: K, value: AmbassadorFilterState[K]) => void;
  resetFilters: () => void;
  categories: Array<{ name: string; translation: string; count: number }>;
  brands: Array<{ name: string; count: number }>;
  priceRange: [number, number];
  hasActiveFilters: boolean;
  resultsCount: number;
}

const AmbassadorFilterSidebar: React.FC<AmbassadorFilterSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  updateFilter,
  resetFilters,
  categories,
  brands,
  priceRange,
  hasActiveFilters,
  resultsCount
}) => {
  const sidebarVariants = {
    open: { x: 0, opacity: 1 },
    closed: { x: -300, opacity: 0 }
  };

  const overlayVariants = {
    open: { opacity: 1, visibility: "visible" as const },
    closed: { opacity: 0, visibility: "hidden" as const }
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 flex-shrink-0 ml-6">
        <div className="sticky top-8 bg-card border rounded-xl shadow-soft p-6 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto backdrop-blur-sm border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Filtres</h2>
            </div>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            {resultsCount} produit{resultsCount > 1 ? 's' : ''} trouvé{resultsCount > 1 ? 's' : ''}
          </div>

          <SearchFilter
            value={filters.searchQuery}
            onChange={(value) => updateFilter('searchQuery', value)}
            placeholder="Rechercher un produit..."
          />

          <Separator />

          <SortFilter
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortByChange={(value) => updateFilter('sortBy', value)}
            onSortOrderChange={(value) => updateFilter('sortOrder', value)}
          />

          <Separator />

          <CategoryFilter
            categories={categories}
            selectedCategory={filters.selectedCategory}
            onChange={(value) => updateFilter('selectedCategory', value)}
          />

          <Separator />

          <PriceRangeFilter
            value={filters.priceRange}
            onChange={(value) => updateFilter('priceRange', value)}
            min={priceRange[0]}
            max={priceRange[1]}
          />

          <Separator />

          <BrandFilter
            brands={brands}
            selectedBrands={filters.selectedBrands}
            onChange={(value) => updateFilter('selectedBrands', value)}
          />

          <Separator />

          <div className="space-y-3">
            <h3 className="font-medium text-sm text-foreground">Disponibilité</h3>
            <label className="flex items-center space-x-2 cursor-pointer">
              <Checkbox
                checked={filters.inStockOnly}
                onCheckedChange={(value) => updateFilter('inStockOnly', !!value)}
              />
              <Package className="h-4 w-4" />
              <span className="text-sm">En stock uniquement</span>
            </label>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={overlayVariants}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={onClose}
            />
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              variants={sidebarVariants}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Filtres</h2>
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasActiveFilters && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={resetFilters}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={onClose}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  {resultsCount} produit{resultsCount > 1 ? 's' : ''} trouvé{resultsCount > 1 ? 's' : ''}
                </div>

                <SearchFilter
                  value={filters.searchQuery}
                  onChange={(value) => updateFilter('searchQuery', value)}
                  placeholder="Rechercher un produit..."
                />

                <Separator />

                <SortFilter
                  sortBy={filters.sortBy}
                  sortOrder={filters.sortOrder}
                  onSortByChange={(value) => updateFilter('sortBy', value)}
                  onSortOrderChange={(value) => updateFilter('sortOrder', value)}
                />

                <Separator />

                <CategoryFilter
                  categories={categories}
                  selectedCategory={filters.selectedCategory}
                  onChange={(value) => updateFilter('selectedCategory', value)}
                />

                <Separator />

                <PriceRangeFilter
                  value={filters.priceRange}
                  onChange={(value) => updateFilter('priceRange', value)}
                  min={priceRange[0]}
                  max={priceRange[1]}
                />

                <Separator />

                <BrandFilter
                  brands={brands}
                  selectedBrands={filters.selectedBrands}
                  onChange={(value) => updateFilter('selectedBrands', value)}
                />

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-foreground">Disponibilité</h3>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={filters.inStockOnly}
                      onCheckedChange={(value) => updateFilter('inStockOnly', !!value)}
                    />
                    <Package className="h-4 w-4" />
                    <span className="text-sm">En stock uniquement</span>
                  </label>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AmbassadorFilterSidebar;