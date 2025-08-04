import { Product } from '@/types/catalog';
import { getProductPrice, ProductPriceData } from './productPricing';
import { getClientCustomVariantPrices } from '@/services/clientVariantPriceService';
import { getClientCustomVariants } from '@/services/clientCustomVariantService';

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
    // Check if the selected options correspond to a hidden variant
    if (selectedOptions) {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get client's hidden variants
      const { data: clientData } = await supabase
        .from('clients')
        .select('hidden_variants')
        .eq('id', clientId)
        .single();
      
      const hiddenVariants = clientData?.hidden_variants || [];
      
      if (hiddenVariants.length > 0) {
        // Get variant prices to check if selected options match a hidden variant
        const { data: variantPrices } = await supabase
          .from('product_variant_prices')
          .select('id, attributes')
          .eq('product_id', product.id)
          .in('id', hiddenVariants);
        
        console.log('🔍 Checking if selected options match hidden variants:', {
          selectedOptions,
          hiddenVariantsCount: variantPrices?.length || 0,
          variantPrices: variantPrices?.map(vp => ({ 
            id: vp.id, 
            attributes: vp.attributes 
          }))
        });

        // Check if selected options match any hidden variant
        const isHiddenVariant = variantPrices?.some(vp => {
          const attrs = typeof vp.attributes === 'string' 
            ? JSON.parse(vp.attributes) 
            : vp.attributes;
          
          console.log('🔍 Checking variant:', {
            variantId: vp.id,
            variantAttrs: attrs,
            selectedOptions
          });
          
          const optionEntries = Object.entries(selectedOptions);
          const matchResults = optionEntries.map(([key, val]) => {
            const directMatch = attrs[key] && 
              String(attrs[key]).toLowerCase().trim() === String(val).toLowerCase().trim();
            
            // Also check mapped attribute names
            const attributeMapping: Record<string, string> = {
              'storage': 'Capacité du disque dur',
              'stockage': 'Capacité du disque dur', 
              'memory': 'Mémoire vive (RAM)',
              'ram': 'Mémoire vive (RAM)',
              'processor': 'Processeur',
              'processeur': 'Processeur',
              'screen_size': 'Taille écran',
              'taille_ecran': 'Taille écran'
            };
            
            const mappedKey = attributeMapping[key] || attributeMapping[key.toLowerCase()];
            const mappedMatch = mappedKey && attrs[mappedKey] && 
              String(attrs[mappedKey]).toLowerCase().trim() === String(val).toLowerCase().trim();

            const finalMatch = directMatch || mappedMatch;
            
            console.log('🔍 Attribute comparison:', {
              key,
              val,
              directMatch,
              mappedKey,
              mappedMatch,
              finalMatch,
              variantValue: attrs[key] || attrs[mappedKey]
            });

            return finalMatch;
          });
          
          const allMatch = matchResults.every(result => result === true);
          const hasRequiredAttributes = optionEntries.length > 0;
          
          console.log('🔍 Variant match result:', {
            variantId: vp.id,
            matchResults,
            allMatch,
            hasRequiredAttributes,
            finalResult: allMatch && hasRequiredAttributes
          });

          return allMatch && hasRequiredAttributes;
        });
        
        if (isHiddenVariant) {
          console.log(`🔒 Selected options correspond to hidden variant, no pricing available`);
          // Return zero prices for hidden variants
          return {
            monthlyPrice: 0,
            purchasePrice: 0,
            hasCustomPricing: false,
            originalPrice: 0
          };
        }
      }
    }

    // First priority: Check client custom variants
    const customVariants = await getClientCustomVariants(clientId, product.id);
    
    if (customVariants && customVariants.length > 0) {
      // Find matching custom variant based on selected options
      const matchingCustomVariant = findMatchingCustomVariant(customVariants, selectedOptions);
      
      if (matchingCustomVariant) {
        // Use custom variant pricing
        result.monthlyPrice = matchingCustomVariant.custom_monthly_price || result.monthlyPrice;
        result.purchasePrice = matchingCustomVariant.custom_purchase_price || result.purchasePrice;
        result.hasCustomPricing = true;
        
        console.log(`Client custom variant pricing found for product ${product.name}:`, {
          customMonthly: matchingCustomVariant.custom_monthly_price,
          customPurchase: matchingCustomVariant.custom_purchase_price,
          originalMonthly: result.originalPrice,
          variantName: matchingCustomVariant.variant_name
        });
        
        return result;
      }
    }

    // Second priority: Try to get custom prices for this client and product
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
 * Find matching custom variant for selected options
 */
const findMatchingCustomVariant = (
  customVariants: any[],
  selectedOptions?: Record<string, string>
) => {
  if (!selectedOptions || !customVariants || customVariants.length === 0) {
    return customVariants?.[0] || null;
  }

  console.log('🔍 Finding matching custom variant:', {
    customVariantsCount: customVariants.length,
    selectedOptions
  });

  // Find custom variant that matches the selected options
  const matchingCustomVariant = customVariants.find(customVariant => {
    if (!customVariant.attributes) {
      console.log('❌ No attributes for custom variant:', customVariant.id);
      return false;
    }

    console.log('🔄 Comparing variant attributes:', {
      variantAttrs: customVariant.attributes,
      selectedOptions
    });

    // Check if all selected options match this custom variant's attributes
    const matches = Object.entries(selectedOptions).every(([key, value]) => {
      const variantValue = customVariant.attributes[key];
      const directMatch = variantValue && 
        String(variantValue).toLowerCase().trim() === String(value).toLowerCase().trim();

      console.log(`🔍 Checking ${key}=${value}:`, {
        directMatch,
        variantValue
      });

      return directMatch;
    });

    if (matches) {
      console.log('✅ Found matching custom variant:', {
        customVariantId: customVariant.id,
        variantName: customVariant.variant_name,
        monthlyPrice: customVariant.custom_monthly_price,
        purchasePrice: customVariant.custom_purchase_price
      });
    }

    return matches;
  });

  if (!matchingCustomVariant) {
    console.log('❌ No matching custom variant found for options:', selectedOptions);
  }

  return matchingCustomVariant || null;
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

  console.log('🔍 Finding matching custom price:', {
    customPricesCount: customPrices.length,
    selectedOptions,
    productId: product?.id
  });

  // Mapping between French and English attribute names (same as useClientProductDetails)
  const attributeMapping: Record<string, string> = {
    'storage': 'Capacité du disque dur',
    'stockage': 'Capacité du disque dur', 
    'memory': 'Mémoire vive (RAM)',
    'ram': 'Mémoire vive (RAM)',
    'processor': 'Processeur',
    'processeur': 'Processeur',
    'screen_size': 'Taille écran',
    'taille_ecran': 'Taille écran'
  };

  // Find custom price that matches the selected options
  const matchingCustomPrice = customPrices.find(customPrice => {
    if (!customPrice.variant_attributes) {
      console.log('❌ No variant_attributes for custom price:', customPrice.id);
      return false;
    }
    
    const variantAttrs = typeof customPrice.variant_attributes === 'string'
      ? JSON.parse(customPrice.variant_attributes)
      : customPrice.variant_attributes;

    console.log('🔄 Comparing variant attributes:', {
      variantAttrs,
      selectedOptions
    });

    // Check if all selected options match this custom price's variant attributes
    const matches = Object.entries(selectedOptions).every(([key, value]) => {
      // Direct match
      const directMatch = variantAttrs[key] && 
        String(variantAttrs[key]).toLowerCase().trim() === String(value).toLowerCase().trim();
      
      // Mapped attribute match (French/English)
      const mappedKey = attributeMapping[key] || attributeMapping[key.toLowerCase()];
      const mappedMatch = mappedKey && variantAttrs[mappedKey] && 
        String(variantAttrs[mappedKey]).toLowerCase().trim() === String(value).toLowerCase().trim();

      console.log(`🔍 Checking ${key}=${value}:`, {
        directMatch,
        mappedKey,
        mappedMatch,
        variantValue: variantAttrs[key] || variantAttrs[mappedKey]
      });

      return directMatch || mappedMatch;
    });

    if (matches) {
      console.log('✅ Found matching custom price:', {
        customPriceId: customPrice.id,
        monthlyPrice: customPrice.custom_monthly_price,
        purchasePrice: customPrice.custom_purchase_price
      });
    }

    return matches;
  });

  if (!matchingCustomPrice) {
    console.log('❌ No matching custom price found for options:', selectedOptions);
  }

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