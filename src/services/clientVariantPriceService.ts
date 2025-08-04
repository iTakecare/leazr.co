import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";

/**
 * Get client custom variant prices for a product
 */
export const getClientCustomVariantPrices = async (clientId: string, productId: string) => {
  try {
    console.log(`🎯 getClientCustomVariantPrices - START: client=${clientId}, product=${productId}`);
    
    // First, let's check if this client has any custom prices at all
    const { data: allClientPrices, error: clientError } = await supabase
      .from('client_custom_variant_prices')
      .select('*')
      .eq('client_id', clientId);
    
    console.log(`🎯 All custom prices for client ${clientId}:`, allClientPrices);
    
    if (clientError) {
      console.error('❌ Error checking client prices:', clientError);
    }
    
    // Now check variant prices for this product
    const { data: productVariants, error: variantError } = await supabase
      .from('product_variant_prices')
      .select('*')
      .eq('product_id', productId);
      
    console.log(`🎯 Product variant prices for product ${productId}:`, productVariants);
    
    if (variantError) {
      console.error('❌ Error checking product variants:', variantError);
    }
    
    // Get custom prices with variant attributes in a single query
    const { data, error } = await supabase
      .from('client_custom_variant_prices')
      .select(`
        *,
        product_variant_prices!inner(
          id,
          attributes,
          price,
          monthly_price,
          product_id
        )
      `)
      .eq('client_id', clientId)
      .eq('product_variant_prices.product_id', productId);
    
    if (error) {
      console.error('❌ Error fetching client custom variant prices:', error);
      throw new Error(error.message);
    }
    
    console.log(`🎯 Raw client custom variant prices from DB (${data?.length || 0} items):`, data);
    
    // Transform data to include variant attributes directly
    const enrichedData = (data || []).map(customPrice => ({
      ...customPrice,
      variant_attributes: customPrice.product_variant_prices?.attributes,
      standard_price: customPrice.product_variant_prices?.price,
      standard_monthly_price: customPrice.product_variant_prices?.monthly_price
    }));
    
    console.log(`🎯 Enriched client custom variant prices (${enrichedData.length} items):`, enrichedData);
    return enrichedData;
  } catch (error) {
    console.error('❌ Error in getClientCustomVariantPrices:', error);
    throw error;
  }
};

/**
 * Add or update a client custom variant price
 */
export const upsertClientCustomVariantPrice = async (variantPrice: {
  client_id: string;
  variant_price_id: string;
  custom_purchase_price?: number;
  custom_monthly_price?: number;
  margin_rate?: number;
  notes?: string;
}) => {
  try {
    // Get the company_id for the current user
    const companyId = await getCurrentUserCompanyId();
    
    // Add company_id to the variant price data
    const variantPriceWithCompany = {
      ...variantPrice,
      company_id: companyId
    };
    
    const { data, error } = await supabase
      .from('client_custom_variant_prices')
      .upsert([variantPriceWithCompany], {
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