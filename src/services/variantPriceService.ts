
import { supabase } from "@/integrations/supabase/client";
import { 
  ProductAttributes, 
  ProductVariationAttributes,
  VariantCombinationPrice 
} from "@/types/catalog";

/**
 * Récupère toutes les combinaisons de prix pour un produit donné
 */
export const getVariantCombinationPrices = async (productId: string): Promise<VariantCombinationPrice[]> => {
  try {
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching variant combination prices:", error);
    throw error;
  }
};

/**
 * Crée une nouvelle combinaison de prix pour un produit
 */
export const createVariantCombinationPrice = async (
  data: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>
): Promise<VariantCombinationPrice> => {
  try {
    const { data: newPrice, error } = await supabase
      .from('product_variant_prices')
      .insert([data])
      .select()
      .single();
    
    if (error) throw error;
    
    return newPrice;
  } catch (error) {
    console.error("Error creating variant combination price:", error);
    throw error;
  }
};

/**
 * Supprime une combinaison de prix
 */
export const deleteVariantCombinationPrice = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('product_variant_prices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting variant combination price:", error);
    throw error;
  }
};

/**
 * Trouve une combinaison de prix basée sur les attributs sélectionnés
 */
export const findVariantCombinationPrice = async (
  productId: string,
  attributes: ProductAttributes
): Promise<VariantCombinationPrice | null> => {
  try {
    // Récupérer toutes les combinaisons de prix pour ce produit
    const { data, error } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
    
    if (error) throw error;
    
    if (!data || data.length === 0) return null;
    
    // Trouver la combinaison qui correspond exactement aux attributs
    const foundPrice = data.find(price => {
      const priceAttrs = price.attributes;
      return Object.keys(attributes).every(
        key => String(priceAttrs[key]).toLowerCase() === String(attributes[key]).toLowerCase()
      );
    });
    
    return foundPrice || null;
  } catch (error) {
    console.error("Error finding variant combination price:", error);
    throw error;
  }
};

/**
 * Met à jour les attributs de variation d'un produit
 */
export const updateProductVariationAttributes = async (
  productId: string,
  attributes: ProductVariationAttributes
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({
        variation_attributes: attributes
      })
      .eq('id', productId);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error updating product variation attributes:", error);
    throw error;
  }
};
