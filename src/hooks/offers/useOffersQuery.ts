import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOffers } from '@/services/offers/getOffers';
import { updateOffer as updateOfferService } from '@/services/offers/offerDetail';
import { toast } from 'sonner';

const OFFERS_QUERY_KEY = ['offers'];

export const useOffersQuery = (includeConverted: boolean = false) => {
  return useQuery({
    queryKey: [...OFFERS_QUERY_KEY, includeConverted],
    queryFn: () => getOffers(includeConverted),
    staleTime: 30000, // 30 secondes
  });
};

export const useUpdateOfferMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => {
      console.log("🔄 Mutation called with:", { id, updates });
      return updateOfferService(id, updates);
    },
    onSuccess: (data, variables) => {
      console.log("✅ Mutation success:", data);
      queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
      toast.success('Offre mise à jour avec succès');
    },
    onError: (error: any, variables) => {
      console.error('❌ Mutation error:', error);
      console.error('❌ Variables:', variables);
      
      const errorMessage = error?.message || 'Erreur lors de la mise à jour';
      toast.error(errorMessage);
    }
  });
};
