import { useState, useEffect } from "react";
import { Product } from "@/types/catalog";

export const useProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTab, setSelectedTab] = useState("tous");
  
  // Extract unique categories from products
  const categories: string[] = products 
    ? [...new Set(products.map(product => product.category))]
        .filter((category): category is string => Boolean(category))
    : [];
  
  const getFilteredProducts = () => {
    if (!products) return [];
    
    let filtered = products;
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    // Filter by product type
    if (selectedTab === "parents") {
      filtered = filtered.filter(product => 
        product.is_parent || 
        (product.variant_combination_prices && product.variant_combination_prices.length > 0)
      );
    } else if (selectedTab === "variantes") {
      filtered = filtered.filter(product => 
        product.variation_attributes && 
        Object.keys(product.variation_attributes).length > 0
      );
    } else if (selectedTab === "individuels") {
      filtered = filtered.filter(product => 
        !product.is_parent && 
        (!product.variation_attributes || Object.keys(product.variation_attributes).length === 0) &&
        (!product.variant_combination_prices || product.variant_combination_prices.length === 0)
      );
    }
    
    return filtered;
  };

  // Reset filters when products change
  useEffect(() => {
    if (products && products.length > 0) {
      // Keep filters as they are
    }
  }, [products]);
  
  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTab,
    setSelectedTab,
    categories,
    filteredProducts: getFilteredProducts(),
    resetFilters: () => {
      setSearchQuery("");
      setSelectedCategory("all");
      setSelectedTab("tous");
    }
  };
};
