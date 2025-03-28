import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Product, ProductVariationAttributes } from '@/types/catalog';
import { getProductById, getProducts } from '@/services/catalogService';

export function useProductDetails(productId: string | null) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [variationAttributes, setVariationAttributes] = useState<ProductVariationAttributes>({});
  const [hasVariants, setHasVariants] = useState(false);

  // Fetch product data
  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productId ? getProductById(productId) : null,
    enabled: !!productId,
  });

  useEffect(() => {
    if (isLoading) {
      setLoading(true);
      return;
    }

    if (isError) {
      setLoading(false);
      setError('Failed to fetch product data');
      return;
    }

    if (!data) {
      setLoading(false);
      setError('Product not found');
      return;
    }

    setProduct(data);
    setLoading(false);
    setError(null);

    // Check if product has variants
    const hasVariationAttrs = data.variation_attributes && 
      Object.keys(data.variation_attributes).length > 0;
    
    const hasVariantPrices = Array.isArray(data.variant_combination_prices) && 
      data.variant_combination_prices.length > 0;
    
    setHasVariants(hasVariationAttrs || hasVariantPrices);

    // Extract variation attributes from variant combination prices if not directly provided
    const extractedAttributes: ProductVariationAttributes = {};
    
    // Ensure variant_combination_prices is an array before processing
    const variantPrices = Array.isArray(data.variant_combination_prices) 
      ? data.variant_combination_prices 
      : [];
      
    variantPrices.forEach(price => {
      if (price.attributes) {
        Object.entries(price.attributes).forEach(([key, value]) => {
          if (!extractedAttributes[key]) {
            extractedAttributes[key] = [];
          }
          
          // Convert value to string to ensure consistent handling
          const stringValue = String(value);
          
          // Check if this value is already in the array
          if (!extractedAttributes[key].includes(stringValue)) {
            extractedAttributes[key].push(stringValue);
          }
        });
      }
    });

    // If the product already has defined variation_attributes, use those
    if (data.variation_attributes && Object.keys(data.variation_attributes).length > 0) {
      setVariationAttributes(data.variation_attributes);
    } 
    // Otherwise use the extracted ones
    else if (Object.keys(extractedAttributes).length > 0) {
      setVariationAttributes(extractedAttributes);
    }
  }, [data, isLoading, isError]);

  return {
    product,
    loading,
    error,
    variationAttributes,
    hasVariants,
  };
}

export function useProductsList() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  return {
    products: data || [],
    loading: isLoading,
    error: isError ? error || 'Failed to fetch products' : null,
  };
}
