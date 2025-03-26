
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
      
      // Organiser les prix de variantes par ID de produit pour un accès plus facile
      const variantPricesByProductId: Record<string, any[]> = {};
      variantPricesData.forEach(price => {
        if (!variantPricesByProductId[price.product_id]) {
          variantPricesByProductId[price.product_id] = [];
        }
        variantPricesByProductId[price.product_id].push(price);
      });
      
      // Traiter tous les produits avec leurs variantes
      const productsWithVariants = productsData.map(product => {
        // Obtenir les prix de variantes pour ce produit
        const productVariantPrices = variantPricesByProductId[product.id] || [];
        
        // Déterminer si c'est un produit parent
        const isParent = productVariantPrices.length > 0 || product.is_parent;
        
        // Extraire les attributs de variation si nécessaire
        let variationAttributes = product.variation_attributes;
        if (isParent && (!variationAttributes || Object.keys(variationAttributes).length === 0)) {
          variationAttributes = extractVariationAttributes(productVariantPrices);
        }
        
        return {
          ...product,
          variant_combination_prices: productVariantPrices,
          is_parent: isParent,
          variation_attributes: variationAttributes,
          createdAt: product.created_at || new Date(),
          updatedAt: product.updated_at || new Date()
        };
      });
      
      // Trouver les relations parent-enfant
      const productsWithChildrenInfo = productsWithVariants.map(product => {
        // Trouver les variantes qui ont ce produit comme parent
        const variants = productsWithVariants.filter(p => p.parent_id === product.id);
        
        // Compter les combinaisons de prix de variantes
        const variantCombinationCount = product.variant_combination_prices?.length || 0;
        
        // Vérifier si le produit a des variantes (comme produits enfants ou combinaisons de prix)
        const hasVariants = variants.length > 0 || variantCombinationCount > 0;
        
        return {
          ...product,
          variants: variants,
          has_variants: hasVariants,
          variants_count: Math.max(variants.length, variantCombinationCount),
          has_child_variants: variants.length > 0
        };
      });
      
      console.log("Produits avec leurs variantes:", productsWithChildrenInfo);
      
      // Log détaillé pour le débogage
      productsWithChildrenInfo.forEach(product => {
        if (product.has_variants) {
          console.log(`Produit ${product.name} (${product.id}) a ${product.variants_count} variantes`);
          console.log(`Variations combinées: ${product.variant_combination_prices?.length || 0}`);
          console.log(`Variations enfants: ${product.variants?.length || 0}`);
          console.log(`Attributs de variation:`, product.variation_attributes);
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
