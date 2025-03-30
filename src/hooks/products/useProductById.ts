
import { useEffect, useState } from 'react';
import { getProductById } from '@/services/catalogService';
import { Product } from '@/types/catalog';

export const useProductById = (productId: string | undefined) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const productData = await getProductById(productId);
        
        // Ensure the product data is properly formatted
        if (productData) {
          // Convert monthly_price to number and validate it
          const originalPrice = productData.monthly_price;
          let parsedPrice: number;
          
          if (typeof originalPrice === 'number') {
            parsedPrice = originalPrice;
          } else if (typeof originalPrice === 'string') {
            parsedPrice = parseFloat(originalPrice);
          } else {
            parsedPrice = 0;
          }
          
          // If price is invalid, set to 0 but warn in console
          if (isNaN(parsedPrice)) {
            console.warn(`Invalid monthly_price converted to 0: ${originalPrice}`);
            parsedPrice = 0;
          }
          
          // Update the product with validated price
          productData.monthly_price = parsedPrice;
          
          console.log('Product loaded in useProductById with price:', {
            id: productData?.id,
            name: productData?.name,
            originalPrice,
            parsedPrice
          });
          
          // Also ensure valid prices for variants
          if (productData.variants && productData.variants.length > 0) {
            productData.variants = productData.variants.map(variant => {
              const variantOriginalPrice = variant.monthly_price;
              let variantParsedPrice: number;
              
              if (typeof variantOriginalPrice === 'number') {
                variantParsedPrice = variantOriginalPrice;
              } else if (typeof variantOriginalPrice === 'string') {
                variantParsedPrice = parseFloat(variantOriginalPrice);
              } else {
                variantParsedPrice = 0;
              }
              
              if (isNaN(variantParsedPrice)) {
                variantParsedPrice = 0;
              }
              
              return {
                ...variant,
                monthly_price: variantParsedPrice
              };
            });
          }
          
          // And for variant combination prices
          if (productData.variant_combination_prices && productData.variant_combination_prices.length > 0) {
            productData.variant_combination_prices = productData.variant_combination_prices.map(combo => {
              const comboOriginalPrice = combo.monthly_price;
              let comboParsedPrice: number;
              
              if (typeof comboOriginalPrice === 'number') {
                comboParsedPrice = comboOriginalPrice;
              } else if (typeof comboOriginalPrice === 'string') {
                comboParsedPrice = parseFloat(comboOriginalPrice);
              } else {
                comboParsedPrice = 0;
              }
              
              if (isNaN(comboParsedPrice)) {
                comboParsedPrice = 0;
              }
              
              return {
                ...combo,
                monthly_price: comboParsedPrice
              };
            });
          }
        }
        
        setProduct(productData);
      } catch (err) {
        console.error('Error fetching product by ID:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch product'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Function to update product data locally after changes
  const updateLocalProduct = (updatedData: Partial<Product>) => {
    if (product) {
      setProduct({
        ...product,
        ...updatedData
      });
    }
  };

  return { product, isLoading, error, updateLocalProduct };
};
