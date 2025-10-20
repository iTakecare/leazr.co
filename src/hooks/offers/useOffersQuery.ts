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
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      updateOfferService(id, updates),
    onSuccess: () => {
      // Invalider le cache des offres pour forcer un refresh
      queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de l\'offre');
    }
  });
};
