
import { useQuery } from '@tanstack/react-query';
import { getProductById } from '@/services/catalogService';
import { Product } from '@/types/catalog';

export const useProductById = (productId: string | undefined) => {
  const {
    data: product,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProductById(productId || ''),
    enabled: !!productId,
    retry: 1,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  return {
    product: product as Product | undefined,
    isLoading,
    error,
    refetch
  };
};
