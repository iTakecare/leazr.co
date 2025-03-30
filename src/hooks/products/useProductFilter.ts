
import { useState, useCallback, useMemo } from "react";
import { Product } from "@/types/catalog";

export const useProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTab, setSelectedTab] = useState("tous");

  // Extract unique categories from products
  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = [...new Set(products
      .map(product => product.category)
      .filter((category): category is string => Boolean(category)))];
    return uniqueCategories;
  }, [products]);

  // Filter products based on search query and selected category
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let filtered = [...products];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query)) ||
        (product.model?.toLowerCase().includes(query))
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
        (product.variation_attributes && Object.keys(product.variation_attributes).length > 0)
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
  }, [products, searchQuery, selectedCategory, selectedTab]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTab("tous");
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTab,
    setSelectedTab,
    categories,
    filteredProducts,
    resetFilters
  };
};
