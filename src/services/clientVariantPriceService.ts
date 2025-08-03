import { supabase } from "@/integrations/supabase/client";

/**
 * Get client custom variant prices for a product
 */
export const getClientCustomVariantPrices = async (clientId: string, productId: string) => {
  try {
    const { data, error } = await supabase
      .from('client_custom_variant_prices')
      .select('*')
      .eq('client_id', clientId)
      .eq('product_id', productId);
    
    if (error) {
      console.error('Error fetching client custom variant prices:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getClientCustomVariantPrices:', error);
    throw error;
  }
};

/**
 * Add or update a client custom variant price
 */
export const upsertClientCustomVariantPrice = async (variantPrice: {
  client_id: string;
  product_id: string;
  variant_price_id: string;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('client_custom_variant_prices')
      .upsert([variantPrice], {
        onConflict: 'client_id,variant_price_id'
      })
      .select();
    
    if (error) {
      console.error('Error upserting client custom variant price:', error);
      throw new Error(error.message);
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in upsertClientCustomVariantPrice:', error);
    throw error;
  }
};

/**
 * Delete a client custom variant price
 */
export const deleteClientCustomVariantPrice = async (clientId: string, variantPriceId: string) => {
  try {
    const { error } = await supabase
      .from('client_custom_variant_prices')
      .delete()
      .eq('client_id', clientId)
      .eq('variant_price_id', variantPriceId);
    
    if (error) {
      console.error('Error deleting client custom variant price:', error);
      throw new Error(error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteClientCustomVariantPrice:', error);
    throw error;
  }
};