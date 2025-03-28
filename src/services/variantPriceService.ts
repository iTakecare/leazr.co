
import { ProductVariationAttributes } from "@/types/catalog";

/**
 * Updates the variation attributes of a product
 */
export const updateProductVariationAttributes = async (
  productId: string, 
  attributes: ProductVariationAttributes
): Promise<void> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase
      .from('products')
      .update({ variation_attributes: attributes })
      .eq('id', productId);
    
    if (error) {
      console.error('Error updating product variation attributes:', error);
      throw new Error(error.message);
    }
  } catch (error) {
    console.error('Error in updateProductVariationAttributes:', error);
    throw error;
  }
};

/**
 * Get variant combination prices for a product
 */
export const getProductVariantPrices = async (productId: string) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error('Error fetching product variant prices:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getProductVariantPrices:', error);
    throw error;
  }
};

/**
 * Add a new variant price combination
 */
export const addVariantPrice = async (variantPrice: {
  product_id: string;
  attributes: Record<string, string>;
  price: number;
  monthly_price?: number;
  stock?: number;
}) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .insert(variantPrice)
      .select()
      .single();
    
    if (error) {
      console.error('Error adding variant price:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error in addVariantPrice:', error);
    throw error;
  }
};

/**
 * Update an existing variant price combination
 */
export const updateVariantPrice = async (
  id: string,
  updates: {
    price?: number;
    monthly_price?: number;
    stock?: number;
  }
) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating variant price:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateVariantPrice:', error);
    throw error;
  }
};

/**
 * Delete a variant price combination
 */
export const deleteVariantPrice = async (id: string) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase
      .from('product_variant_prices')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting variant price:', error);
      throw new Error(error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteVariantPrice:', error);
    throw error;
  }
};

/**
 * Get variant combination prices for a product
 * Alias for getProductVariantPrices to match function name in component
 */
export const getVariantCombinationPrices = getProductVariantPrices;

/**
 * Add a new variant price combination
 * Alias for addVariantPrice to match function name in component
 */
export const createVariantCombinationPrice = addVariantPrice;

/**
 * Delete a variant price combination
 * Alias for deleteVariantPrice to match function name in component
 */
export const deleteVariantCombinationPrice = deleteVariantPrice;

/**
 * Find a specific variant price combination by attributes
 */
export const findVariantCombinationPrice = async (
  productId: string,
  attributes: Record<string, string>
) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error('Error finding variant price:', error);
      throw new Error(error.message);
    }
    
    // Find the matching price variant
    const matchingVariant = data?.find(variant => {
      if (!variant.attributes) return false;
      
      // Check if all selected attributes match this variant
      return Object.entries(attributes).every(([key, value]) => 
        variant.attributes[key] !== undefined && 
        String(variant.attributes[key]).toLowerCase() === String(value).toLowerCase()
      );
    });
    
    return matchingVariant || null;
  } catch (error) {
    console.error('Error in findVariantCombinationPrice:', error);
    throw error;
  }
};

/**
 * Update a parent product to remove its price
 * This is useful when converting a regular product to a parent product with variants
 */
export const updateParentProductRemovePrice = async (productId: string) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase
      .from('products')
      .update({ 
        price: 0,
        monthly_price: 0
      })
      .eq('id', productId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating parent product price:', error);
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateParentProductRemovePrice:', error);
    throw error;
  }
};
