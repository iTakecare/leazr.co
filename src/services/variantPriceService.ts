
import { supabase } from "@/integrations/supabase/client";
import { ProductVariationAttributes, VariantCombinationPrice, ProductAttributes } from "@/types/catalog";

export async function updateProductVariationAttributes(
  productId: string, 
  attributes: ProductVariationAttributes
): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ variation_attributes: attributes })
      .eq('id', productId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product variation attributes:', error);
    throw error;
  }
}

export async function createVariantCombinationPrice(
  combinationData: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>
): Promise<VariantCombinationPrice> {
  try {
    const { data, error } = await supabase
      .from('variant_combination_prices')
      .insert(combinationData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating variant combination price:', error);
    throw error;
  }
}

export async function getVariantCombinationPrices(
  productId: string
): Promise<VariantCombinationPrice[]> {
  try {
    const { data, error } = await supabase
      .from('variant_combination_prices')
      .select('*')
      .eq('product_id', productId)
      .order('id');
    
    if (error) throw error;
    
    return data.map(item => ({
      ...item,
      stock: item.stock !== null ? item.stock : undefined
    }));
  } catch (error) {
    console.error('Error fetching variant combination prices:', error);
    throw error;
  }
}

// Adding alias for findVariantCombinationPrice to maintain compatibility
export const findVariantCombinationPrice = getVariantCombinationPrices;

export async function deleteVariantCombinationPrice(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('variant_combination_prices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting variant combination price:', error);
    throw error;
  }
}

// Adding the missing function for updateParentProductRemovePrice
export async function updateParentProductRemovePrice(productId: string): Promise<void> {
  try {
    // Implementation depends on what this function is supposed to do.
    // This is a placeholder implementation based on the name
    const { error } = await supabase
      .from('products')
      .update({ has_variant_prices: false })
      .eq('id', productId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating parent product prices:', error);
    throw error;
  }
}
