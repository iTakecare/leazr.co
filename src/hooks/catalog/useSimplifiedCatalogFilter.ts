import { useMemo, useState, useCallback } from "react";
import { Product } from "@/types/catalog";

interface SimplifiedFilterState {
  searchQuery: string;
  selectedCategory: string;
  sortBy: 'newest' | 'name' | 'price' | 'brand';
  sortOrder: 'asc' | 'desc';
}

export const useSimplifiedCatalogFilter = (products: Product[] = []) => {
  const [filters, setFilters] = useState<SimplifiedFilterState>({
    searchQuery: "",
    selectedCategory: "",
    sortBy: 'newest',
    sortOrder: 'desc'
  });

  // Memoized categories with count and translations
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    products.forEach(product => {
      if (product.category) {
        categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + 1);
      }
    });
    return Array.from(categoryMap.entries()).map(([name, count]) => ({ 
      name, 
      translation: name, // For now using the same, but can be enhanced with real translations
      count 
    }));
  }, [products]);

  // Optimized filtering
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    
    let filtered = [...products];
    
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name?.toLowerCase().includes(query) ||
        product.brand?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      );
    }
    
    // Category filter
    if (filters.selectedCategory) {
      filtered = filtered.filter(product => product.category === filters.selectedCategory);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let result = 0;
      switch (filters.sortBy) {
        case 'name':
          result = (a.name || "").localeCompare(b.name || "");
          break;
        case 'price':
          result = (a.price || 0) - (b.price || 0);
          break;
        case 'brand':
          result = (a.brand || "").localeCompare(b.brand || "");
          break;
        default:
          return 0; // Keep original order for newest
      }
      return filters.sortOrder === 'desc' ? -result : result;
    });
    
    return filtered;
  }, [products, filters]);

  const updateFilter = useCallback(<K extends keyof SimplifiedFilterState>(
    key: K, 
    value: SimplifiedFilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: "",
      selectedCategory: "",
      sortBy: 'newest',
      sortOrder: 'desc'
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.searchQuery || 
              filters.selectedCategory || 
              filters.sortBy !== 'newest');
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    filteredProducts,
    categories,
    hasActiveFilters,
    resultsCount: filteredProducts.length
  };
};