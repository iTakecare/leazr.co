
import { useState, useEffect } from 'react';
import { OfferData } from '@/services/offers/types';
import { getOfferForClient } from '@/services/offers/offerSignature';

export const useLoadClientOffer = (offerId: string, clientEmail?: string) => {
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOffer = async () => {
    if (!offerId) {
      setError('No offer ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getOfferForClient(offerId, clientEmail);
      
      if (!data) {
        setError('Offer not found or you do not have access');
        setOffer(null);
      } else {
        setOffer(data);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error loading client offer:', err);
      setError(err.message || 'Failed to load offer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffer();
  }, [offerId, clientEmail]);

  return { offer, loading, error, reloadOffer: loadOffer };
};
