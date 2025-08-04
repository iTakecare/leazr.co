import { supabase } from "@/integrations/supabase/client";
import { getCurrentUserCompanyId } from "@/services/multiTenantService";

/**
 * Get client custom variant prices for a product
 */
export const getClientCustomVariantPrices = async (clientId: string, productId: string) => {
  try {
    console.log(`🎯 getClientCustomVariantPrices - START: client=${clientId}, product=${productId}`);
    
    // Get client's hidden variants first
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('hidden_variants')
      .eq('id', clientId)
      .single();
    
    if (clientError) {
      console.error('❌ Error fetching client hidden variants:', clientError);
    }
    
    const hiddenVariants = clientData?.hidden_variants || [];
    console.log(`🔒 Hidden variants for client ${clientId}:`, hiddenVariants);
    
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
    
    // Transform data and filter out hidden variants
    const enrichedData = (data || [])
      .filter(customPrice => {
        const variantPriceId = customPrice.product_variant_prices?.id;
        const isHidden = hiddenVariants.includes(variantPriceId);
        if (isHidden) {
          console.log(`🔒 Filtering out hidden variant: ${variantPriceId}`);
        }
        return !isHidden;
      })
      .map(customPrice => ({
        ...customPrice,
        variant_attributes: customPrice.product_variant_prices?.attributes,
        standard_price: customPrice.product_variant_prices?.price,
        standard_monthly_price: customPrice.product_variant_prices?.monthly_price
      }));
    
    console.log(`🎯 Enriched client custom variant prices after filtering (${enrichedData.length} items):`, enrichedData);
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

/**
 * Hide a standard variant from client catalog
 */
export const hideVariantFromClient = async (clientId: string, variantPriceId: string) => {
  try {
    // Get current hidden variants
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('hidden_variants')
      .eq('id', clientId)
      .single();

    if (fetchError) {
      console.error('Error fetching client hidden variants:', fetchError);
      throw new Error(fetchError.message);
    }

    // Add variant to hidden list if not already hidden
    const currentHidden = client.hidden_variants || [];
    if (!currentHidden.includes(variantPriceId)) {
      const updatedHidden = [...currentHidden, variantPriceId];
      
      const { error: updateError } = await supabase
        .from('clients')
        .update({ hidden_variants: updatedHidden })
        .eq('id', clientId);

      if (updateError) {
        console.error('Error hiding variant:', updateError);
        throw new Error(updateError.message);
      }
    }

    return true;
  } catch (error) {
    console.error('Error in hideVariantFromClient:', error);
    throw error;
  }
};

/**
 * Show a hidden variant in client catalog
 */
export const showVariantForClient = async (clientId: string, variantPriceId: string) => {
  try {
    // Get current hidden variants
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('hidden_variants')
      .eq('id', clientId)
      .single();

    if (fetchError) {
      console.error('Error fetching client hidden variants:', fetchError);
      throw new Error(fetchError.message);
    }

    // Remove variant from hidden list
    const currentHidden = client.hidden_variants || [];
    const updatedHidden = currentHidden.filter(id => id !== variantPriceId);
    
    const { error: updateError } = await supabase
      .from('clients')
      .update({ hidden_variants: updatedHidden })
      .eq('id', clientId);

    if (updateError) {
      console.error('Error showing variant:', updateError);
      throw new Error(updateError.message);
    }

    return true;
  } catch (error) {
    console.error('Error in showVariantForClient:', error);
    throw error;
  }
};

/**
 * Get hidden variants for a client
 */
export const getClientHiddenVariants = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('hidden_variants')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client hidden variants:', error);
      throw new Error(error.message);
    }

    return data.hidden_variants || [];
  } catch (error) {
    console.error('Error in getClientHiddenVariants:', error);
    throw error;
  }
};