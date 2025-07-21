
import { useState, useEffect } from "react";
import { Product } from "@/types/catalog";

export const usePublicProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(false);
  
  // Reset price range when products change
  useEffect(() => {
    if (products && products.length > 0) {
      const range = getPriceRange();
      setPriceRange(range);
      setIsPriceFilterActive(false);
    }
  }, [products]);
  
  const getFilteredProducts = () => {
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
      filtered = filtered.filter(product => 
        product.category === selectedCategory
      );
    }
    
    // Filter by price range - only if the price filter is active
    const [minPrice, maxPrice] = getPriceRange();
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
    
    return filtered;
  };

  // Get unique categories from products
  const getCategories = (): string[] => {
    if (!products || products.length === 0) return [];
    
    const categories = products
      .map(product => product.category)
      .filter((category): category is string => 
        category !== undefined && category !== null && category !== ''
      );
    
    return [...new Set(categories)].sort();
  };

  // Get unique brands from products
  const getBrands = (): string[] => {
    if (!products || products.length === 0) return [];
    
    const brands = products
      .map(product => product.brand)
      .filter((brand): brand is string => 
        brand !== undefined && brand !== null && brand !== ''
      );
    
    return [...new Set(brands)].sort();
  };
  
  // Get min and max prices for price range
  const getPriceRange = (): [number, number] => {
    if (!products || products.length === 0) return [0, 5000];
    
    const allPrices: number[] = [];
    
    products.forEach(product => {
      if (product.monthly_price && !isNaN(parseFloat(String(product.monthly_price)))) {
        allPrices.push(parseFloat(String(product.monthly_price)));
      } else if (product.price && !isNaN(parseFloat(String(product.price)))) {
        allPrices.push(parseFloat(String(product.price)));
      }
    });
    
    const validPrices = allPrices.filter(price => price > 0 && !isNaN(price));
    
    if (validPrices.length === 0) return [0, 5000];
    
    const min = Math.floor(Math.min(...validPrices));
    const max = Math.ceil(Math.max(...validPrices));
    
    return [min, max];
  };
  
  const handlePriceRangeChange = (newRange: [number, number]) => {
    setPriceRange(newRange);
    setIsPriceFilterActive(true);
  };
  
  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange: handlePriceRangeChange,
    isPriceFilterActive,
    setIsPriceFilterActive,
    selectedBrands,
    setSelectedBrands,
    filteredProducts: getFilteredProducts(),
    categories: getCategories(),
    brands: getBrands(),
    priceRangeLimits: getPriceRange(),
    resetFilters: () => {
      setSearchQuery("");
      setSelectedCategory(null);
      const fullRange = getPriceRange();
      setPriceRange(fullRange);
      setIsPriceFilterActive(false);
      setSelectedBrands([]);
    }
  };
};
