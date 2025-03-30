
import { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "@/services/catalogService";

export const useProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("tous");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showInStock, setShowInStock] = useState<boolean | null>(null);
  
  // Fetch categories with translations from the database
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories
  });
  
  // Create a map of category names to their translations
  const categoryTranslations = new Map<string, string>();
  categoriesData.forEach(category => {
    if (category.name && category.translation) {
      categoryTranslations.set(category.name, category.translation);
    }
  });
  
  // Reset price range when products change
  useEffect(() => {
    if (products && products.length > 0) {
      setPriceRange(getPriceRange());
    }
  }, [products]);
  
  const getFilteredProducts = () => {
    if (!products || products.length === 0) return [];
    
    let filtered = [...products];
    
    console.log(`Filtering ${filtered.length} products with:`, {
      searchQuery,
      selectedTab,
      selectedCategory,
      priceRange,
      selectedBrands,
      showInStock
    });
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query))
      );
      console.log(`After search query filter: ${filtered.length} products`);
    }
    
    // Filter by product type
    if (selectedTab === "parents") {
      filtered = filtered.filter(product => 
        product.is_parent || 
        (product.variant_combination_prices && product.variant_combination_prices.length > 0)
      );
      console.log(`After product type filter (parents): ${filtered.length} products`);
    } else if (selectedTab === "variantes") {
      filtered = filtered.filter(product => 
        product.variation_attributes && 
        Object.keys(product.variation_attributes).length > 0
      );
      console.log(`After product type filter (variantes): ${filtered.length} products`);
    } else if (selectedTab === "individuels") {
      filtered = filtered.filter(product => 
        !product.is_parent && 
        (!product.variation_attributes || Object.keys(product.variation_attributes).length === 0) &&
        (!product.variant_combination_prices || product.variant_combination_prices.length === 0)
      );
      console.log(`After product type filter (individuels): ${filtered.length} products`);
    }
    
    // Filter by selected category
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category === selectedCategory
      );
      console.log(`After category filter (${selectedCategory}): ${filtered.length} products`);
    }
    
    // Filter by price range
    filtered = filtered.filter(product => {
      const price = product.price ? parseFloat(product.price.toString()) : 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });
    console.log(`After price range filter: ${filtered.length} products`);
    
    // Filter by brand
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && selectedBrands.includes(product.brand)
      );
      console.log(`After brand filter: ${filtered.length} products`);
    }
    
    // Filter by stock status
    if (showInStock !== null) {
      filtered = filtered.filter(product => 
        showInStock ? (product.stock && product.stock > 0) : (product.stock === 0 || !product.stock)
      );
      console.log(`After stock filter: ${filtered.length} products`);
    }
    
    return filtered;
  };

  // Get unique categories from products with translations
  const getCategories = (): {name: string, translation: string}[] => {
    if (!products || products.length === 0) return [];
    
    const categoriesSet = new Set<string>();
    
    products.forEach(product => {
      if (product.category && product.category !== '') {
        categoriesSet.add(product.category);
      }
    });
    
    // Convert to array and sort by the French translation if available, otherwise by name
    return Array.from(categoriesSet).map(categoryName => {
      const translation = categoryTranslations.get(categoryName) || categoryName;
      return { name: categoryName, translation };
    }).sort((a, b) => a.translation.localeCompare(b.translation));
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
    
    const prices = products
      .map(product => product.price ? parseFloat(product.price.toString()) : 0)
      .filter(price => !isNaN(price) && price > 0);
    
    if (prices.length === 0) return [0, 5000];
    
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    
    console.log(`Price range: ${min} - ${max}`);
    return [min, max];
  };
  
  return {
    searchQuery,
    setSearchQuery,
    selectedTab,
    setSelectedTab,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    selectedBrands,
    setSelectedBrands,
    showInStock,
    setShowInStock,
    filteredProducts: getFilteredProducts(),
    categories: getCategories(),
    brands: getBrands(),
    priceRangeLimits: getPriceRange(),
    resetFilters: () => {
      setSearchQuery("");
      setSelectedTab("tous");
      setSelectedCategory(null);
      setPriceRange(getPriceRange());
      setSelectedBrands([]);
      setShowInStock(null);
    }
  };
};
