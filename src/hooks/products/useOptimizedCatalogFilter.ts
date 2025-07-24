import { useMemo, useState, useCallback } from "react";
import { Product } from "@/types/catalog";

interface OptimizedFilterState {
  searchQuery: string;
  selectedCategory: string;
  selectedBrands: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
  sortBy: 'newest' | 'name' | 'price' | 'brand';
  sortOrder: 'asc' | 'desc';
}

export const useOptimizedCatalogFilter = (products: Product[] = []) => {
  const [filters, setFilters] = useState<OptimizedFilterState>({
    searchQuery: "",
    selectedCategory: "",
    selectedBrands: [],
    priceRange: [0, 10000],
    inStockOnly: false,
    sortBy: 'newest',
    sortOrder: 'desc'
  });

  // Memoized categories with count
  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    products.forEach(product => {
      if (product.category) {
        categoryMap.set(product.category, (categoryMap.get(product.category) || 0) + 1);
      }
    });
    return Array.from(categoryMap.entries()).map(([name, count]) => ({ 
      name, 
      translation: name, 
      count 
    }));
  }, [products]);

  // Memoized brands with count
  const brands = useMemo(() => {
    const brandMap = new Map<string, number>();
    products.forEach(product => {
      if (product.brand) {
        brandMap.set(product.brand, (brandMap.get(product.brand) || 0) + 1);
      }
    });
    return Array.from(brandMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Memoized price range
  const priceRange = useMemo((): [number, number] => {
    if (products.length === 0) return [0, 1000];
    const prices = products
      .map(p => p.price || p.monthly_price || 0)
      .filter(p => p > 0);
    if (prices.length === 0) return [0, 1000];
    return [Math.min(...prices), Math.max(...prices)];
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
    
    // Brand filter
    if (filters.selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && filters.selectedBrands.includes(product.brand)
      );
    }
    
    // Price filter
    const [minPrice, maxPrice] = filters.priceRange;
    filtered = filtered.filter(product => {
      const price = product.price || product.monthly_price || 0;
      return price >= minPrice && price <= maxPrice;
    });
    
    // Stock filter
    if (filters.inStockOnly) {
      filtered = filtered.filter(product => (product.stockQuantity || 0) > 0);
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

  const updateFilter = useCallback(<K extends keyof OptimizedFilterState>(
    key: K, 
    value: OptimizedFilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: "",
      selectedCategory: "",
      selectedBrands: [],
      priceRange: [0, 10000],
      inStockOnly: false,
      sortBy: 'newest',
      sortOrder: 'desc'
    });
  }, []);

  const hasActiveFilters = useMemo(() => {
    return !!(filters.searchQuery || 
              filters.selectedCategory || 
              filters.selectedBrands.length > 0 ||
              filters.inStockOnly ||
              filters.sortBy !== 'newest' ||
              filters.priceRange[0] > 0 ||
              filters.priceRange[1] < 10000);
  }, [filters]);

  return {
    filters,
    updateFilter,
    resetFilters,
    filteredProducts,
    categories,
    brands,
    priceRange,
    hasActiveFilters,
    resultsCount: filteredProducts.length
  };
};