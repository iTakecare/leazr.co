import { Product } from '@/types/catalog';

export interface ProductPriceData {
  monthlyPrice: number;
  purchasePrice: number;
  minMonthlyPrice?: number;
}

/**
 * Centralized function to get product pricing information
 * Handles variants, combinations, and fallbacks consistently
 */
export const getProductPrice = (
  product: Product, 
  selectedOptions?: Record<string, string>
): ProductPriceData => {
  let monthlyPrice = 0;
  let purchasePrice = 0;

  // Safety check for product
  if (!product) {
    console.warn('getProductPrice: Product is null or undefined');
    return { monthlyPrice: 0, purchasePrice: 0 };
  }

  console.log(`getProductPrice: Processing ${product.name}`, {
    selectedOptions,
    hasVariantCombinationPrices: !!(product.variant_combination_prices && product.variant_combination_prices.length > 0),
    productType: product.specifications?.type || 'product'
  });

  // Special handling for packs
  if (product.specifications?.type === 'pack') {
    monthlyPrice = product.currentPrice || product.monthly_price || product.price || 0;
    purchasePrice = product.currentPrice || product.price || product.monthly_price || 0;
    
    console.log(`getProductPrice: Pack pricing - Monthly: ${monthlyPrice}, Purchase: ${purchasePrice}`);
    return {
      monthlyPrice: typeof monthlyPrice === 'number' ? monthlyPrice : 0,
      purchasePrice: typeof purchasePrice === 'number' ? purchasePrice : 0
    };
  }

  // 1. Try to get price from variant combination prices (highest priority)
  if (product.variant_combination_prices && product.variant_combination_prices.length > 0 && selectedOptions) {
    console.log(`getProductPrice: Found ${product.variant_combination_prices.length} variant combinations`);
    
    const matchingCombo = product.variant_combination_prices.find(combo => {
      if (!combo.attributes) return false;
      return Object.entries(selectedOptions).every(([key, value]) => 
        combo.attributes[key] === value
      );
    });

    console.log(`getProductPrice: Matching combo found:`, matchingCombo);

    if (matchingCombo) {
      if (matchingCombo.monthly_price && matchingCombo.monthly_price > 0) {
        const parsed = typeof matchingCombo.monthly_price === 'number' ? 
                      matchingCombo.monthly_price : 
                      parseFloat(String(matchingCombo.monthly_price) || '0');
        if (!isNaN(parsed)) monthlyPrice = parsed;
      }
      
      // Le champ pour le prix d'achat s'appelle 'price' dans product_variant_prices
      if (matchingCombo.price && matchingCombo.price > 0) {
        const parsed = typeof matchingCombo.price === 'number' ? 
                      matchingCombo.price : 
                      parseFloat(String(matchingCombo.price) || '0');
        if (!isNaN(parsed)) purchasePrice = parsed;
      }
      
      console.log(`getProductPrice: From variant combo - Monthly: ${monthlyPrice}, Purchase: ${purchasePrice}`);
    }
  }

  // 2. Try to get price from variants array if available
  if (monthlyPrice <= 0 && product.variants && product.variants.length > 0 && selectedOptions) {
    const matchingVariant = product.variants.find(variant => {
      if (!variant.selected_attributes) return false;
      return Object.entries(selectedOptions).every(([key, value]) => 
        variant.selected_attributes?.[key] === value
      );
    });
    
    if (matchingVariant && matchingVariant.monthly_price) {
      const parsed = typeof matchingVariant.monthly_price === 'number' ? 
                    matchingVariant.monthly_price : 
                    parseFloat(String(matchingVariant.monthly_price) || '0');
      if (!isNaN(parsed)) monthlyPrice = parsed;
    }
  }

  // 3. Fallback to currentPrice from product details hook
  if (monthlyPrice <= 0 && product.currentPrice && product.currentPrice > 0) {
    monthlyPrice = product.currentPrice;
  }

  // 4. Fallback to base product monthly_price
  if (monthlyPrice <= 0 && product.monthly_price) {
    const parsed = typeof product.monthly_price === 'number' ? 
                  product.monthly_price : 
                  parseFloat(String(product.monthly_price) || '0');
    if (!isNaN(parsed)) monthlyPrice = parsed;
  }

  // 5. Purchase price fallbacks
  if (purchasePrice <= 0) {
    if (product.currentPrice && product.currentPrice > 0) {
      purchasePrice = product.currentPrice;
    } else if (product.price) {
      const parsed = typeof product.price === 'number' ? 
                    product.price : 
                    parseFloat(String(product.price) || '0');
      if (!isNaN(parsed)) purchasePrice = parsed;
    }
  }

  // Ensure valid numbers with final fallback
  if (isNaN(monthlyPrice) || monthlyPrice <= 0) {
    console.warn(`getProductPrice: Invalid monthly price for ${product.name}, falling back to 0`);
    monthlyPrice = 0;
  }
  if (isNaN(purchasePrice) || purchasePrice <= 0) {
    console.warn(`getProductPrice: Invalid purchase price for ${product.name}, falling back to monthly price or 0`);
    purchasePrice = monthlyPrice > 0 ? monthlyPrice : 0;
  }

  return {
    monthlyPrice,
    purchasePrice
  };
};

/**
 * Get minimum monthly price for products with variants
 */
export const getMinimumMonthlyPrice = (product: Product): number => {
  let minPrice = 0;

  // Check variant combination prices first
  if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
    const prices = product.variant_combination_prices
      .map(combo => {
        const price = combo.monthly_price || 0;
        return typeof price === 'number' ? price : parseFloat(String(price) || '0');
      })
      .filter(price => price > 0);
    
    if (prices.length > 0) {
      minPrice = Math.min(...prices);
    }
  }

  // Check variants if no combination prices
  if (minPrice <= 0 && product.variants && product.variants.length > 0) {
    const prices = product.variants
      .map(variant => {
        const price = variant.monthly_price || 0;
        return typeof price === 'number' ? price : parseFloat(String(price) || '0');
      })
      .filter(price => price > 0);
    
    if (prices.length > 0) {
      minPrice = Math.min(...prices);
    }
  }

  // Fallback to base product price
  if (minPrice <= 0 && product.monthly_price) {
    minPrice = typeof product.monthly_price === 'number' ? 
               product.monthly_price : 
               parseFloat(String(product.monthly_price) || '0');
  }

  return isNaN(minPrice) || minPrice < 0 ? 0 : minPrice;
};

/**
 * Check if a product has variants with different prices
 */
export const hasVariantPricing = (product: Product): boolean => {
  return !!(
    (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
    (product.variants && product.variants.length > 0) ||
    product.is_parent
  );
};