
import { useState, useCallback, useMemo } from "react";
import { Product } from "@/types/catalog";

export const useProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTab, setSelectedTab] = useState("tous");

  // Extrait les catégories uniques des produits (uniquement les chaînes de caractères)
  const categories = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    const categorySet = new Set<string>();
    
    products.forEach(product => {
      if (product.category && typeof product.category === 'string') {
        categorySet.add(product.category);
      }
    });
    
    return Array.from(categorySet);
  }, [products]);

  // Filtre les produits selon la recherche, la catégorie et le type
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    let filtered = [...products];
    
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query)) ||
        (product.model?.toLowerCase().includes(query))
      );
    }
    
    // Filtre par catégorie
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => 
        typeof product.category === 'string' && product.category === selectedCategory
      );
    }
    
    // Filtre par type de produit
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

  // Réinitialise tous les filtres
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
