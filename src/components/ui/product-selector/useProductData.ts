
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product } from "@/types/catalog";

export const useProductData = (isOpen: boolean) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const fetchProducts = async (): Promise<Product[]> => {
    try {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      
      if (productsError) {
        console.error("Error fetching products:", productsError);
        throw productsError;
      }
      
      const { data: variantPricesData, error: variantPricesError } = await supabase
        .from("product_variant_prices")
        .select("*");
      
      if (variantPricesError) {
        console.error("Error fetching variant prices:", variantPricesError);
        throw variantPricesError;
      }
      
      const productsWithVariants = productsData.map(product => {
        const productVariantPrices = variantPricesData.filter(price => 
          price.product_id === product.id
        );
        
        const isParent = productVariantPrices.length > 0;
        
        let variationAttributes = product.variation_attributes;
        if (isParent && (!variationAttributes || Object.keys(variationAttributes).length === 0)) {
          variationAttributes = extractVariationAttributes(productVariantPrices);
        }
        
        return {
          ...product,
          variant_combination_prices: productVariantPrices,
          is_parent: isParent || product.is_parent,
          variation_attributes: variationAttributes,
          createdAt: product.created_at || new Date(),
          updatedAt: product.updated_at || new Date()
        };
      });
      
      return productsWithVariants;
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw error;
    }
  };
  
  const extractVariationAttributes = (variantPrices: any[]): Record<string, string[]> => {
    const attributes: Record<string, Set<string>> = {};
    
    variantPrices.forEach(price => {
      if (price.attributes) {
        Object.entries(price.attributes).forEach(([key, value]) => {
          if (!attributes[key]) {
            attributes[key] = new Set();
          }
          attributes[key].add(String(value));
        });
      }
    });
    
    const result: Record<string, string[]> = {};
    Object.entries(attributes).forEach(([key, values]) => {
      result[key] = Array.from(values);
    });
    
    return result;
  };

  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ["products-selector"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    enabled: isOpen,
    meta: {
      onError: (err: Error) => {
        console.error("Products query failed:", err);
        toast.error("Erreur lors du chargement des produits");
      }
    }
  });

  // Get unique categories from products
  const categories: string[] = products 
    ? [...new Set(products.map(product => product.category))]
      .filter((category): category is string => Boolean(category))
    : [];
    
  // Filter products based on search query and selected category
  const getFilteredProducts = () => {
    if (!products) return [];
    
    let filtered = products;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        (product.name?.toLowerCase().includes(query)) || 
        (product.brand?.toLowerCase().includes(query)) ||
        (product.description?.toLowerCase().includes(query))
      );
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    return filtered;
  };

  const filteredProducts = getFilteredProducts();
  
  // Reset filters when the selector is opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedCategory("all");
    }
  }, [isOpen]);

  return {
    products,
    filteredProducts,
    categories,
    searchQuery, 
    setSearchQuery,
    selectedCategory, 
    setSelectedCategory,
    isLoading,
    error
  };
};
