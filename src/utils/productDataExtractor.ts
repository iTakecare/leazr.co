
/**
 * Utility to extract attributes and specifications from a product
 */
export const extractProductData = (product: any) => {
  const attributes: Record<string, string> = {};
  const specifications: Record<string, string | number> = {};
  
  // Extract attributes from product
  if (product.attributes && typeof product.attributes === 'object') {
    // Copy all attributes
    Object.entries(product.attributes).forEach(([key, value]) => {
      attributes[key] = String(value);
    });
  }
  
  // Extract specifications from product
  if (product.specifications && typeof product.specifications === 'object') {
    // Copy all specifications
    Object.entries(product.specifications).forEach(([key, value]) => {
      specifications[key] = value as string | number;
    });
  }
  
  // For variant products, check for selected variant data
  if (product.selected_variant_id && product.variant_combination_prices) {
    const selectedVariant = product.variant_combination_prices.find(
      (variant: any) => variant.id === product.selected_variant_id
    );
    
    if (selectedVariant && selectedVariant.attributes) {
      // Add variant-specific attributes
      Object.entries(selectedVariant.attributes).forEach(([key, value]) => {
        attributes[key] = String(value);
      });
    }
  }
  
  return { attributes, specifications };
};
