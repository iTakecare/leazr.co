import { useState, useEffect, useMemo } from "react";
import { Product } from "@/types/catalog";
import { useSearchParams } from "react-router-dom";

export interface PublicSimplifiedFilterState {
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: 'name' | 'price' | 'brand' | 'newest';
  sortOrder: 'asc' | 'desc';
}

export const usePublicSimplifiedFilter = (products: Product[] = []) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL params
  const [filters, setFilters] = useState<PublicSimplifiedFilterState>({
    searchQuery: searchParams.get('search') || '',
    selectedCategory: searchParams.get('category'),
    sortBy: (searchParams.get('sortBy') as PublicSimplifiedFilterState['sortBy']) || 'newest',
    sortOrder: (searchParams.get('sortOrder') as PublicSimplifiedFilterState['sortOrder']) || 'desc'
  });

  // Category translations with icons
  const categoryTranslations: Record<string, { label: string; icon: string }> = {
    'desktop': { label: 'Ordinateurs fixes', icon: '🖥️' },
    'laptop': { label: 'Ordinateurs portables', icon: '💻' }, 
    'tablet': { label: 'Tablettes', icon: '📱' },
    'smartphone': { label: 'Smartphones', icon: '📱' },
    'display': { label: 'Écrans', icon: '🖥️' },
    'accessory': { label: 'Accessoires', icon: '🔌' },
    'peripheral': { label: 'Périphériques', icon: '⌨️' },
    'other': { label: 'Autres', icon: '📦' }
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
      const categoryInfo = categoryTranslations[categoryName] || { label: categoryName, icon: '📦' };
      const count = products.filter(p => p.category === categoryName).length;
      return { 
        name: categoryName, 
        label: categoryInfo.label,
        icon: categoryInfo.icon,
        count 
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.searchQuery) params.set('search', filters.searchQuery);
    if (filters.selectedCategory) params.set('category', filters.selectedCategory);
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
  }, [products, filters]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.searchQuery ||
      filters.selectedCategory
    );
  }, [filters]);

  const updateFilter = <K extends keyof PublicSimplifiedFilterState>(
    key: K,
    value: PublicSimplifiedFilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      selectedCategory: null,
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
    hasActiveFilters,
    resultsCount: filteredProducts.length
  };
};