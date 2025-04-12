
import { supabase } from "@/integrations/supabase/client";
import { ProductAttributes } from "@/types/catalog";

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
