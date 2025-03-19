
import { getSupabaseClient } from "@/integrations/supabase/client";
import { VariantCombinationPrice, ProductAttributes } from "@/types/catalog";

// Fetch all variant combination prices for a parent product
export async function getVariantCombinationPrices(
  parentProductId: string
): Promise<VariantCombinationPrice[]> {
  try {
    console.log(`Fetching variant combination prices for product: ${parentProductId}`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', parentProductId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching variant prices for product ${parentProductId}:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getVariantCombinationPrices:", error);
    return [];
  }
}

// Create a new variant combination price
export async function createVariantCombinationPrice(
  combinationPrice: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>
): Promise<VariantCombinationPrice> {
  try {
    console.log(`Creating variant combination price for product: ${combinationPrice.product_id}`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .insert([combinationPrice])
      .select()
      .single();

    if (error) {
      console.error("Error creating variant combination price:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in createVariantCombinationPrice:", error);
    throw error;
  }
}

// Update a variant combination price
export async function updateVariantCombinationPrice(
  id: string,
  updates: Partial<VariantCombinationPrice>
): Promise<VariantCombinationPrice> {
  try {
    console.log(`Updating variant combination price: ${id}`);
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('product_variant_prices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating variant combination price ${id}:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateVariantCombinationPrice:", error);
    throw error;
  }
}

// Delete a variant combination price
export async function deleteVariantCombinationPrice(id: string): Promise<void> {
  try {
    console.log(`Deleting variant combination price: ${id}`);
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('product_variant_prices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting variant combination price ${id}:`, error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteVariantCombinationPrice:", error);
    throw error;
  }
}

// Find a variant combination price that matches the given attribute combination
export async function findVariantCombinationPrice(
  parentProductId: string, 
  attributes: ProductAttributes
): Promise<VariantCombinationPrice | null> {
  try {
    console.log(`Finding variant price for product ${parentProductId} with attributes:`, attributes);
    const supabase = getSupabaseClient();
    
    // Get all combination prices for this product
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', parentProductId);

    if (error) {
      console.error(`Error fetching variant prices for product ${parentProductId}:`, error);
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }
    
    // Convert all attribute keys to lowercase for case-insensitive comparison
    const normalizedAttributes: Record<string, string> = {};
    Object.entries(attributes).forEach(([key, value]) => {
      normalizedAttributes[key.toLowerCase()] = String(value).toLowerCase();
    });
    
    // Find a price configuration that matches all the selected attributes
    const matchingPrice = data.find(price => {
      if (!price.attributes) return false;
      
      const priceAttributes = typeof price.attributes === 'string' 
        ? JSON.parse(price.attributes) 
        : price.attributes;
      
      const normalizedPriceAttributes: Record<string, string> = {};
      Object.entries(priceAttributes).forEach(([key, value]) => {
        normalizedPriceAttributes[key.toLowerCase()] = String(value).toLowerCase();
      });
      
      // Check if all selected attributes match this price configuration
      return Object.entries(normalizedAttributes).every(([key, value]) => 
        normalizedPriceAttributes[key] === value
      );
    });
    
    return matchingPrice || null;
  } catch (error) {
    console.error("Error in findVariantCombinationPrice:", error);
    return null;
  }
}

// Export helper function to normalize attributes for comparison
export function normalizeAttributes(attributes: ProductAttributes): Record<string, string> {
  const normalized: Record<string, string> = {};
  Object.entries(attributes).forEach(([key, value]) => {
    normalized[key.toLowerCase()] = String(value).toLowerCase();
  });
  return normalized;
}
