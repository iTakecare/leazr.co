
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProduct } from '@/services/catalogService';
import { Product } from '@/types/catalog';
import { toast } from 'sonner';

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Product> }) => {
      console.log('useUpdateProduct - Updating product:', data.id, data.updates);
      
      // Ensure both image_url and image_urls are synchronized
      const updates = { ...data.updates };
      
      // If image_urls is being updated, ensure image_url is the first one
      if (updates.image_urls && Array.isArray(updates.image_urls) && updates.image_urls.length > 0) {
        if (!updates.image_url) {
          updates.image_url = updates.image_urls[0];
        }
      }
      
      // If image_url is being updated but image_urls is not, create image_urls array
      if (updates.image_url && !updates.image_urls) {
        updates.image_urls = [updates.image_url];
      }
      
      const result = await updateProduct(data.id, updates);
      console.log('useUpdateProduct - Update result:', result);
      return result;
    },
    onSuccess: (data, variables) => {
      console.log('useUpdateProduct - Success:', data);
      
      // Invalidate and refetch product queries
      queryClient.invalidateQueries({ queryKey: ['product', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Update the specific product in cache
      queryClient.setQueryData(['product', variables.id], (oldData: Product | undefined) => {
        if (oldData) {
          return {
            ...oldData,
            ...variables.updates,
            updated_at: new Date().toISOString()
          };
        }
        return oldData;
      });
      
      toast.success('Produit mis à jour avec succès');
    },
    onError: (error: any) => {
      console.error('useUpdateProduct - Error:', error);
      toast.error('Erreur lors de la mise à jour du produit');
    }
  });
};
