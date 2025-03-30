
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
        const productData = await getProductById(productId);
        setProduct(productData);
        console.log('Product loaded:', productData);
      } catch (err) {
        console.error('Error fetching product by ID:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch product'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  return { product, isLoading, error };
};
