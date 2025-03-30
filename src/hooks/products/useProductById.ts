
import { useState, useEffect } from 'react';
import { getProductById } from '@/services/catalogService';
import { Product } from '@/types/catalog';

interface UseProductByIdResult {
  product: Product | null;
  isLoading: boolean;
  error: Error | null;
}

export const useProductById = (productId: string | undefined): UseProductByIdResult => {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
        console.log('Product fetched:', productData);
        
        setProduct(productData);
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch product'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, isLoading, error };
};
