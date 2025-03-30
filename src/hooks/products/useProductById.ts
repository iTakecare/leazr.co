
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
        
        // Ensure the monthly price is a valid number
        if (productData) {
          if (productData.monthly_price !== undefined) {
            const originalPrice = productData.monthly_price;
            productData.monthly_price = typeof productData.monthly_price === 'number' ? 
                                      productData.monthly_price : 
                                      parseFloat(String(productData.monthly_price) || '0');
            
            // If parseFloat returned NaN, set it to 0
            if (isNaN(productData.monthly_price)) {
              console.warn(`Invalid monthly_price converted to 0: ${originalPrice}`);
              productData.monthly_price = 0;
            }
          } else {
            console.warn(`Product ${productData.id} (${productData.name}) has no monthly_price`);
            productData.monthly_price = 0;
          }
          
          // Also ensure valid prices for variants
          if (productData.variants && productData.variants.length > 0) {
            productData.variants = productData.variants.map(variant => {
              const originalPrice = variant.monthly_price;
              const parsedPrice = typeof variant.monthly_price === 'number' ? 
                             variant.monthly_price : 
                             parseFloat(String(variant.monthly_price) || '0');
                             
              return {
                ...variant,
                monthly_price: isNaN(parsedPrice) ? 0 : parsedPrice
              };
            });
          }
          
          // And for variant combination prices
          if (productData.variant_combination_prices && productData.variant_combination_prices.length > 0) {
            productData.variant_combination_prices = productData.variant_combination_prices.map(combo => {
              const originalPrice = combo.monthly_price;
              const parsedPrice = typeof combo.monthly_price === 'number' ? 
                             combo.monthly_price : 
                             parseFloat(String(combo.monthly_price) || '0');
                             
              return {
                ...combo,
                monthly_price: isNaN(parsedPrice) ? 0 : parsedPrice
              };
            });
          }
        }
        
        setProduct(productData);
        console.log('Product loaded with validated price:', {
          id: productData?.id,
          name: productData?.name,
          originalPrice: productData?.monthly_price,
          parsedPrice: typeof productData?.monthly_price === 'number' ? 
                      productData?.monthly_price : 
                      parseFloat(String(productData?.monthly_price) || '0')
        });
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
