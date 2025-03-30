import { supabase } from '@/integrations/supabase/client';
import { Offer } from '@/types/equipment';
import { toast } from 'sonner';

// Import from offerDetail service to maintain consistency
import { getOfferDetail, updateOffer as updateOfferDetail } from './offers/offerDetail';

export const getOfferById = async (id: string) => {
  return getOfferDetail(id);
};

export const updateOffer = async (id: string, data: Partial<any>) => {
  return updateOfferDetail(id, data);
};
