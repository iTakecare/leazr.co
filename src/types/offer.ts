import { ProductPack } from '@/types/pack';

export interface OfferPack {
  id: string;
  offer_id: string;
  pack_id: string;
  pack: ProductPack;
  quantity: number;
  unit_monthly_price: number;
  margin_percentage: number;
  position: number;
  created_at: Date | string;
}

export interface CreateOfferPackData {
  pack_id: string;
  quantity: number;
  unit_monthly_price: number;
  margin_percentage: number;
  position: number;
}