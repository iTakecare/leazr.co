
import { supabase } from "@/integrations/supabase/client";
import { ProductAttributes, ProductVariationAttributes, VariantCombinationPrice } from "@/types/catalog";

/**
 * Find a variant combination price based on product ID and attributes
 */
export const findVariantCombinationPrice = async (
  productId: string,
  attributes: Record<string, string>
) => {
  try {
    console.log(`Finding variant price for product ${productId} with attributes:`, attributes);
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error("Error fetching variant prices:", error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log("No variant prices found for product:", productId);
      return null;
    }
    
    // Find a price combination that matches all selected attributes
    const matchingPrice = data.find(combination => {
      // Handle both string and object attributes
      const combinationAttrs = typeof combination.attributes === 'string'
        ? JSON.parse(combination.attributes)
        : combination.attributes;
      
      // Check if all selected attributes match this combination
      return Object.entries(attributes).every(([key, value]) => 
        combinationAttrs[key] !== undefined &&
        String(combinationAttrs[key]).toLowerCase() === String(value).toLowerCase()
      );
    });
    
    console.log("Matching price found:", matchingPrice);
    return matchingPrice || null;
  } catch (error) {
    console.error("Error finding variant combination price:", error);
    return null;
  }
};

// New functions for variant price management

/**
 * Update a product's variation attributes
 */
export const updateProductVariationAttributes = async (
  productId: string,
  attributes: ProductVariationAttributes
): Promise<boolean> => {
  try {
    console.log(`Updating variation attributes for product ${productId}:`, attributes);
    
    const { data, error } = await supabase
      .from('products')
      .update({ variation_attributes: attributes })
      .eq('id', productId);
    
    if (error) {
      console.error("Error updating product variation attributes:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error in updateProductVariationAttributes:", error);
    throw error;
  }
};

/**
 * Get all variant combination prices for a product
 */
export const getVariantCombinationPrices = async (productId: string): Promise<VariantCombinationPrice[]> => {
  try {
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error("Error fetching variant prices:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getVariantCombinationPrices:", error);
    throw error;
  }
};

/**
 * Create a new variant combination price
 */
export const createVariantCombinationPrice = async (variantPrice: {
  product_id: string;
  attributes: Record<string, string>;
  price: number;
  monthly_price?: number;
  stock?: number;
}): Promise<VariantCombinationPrice> => {
  try {
    const { data, error } = await supabase
      .from('product_variant_prices')
      .insert([variantPrice])
      .select()
      .single();
    
    if (error) {
      console.error("Error creating variant price:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in createVariantCombinationPrice:", error);
    throw error;
  }
};

/**
 * Delete a variant combination price
 */
export const deleteVariantCombinationPrice = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('product_variant_prices')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error("Error deleting variant price:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteVariantCombinationPrice:", error);
    throw error;
  }
};
