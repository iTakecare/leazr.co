import { useState } from 'react';
import { updateOffer as updateOfferService } from '@/services/offers/offerDetail';

export const useOfferUpdate = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateOffer = async (offerId: string, updates: any) => {
    setIsUpdating(true);
    try {
      const result = await updateOfferService(offerId, updates);
      
      if (result.error) {
        throw new Error(result.error.message || 'Erreur lors de la mise à jour');
      }
      
      return result.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'offre:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateOffer,
    isUpdating
  };
};