
import { useState, useEffect, useMemo } from "react";
import { Product } from "@/types/catalog";
import { useQuery } from "@tanstack/react-query";
import { getCategories as fetchCategories } from "@/services/catalogService";
import { useSearchParams } from "react-router-dom";

export interface PublicFilterState {
  searchQuery: string;
  selectedCategory: string | null;
  priceRange: [number, number];
  selectedBrands: string[];
  inStockOnly: boolean;
  sortBy: 'name' | 'price' | 'brand' | 'newest';
  sortOrder: 'asc' | 'desc';
}

export const usePublicProductFilter = (products: Product[] = []) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL params
  const [filters, setFilters] = useState<PublicFilterState>({
    searchQuery: searchParams.get('search') || '',
    selectedCategory: searchParams.get('category'),
    priceRange: [0, 5000],
    selectedBrands: searchParams.get('brands')?.split(',').filter(Boolean) || [],
    inStockOnly: searchParams.get('inStock') === 'true',
    sortBy: (searchParams.get('sortBy') as PublicFilterState['sortBy']) || 'newest',
    sortOrder: (searchParams.get('sortOrder') as PublicFilterState['sortOrder']) || 'desc'
  });

  // Fetch categories
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["public-categories"],
    queryFn: fetchCategories
  });

  // Category translations
  const categoryTranslations: Record<string, string> = {
    'desktop': 'Ordinateurs fixes',
    'laptop': 'Ordinateurs portables', 
    'tablet': 'Tablettes',
    'smartphone': 'Smartphones',
    'display': 'Écrans',
    'accessory': 'Accessoires',
    'peripheral': 'Périphériques',
    'other': 'Autres'
  };

  // Get categories from products
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const categoriesSet = new Set<string>();
    products.forEach(product => {
      if (product.category && product.category !== '') {
        categoriesSet.add(product.category);
      }
    });
    
    return Array.from(categoriesSet).map(categoryName => {
      const translation = categoryTranslations[categoryName] || 
                          categoriesData.find(c => c.name === categoryName)?.translation || 
                          categoryName;
      const count = products.filter(p => p.category === categoryName).length;
      return { name: categoryName, translation, count };
    }).sort((a, b) => a.translation.localeCompare(b.translation));
  }, [products, categoriesData]);

  // Get brands from products
  const brands = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const brandsMap = new Map<string, number>();
    products.forEach(product => {
      if (product.brand) {
        brandsMap.set(product.brand, (brandsMap.get(product.brand) || 0) + 1);
      }
    });
    
    return Array.from(brandsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Get price range
  const priceRange = useMemo(() => {
    if (!products || products.length === 0) return [0, 5000] as [number, number];
    
    const prices = products
      .map(p => p.monthly_price || p.price || 0)
      .filter(price => price > 0);
    
    if (prices.length === 0) return [0, 5000] as [number, number];
    
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    
    return [min, max] as [number, number];
  }, [products]);

  // Update price range when products change
  useEffect(() => {
    const [min, max] = priceRange;
    setFilters(prev => ({
      ...prev,
      priceRange: [
        Math.max(min, prev.priceRange[0]),
        Math.min(max, prev.priceRange[1])
      ]
    }));
  }, [priceRange]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.searchQuery) params.set('search', filters.searchQuery);
    if (filters.selectedCategory) params.set('category', filters.selectedCategory);
    if (filters.selectedBrands.length > 0) params.set('brands', filters.selectedBrands.join(','));
    if (filters.inStockOnly) params.set('inStock', 'true');
    if (filters.sortBy !== 'newest') params.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== 'desc') params.set('sortOrder', filters.sortOrder);
    
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
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
    
    // Price filter
    const [minPrice, maxPrice] = filters.priceRange;
    if (minPrice > priceRange[0] || maxPrice < priceRange[1]) {
      filtered = filtered.filter(product => {
        const price = product.monthly_price || product.price || 0;
        return price >= minPrice && price <= maxPrice;
      });
    }
    
    // Brand filter
    if (filters.selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && filters.selectedBrands.includes(product.brand)
      );
    }
    
    // Stock filter
    if (filters.inStockOnly) {
      filtered = filtered.filter(product => product.stock && product.stock > 0);
    }
    
    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'price':
          const priceA = a.monthly_price || a.price || 0;
          const priceB = b.monthly_price || b.price || 0;
          comparison = priceA - priceB;
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'newest':
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          comparison = dateB - dateA;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [products, filters, priceRange]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.searchQuery ||
      filters.selectedCategory ||
      filters.selectedBrands.length > 0 ||
      filters.inStockOnly ||
      filters.priceRange[0] > priceRange[0] ||
      filters.priceRange[1] < priceRange[1]
    );
  }, [filters, priceRange]);

  const updateFilter = <K extends keyof PublicFilterState>(
    key: K,
    value: PublicFilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      selectedCategory: null,
      priceRange,
      selectedBrands: [],
      inStockOnly: false,
      sortBy: 'newest',
      sortOrder: 'desc'
    });
  };

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
