import { useState, useEffect } from "react";
import { Product } from "@/types/catalog";
import { useQuery } from "@tanstack/react-query";
import { getCategories as fetchCategories } from "@/services/catalogService";

export const useProductFilter = (products: Product[] = []) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("tous");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showInStock, setShowInStock] = useState<boolean | null>(null);
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(false);
  
  // Fetch categories with translations from the database
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories
  });
  
  // Predefined category translations
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

  // Create a map of category names to their translations
  const getCategoriesFromProducts = (): {name: string, translation: string}[] => {
    if (!products || products.length === 0) return [];
    
    const categoriesSet = new Set<string>();
    
    products.forEach(product => {
      if (product.category && product.category !== '') {
        categoriesSet.add(product.category);
      }
    });
    
    // Convert to array and sort by the French translation
    return Array.from(categoriesSet).map(categoryName => {
      const translation = categoryTranslations[categoryName] || 
                          categoriesData.find(c => c.name === categoryName)?.translation || 
                          categoryName;
      return { name: categoryName, translation };
    }).sort((a, b) => a.translation.localeCompare(b.translation));
  };

  // Reset price range when products change
  useEffect(() => {
    if (products && products.length > 0) {
      const range = getPriceRange();
      console.log("Setting initial price range:", range);
      setPriceRange(range);
      setIsPriceFilterActive(false); // Reset price filter active state
    }
  }, [products]);
  
  const getFilteredProducts = () => {
    if (!products || products.length === 0) return [];
    
    let filtered = [...products];
    
    console.log(`Filtration en cours. Produits disponibles: ${filtered.length}`);
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query))
      );
      console.log(`Après filtrage par recherche: ${filtered.length} produits`);
    }
    
    // Filter by product type
    if (selectedTab === "parents") {
      filtered = filtered.filter(product => 
        product.is_parent || 
        (product.variant_combination_prices && product.variant_combination_prices.length > 0)
      );
      console.log(`Après filtrage par type (parents): ${filtered.length} produits`);
    } else if (selectedTab === "variantes") {
      filtered = filtered.filter(product => 
        product.variation_attributes && 
        Object.keys(product.variation_attributes).length > 0
      );
      console.log(`Après filtrage par type (variantes): ${filtered.length} produits`);
    } else if (selectedTab === "individuels") {
      filtered = filtered.filter(product => 
        !product.is_parent && 
        (!product.variation_attributes || Object.keys(product.variation_attributes).length === 0) &&
        (!product.variant_combination_prices || product.variant_combination_prices.length === 0)
      );
      console.log(`Après filtrage par type (individuels): ${filtered.length} produits`);
    }
    
    // Filter by selected category
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category === selectedCategory
      );
      console.log(`Après filtrage par catégorie (${selectedCategory}): ${filtered.length} produits`);
    }
    
    // Filter by price range - only if the price filter is active
    const [minPrice, maxPrice] = getPriceRange();
    if (isPriceFilterActive && (priceRange[0] > minPrice || priceRange[1] < maxPrice)) {
      console.log(`Filtrage par prix actif: ${priceRange[0]} - ${priceRange[1]} (limites: ${minPrice} - ${maxPrice})`);
      filtered = filtered.filter(product => {
        const price = product.price ? parseFloat(String(product.price)) : 0;
        const monthlyPrice = product.monthly_price ? parseFloat(String(product.monthly_price)) : 0;
        const actualPrice = monthlyPrice > 0 ? monthlyPrice : price;
        return actualPrice >= priceRange[0] && actualPrice <= priceRange[1];
      });
      console.log(`Après filtrage par prix: ${filtered.length} produits`);
    } else {
      console.log("Pas de filtrage par prix (filtre désactivé ou plage complète)");
    }
    
    // Filter by brand
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(product => 
        product.brand && selectedBrands.includes(product.brand)
      );
      console.log(`Après filtrage par marque: ${filtered.length} produits`);
    }
    
    // Filter by stock status
    if (showInStock !== null) {
      filtered = filtered.filter(product => 
        showInStock ? (product.stock && product.stock > 0) : (product.stock === 0 || !product.stock)
      );
      console.log(`Après filtrage par stock: ${filtered.length} produits`);
    }
    
    console.log(`Produits filtrés: ${filtered.length}`);
    filtered.forEach((product, index) => {
      console.log(`Produit filtré ${index + 1}: ${product.name} (ID: ${product.id})`);
      console.log(`- is_variation: ${product.is_variation}, parent_id: ${product.parent_id}`);
    });
    
    return filtered;
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
      // Check monthly price first, then regular price
      if (product.monthly_price && !isNaN(parseFloat(String(product.monthly_price)))) {
        allPrices.push(parseFloat(String(product.monthly_price)));
      } else if (product.price && !isNaN(parseFloat(String(product.price)))) {
        allPrices.push(parseFloat(String(product.price)));
      }
      
      // Also check variant prices if available
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
    
    // Filter out zero prices and NaN values
    const validPrices = allPrices.filter(price => price > 0 && !isNaN(price));
    
    if (validPrices.length === 0) return [0, 5000];
    
    const min = Math.floor(Math.min(...validPrices));
    const max = Math.ceil(Math.max(...validPrices));
    
    console.log(`Plage de prix calculée: ${min} - ${max} (sur ${validPrices.length} prix valides)`);
    return [min, max];
  };
  
  const handlePriceRangeChange = (newRange: [number, number]) => {
    setPriceRange(newRange);
    setIsPriceFilterActive(true);
  };
  
  return {
    searchQuery,
    setSearchQuery,
    selectedTab,
    setSelectedTab,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange: handlePriceRangeChange,
    isPriceFilterActive,
    setIsPriceFilterActive,
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
      const fullRange = getPriceRange();
      console.log(`Réinitialisation des filtres. Nouvelle plage de prix: ${fullRange[0]} - ${fullRange[1]}`);
      setPriceRange(fullRange);
      setIsPriceFilterActive(false);
      setSelectedBrands([]);
      setShowInStock(null);
    }
  };
};
