
import { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { useQuery } from "@tanstack/react-query";
import { getCategories as fetchCategories } from "@/services/catalogService";

export const useProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("tous");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]); // Valeur initiale plus large
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showInStock, setShowInStock] = useState<boolean | null>(null);
  
  // Fetch categories with translations from the database
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories
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
      // Calcul de la plage de prix et application avec un délai
      const newPriceRange = getPriceRange();
      
      // Si la plage est trop restrictive, on l'élargit
      if (newPriceRange[0] === newPriceRange[1] || (newPriceRange[1] - newPriceRange[0] < 10)) {
        // Élargir la plage pour éviter une restriction excessive
        newPriceRange[0] = Math.max(0, newPriceRange[0] - 100);
        newPriceRange[1] = newPriceRange[1] + 1000;
      }
      
      console.log("Nouvelle plage de prix calculée:", newPriceRange);
      setPriceRange(newPriceRange);
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
    
    // Filter by price range - avec plus de flexibilité pour les prix proches des limites
    filtered = filtered.filter(product => {
      // Obtenir le prix le plus pertinent (soit mensuel, soit unique)
      const price = getRelevantPrice(product);
      
      // Ajouter une marge de tolérance pour les valeurs proches des limites (0.1 euro)
      const margin = 0.1;
      return (price >= priceRange[0] - margin) && (price <= priceRange[1] + margin);
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

  // Fonction pour obtenir le prix le plus pertinent d'un produit (mensuel ou unique)
  const getRelevantPrice = (product: Product): number => {
    // Préférer le prix mensuel s'il existe, sinon utiliser le prix normal
    if (product.monthly_price && product.monthly_price > 0) {
      return parseFloat(product.monthly_price.toString());
    } else if (product.price) {
      return parseFloat(product.price.toString());
    }
    return 0;
  };

  // Get unique categories from products with translations
  const getCategoriesFromProducts = (): {name: string, translation: string}[] => {
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
  
  // Get min and max prices for price range, avec une valeur par défaut plus étendue
  const getPriceRange = (): [number, number] => {
    if (!products || products.length === 0) return [0, 5000];
    
    // Collecter tous les prix pertinents (mensuels ou uniques)
    const prices = products
      .map(product => getRelevantPrice(product))
      .filter(price => !isNaN(price) && price > 0);
    
    if (prices.length === 0) return [0, 5000];
    
    // Calculer le min et max avec une marge
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    
    // S'assurer que la plage n'est pas trop restrictive
    const adjustedMin = Math.max(0, min);
    const adjustedMax = Math.max(max, min + 1000); // Garantir un écart d'au moins 1000
    
    console.log(`Price range raw: ${min} - ${max}, adjusted: ${adjustedMin} - ${adjustedMax}`);
    return [adjustedMin, adjustedMax];
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
    categories: getCategoriesFromProducts(),
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
