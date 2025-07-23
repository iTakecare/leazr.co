import { useState, useEffect, useMemo } from "react";
import { Product } from "@/types/catalog";
import { useQuery } from "@tanstack/react-query";
import { getCategories as fetchCategories } from "@/services/catalogService";

interface AmbassadorFilterState {
  searchQuery: string;
  selectedCategory: string | null;
  priceRange: [number, number];
  selectedBrands: string[];
  inStockOnly: boolean;
  sortBy: 'name' | 'price' | 'brand' | 'newest';
  sortOrder: 'asc' | 'desc';
}

export const useAmbassadorProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'brand' | 'newest'>('newest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(false);

  // Fetch categories with translations from the database
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
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
    'other': 'Autres',
    'all': 'Toutes catégories'
  };

  // Get categories from products with counts
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const categoryCounts: Record<string, number> = {};
    
    products.forEach(product => {
      if (product.category && product.category !== '') {
        categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
      }
    });
    
    return Object.entries(categoryCounts).map(([name, count]) => {
      const translation = categoryTranslations[name] || 
                         categoriesData.find(c => c.name === name)?.translation || 
                         name;
      return { name, translation, count };
    }).sort((a, b) => a.translation.localeCompare(b.translation));
  }, [products, categoriesData]);

  // Get brands from products with counts
  const brands = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const brandCounts: Record<string, number> = {};
    
    products.forEach(product => {
      if (product.brand && product.brand !== '') {
        brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1;
      }
    });
    
    return Object.entries(brandCounts).map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Get price range
  const priceRangeLimits = useMemo((): [number, number] => {
    if (!products || products.length === 0) return [0, 5000];
    
    const allPrices: number[] = [];
    
    products.forEach(product => {
      if (product.monthly_price && !isNaN(parseFloat(String(product.monthly_price)))) {
        allPrices.push(parseFloat(String(product.monthly_price)));
      } else if (product.price && !isNaN(parseFloat(String(product.price)))) {
        allPrices.push(parseFloat(String(product.price)));
      }
      
      if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
        product.variant_combination_prices.forEach(variant => {
          if (variant.monthly_price && !isNaN(parseFloat(String(variant.monthly_price)))) {
            allPrices.push(parseFloat(String(variant.monthly_price)));
          } else if (variant.price && !isNaN(parseFloat(String(variant.price)))) {
            allPrices.push(parseFloat(String(variant.price)));
          }
        });
      }
    });
    
    const validPrices = allPrices.filter(price => price > 0 && !isNaN(price));
    
    if (validPrices.length === 0) return [0, 5000];
    
    const min = Math.floor(Math.min(...validPrices));
    const max = Math.ceil(Math.max(...validPrices));
    
    return [min, max];
  }, [products]);

  // Reset price range when products change
  useEffect(() => {
    if (products && products.length > 0) {
      const range = priceRangeLimits;
      setPriceRange(range);
      setIsPriceFilterActive(false);
    }
  }, [products, priceRangeLimits]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    let filtered = [...products];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query))
      );
    }
    
    // Filter by selected category
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by price range - only if the price filter is active
    const [minPrice, maxPrice] = priceRangeLimits;
    if (isPriceFilterActive && (priceRange[0] > minPrice || priceRange[1] < maxPrice)) {
      filtered = filtered.filter(product => {
        const price = product.price ? parseFloat(String(product.price)) : 0;
        const monthlyPrice = product.monthly_price ? parseFloat(String(product.monthly_price)) : 0;
        const actualPrice = monthlyPrice > 0 ? monthlyPrice : price;
        return actualPrice >= priceRange[0] && actualPrice <= priceRange[1];
      });
    }
    
    // Filter by brand
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && selectedBrands.includes(product.brand)
      );
    }
    
    // Filter by stock status
    if (inStockOnly) {
      filtered = filtered.filter(product => product.stock && product.stock > 0);
    }
    
    // Sort products
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'price':
          const priceA = a.monthly_price ? parseFloat(String(a.monthly_price)) : (a.price ? parseFloat(String(a.price)) : 0);
          const priceB = b.monthly_price ? parseFloat(String(b.monthly_price)) : (b.price ? parseFloat(String(b.price)) : 0);
          comparison = priceA - priceB;
          break;
        case 'brand':
          comparison = (a.brand || '').localeCompare(b.brand || '');
          break;
        case 'newest':
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          comparison = dateB - dateA;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [products, searchQuery, selectedCategory, priceRange, selectedBrands, inStockOnly, sortBy, sortOrder, isPriceFilterActive, priceRangeLimits]);

  const handlePriceRangeChange = (newRange: [number, number]) => {
    setPriceRange(newRange);
    setIsPriceFilterActive(true);
  };

  const hasActiveFilters = searchQuery !== "" || 
                          selectedCategory !== null || 
                          selectedBrands.length > 0 || 
                          inStockOnly ||
                          isPriceFilterActive;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    const fullRange = priceRangeLimits;
    setPriceRange(fullRange);
    setIsPriceFilterActive(false);
    setSelectedBrands([]);
    setInStockOnly(false);
    setSortBy('newest');
    setSortOrder('desc');
  };

  const filters: AmbassadorFilterState = {
    searchQuery,
    selectedCategory,
    priceRange,
    selectedBrands,
    inStockOnly,
    sortBy,
    sortOrder
  };

  const updateFilter = <K extends keyof AmbassadorFilterState>(
    key: K, 
    value: AmbassadorFilterState[K]
  ) => {
    switch (key) {
      case 'searchQuery':
        setSearchQuery(value as string);
        break;
      case 'selectedCategory':
        setSelectedCategory(value as string | null);
        break;
      case 'priceRange':
        handlePriceRangeChange(value as [number, number]);
        break;
      case 'selectedBrands':
        setSelectedBrands(value as string[]);
        break;
      case 'inStockOnly':
        setInStockOnly(value as boolean);
        break;
      case 'sortBy':
        setSortBy(value as 'name' | 'price' | 'brand' | 'newest');
        break;
      case 'sortOrder':
        setSortOrder(value as 'asc' | 'desc');
        break;
    }
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    filteredProducts,
    categories,
    brands,
    priceRangeLimits,
    hasActiveFilters,
    resultsCount: filteredProducts.length
  };
};