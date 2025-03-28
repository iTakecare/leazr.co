
import { ProductVariationAttributes } from "@/types/catalog";

/**
 * Updates the variation attributes of a product
 */
export const updateProductVariationAttributes = async (
  productId: string, 
  attributes: ProductVariationAttributes
): Promise<void> => {
  try {
    const { supabase } = await import('@/lib/supabase');
    
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
    const { supabase } = await import('@/lib/supabase');
    
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
    const { supabase } = await import('@/lib/supabase');
    
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
    const { supabase } = await import('@/lib/supabase');
    
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
    const { supabase } = await import('@/lib/supabase');
    
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
