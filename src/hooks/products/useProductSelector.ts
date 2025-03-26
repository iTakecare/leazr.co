
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Product } from "@/types/catalog";

export const useProductSelector = (isOpen: boolean) => {
  const fetchProducts = async (): Promise<Product[]> => {
    console.log("Fetching products from Supabase");
    
    try {
      // Récupérer tous les produits actifs
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      
      if (productsError) {
        console.error("Error fetching products:", productsError);
        throw productsError;
      }
      
      console.log(`Retrieved ${productsData.length} products`);
      
      // Fetch variant prices for all products
      const { data: variantPricesData, error: variantPricesError } = await supabase
        .from("product_variant_prices")
        .select("*");
      
      if (variantPricesError) {
        console.error("Error fetching variant prices:", variantPricesError);
        throw variantPricesError;
      }
      
      console.log(`Retrieved ${variantPricesData.length} variant prices`);
      
      // Organize variant prices by product ID for easier access
      const variantPricesByProductId: Record<string, any[]> = {};
      variantPricesData.forEach(price => {
        if (!variantPricesByProductId[price.product_id]) {
          variantPricesByProductId[price.product_id] = [];
        }
        variantPricesByProductId[price.product_id].push(price);
      });
      
      // Process all products with their variants
      const productsWithVariants = productsData.map(product => {
        // Get variant prices for this product
        const productVariantPrices = variantPricesByProductId[product.id] || [];
        
        // Determine if this is a parent product
        const isParent = productVariantPrices.length > 0 || product.is_parent;
        
        // Extract variation attributes if needed
        let variationAttributes = product.variation_attributes;
        if (isParent && (!variationAttributes || Object.keys(variationAttributes).length === 0) && productVariantPrices.length > 0) {
          variationAttributes = extractVariationAttributes(productVariantPrices);
        }
        
        // If the product has variation_attributes but no is_parent flag, set is_parent to true
        const hasVariationAttrs = variationAttributes && Object.keys(variationAttributes).length > 0;
        const shouldBeParent = isParent || hasVariationAttrs;
        
        return {
          ...product,
          variant_combination_prices: productVariantPrices,
          is_parent: shouldBeParent,
          variation_attributes: variationAttributes,
          createdAt: product.created_at || new Date(),
          updatedAt: product.updated_at || new Date()
        };
      });
      
      // Find parent-child relationships
      const productsWithChildrenInfo = productsWithVariants.map(product => {
        // Find variants that have this product as parent
        const variants = productsWithVariants.filter(p => p.parent_id === product.id);
        
        // Count variant combination prices
        const variantCombinationCount = product.variant_combination_prices?.length || 0;
        
        // Calculate total number of possible combinations from variation attributes
        let variationAttributesCombinationsCount = 0;
        if (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) {
          variationAttributesCombinationsCount = calculateCombinationsFromAttributes(product.variation_attributes);
        }
        
        // Determine the final count of variants - take the highest number from different sources
        const finalVariantsCount = Math.max(
          variants.length, 
          variantCombinationCount,
          variationAttributesCombinationsCount
        );
        
        // Check if the product has variants
        const hasVariants = variants.length > 0 || variantCombinationCount > 0 || 
                           (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0);
        
        return {
          ...product,
          variants: variants,
          has_variants: hasVariants,
          variants_count: finalVariantsCount,
          has_child_variants: variants.length > 0
        };
      });
      
      // Log each product's variant information for debugging
      productsWithChildrenInfo.forEach(product => {
        if (product.has_variants || product.is_parent) {
          console.log(`Product ${product.name} (${product.id}) variants info:`, {
            variants_count: product.variants_count,
            combinations: product.variant_combination_prices?.length || 0,
            childVariants: product.variants?.length || 0,
            variationAttributes: product.variation_attributes ? Object.keys(product.variation_attributes).length : 0
          });
        }
      });
      
      return productsWithChildrenInfo;
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
  
  // Calculate total possible combinations from a set of variation attributes
  const calculateCombinationsFromAttributes = (attributes: Record<string, string[]>): number => {
    if (!attributes || Object.keys(attributes).length === 0) return 0;
    
    return Object.values(attributes).reduce((total, values) => {
      return total * (Array.isArray(values) ? values.length : 0);
    }, 1);
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

  // Reset the component state when the selector is opened
  useEffect(() => {
    if (isOpen) {
      // The filter reset is handled in useProductFilter
    }
  }, [isOpen]);

  return {
    products,
    isLoading,
    error
  };
};
