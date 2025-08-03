import { Product } from '@/types/catalog';
import { getProductPrice, ProductPriceData } from './productPricing';
import { getClientCustomVariantPrices } from '@/services/clientVariantPriceService';

export interface ClientProductPriceData extends ProductPriceData {
  hasCustomPricing: boolean;
  originalPrice?: number;
}

/**
 * Get product pricing for a specific client, prioritizing custom variant prices
 */
export const getClientProductPrice = async (
  product: Product,
  clientId: string,
  selectedOptions?: Record<string, string>
): Promise<ClientProductPriceData> => {
  // First get the standard price as fallback
  const standardPriceData = getProductPrice(product, selectedOptions);
  
  let result: ClientProductPriceData = {
    ...standardPriceData,
    hasCustomPricing: false,
    originalPrice: standardPriceData.monthlyPrice
  };

  try {
    // Try to get custom prices for this client and product
    const customPrices = await getClientCustomVariantPrices(clientId, product.id);
    
    if (customPrices && customPrices.length > 0) {
      // Find matching custom price based on selected options
      const matchingCustomPrice = findMatchingCustomPrice(customPrices, selectedOptions, product);
      
      if (matchingCustomPrice) {
        // Use custom pricing
        result.monthlyPrice = matchingCustomPrice.custom_monthly_price || result.monthlyPrice;
        result.purchasePrice = matchingCustomPrice.custom_purchase_price || result.purchasePrice;
        result.hasCustomPricing = true;
        
        console.log(`Client custom pricing found for product ${product.name}:`, {
          customMonthly: matchingCustomPrice.custom_monthly_price,
          customPurchase: matchingCustomPrice.custom_purchase_price,
          originalMonthly: result.originalPrice
        });
      }
    }
  } catch (error) {
    console.warn('Error fetching client custom prices, using standard pricing:', error);
  }

  return result;
};

/**
 * Find matching custom price for selected variant options
 */
const findMatchingCustomPrice = (
  customPrices: any[],
  selectedOptions?: Record<string, string>,
  product?: Product
) => {
  if (!selectedOptions || !customPrices || customPrices.length === 0) {
    return customPrices?.[0] || null;
  }

  console.log('Finding matching custom price:', {
    customPrices,
    selectedOptions,
    productId: product?.id
  });

  // Find custom price that matches the selected options
  const matchingCustomPrice = customPrices.find(customPrice => {
    if (!customPrice.variant_attributes) return false;
    
    const variantAttrs = typeof customPrice.variant_attributes === 'string'
      ? JSON.parse(customPrice.variant_attributes)
      : customPrice.variant_attributes;

    console.log('Comparing variant attributes:', {
      variantAttrs,
      selectedOptions
    });

    // Check if all selected options match this custom price's variant attributes
    return Object.entries(selectedOptions).every(([key, value]) => 
      variantAttrs[key] && 
      String(variantAttrs[key]).toLowerCase() === String(value).toLowerCase()
    );
  });

  console.log('Matching custom price found:', matchingCustomPrice);
  return matchingCustomPrice || null;
};

/**
 * Get minimum monthly price for a client, considering custom prices
 */
export const getClientMinimumMonthlyPrice = async (
  product: Product,
  clientId: string
): Promise<number> => {
  try {
    const customPrices = await getClientCustomVariantPrices(clientId, product.id);
    
    if (customPrices && customPrices.length > 0) {
      // Get all custom monthly prices
      const customMonthlyPrices = customPrices
        .map(cp => cp.custom_monthly_price)
        .filter((price): price is number => typeof price === 'number' && price > 0);
      
      if (customMonthlyPrices.length > 0) {
        return Math.min(...customMonthlyPrices);
      }
    }
  } catch (error) {
    console.warn('Error fetching client custom prices for minimum calculation:', error);
  }

  // Fallback to standard minimum price logic
  const { getMinimumMonthlyPrice } = await import('./productPricing');
  return getMinimumMonthlyPrice(product);
};