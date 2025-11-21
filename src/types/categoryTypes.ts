import { Category } from "./catalog";

export interface UpsellProduct {
  id: string;
  name: string;
  slug?: string;
  price?: number;
  monthly_price?: number;
  image_url?: string;
  brand?: string;
  category?: string;
  description?: string;
  short_description?: string;
  active?: boolean;
  upsell_source: 'compatibility' | 'exception' | 'both';
  upsell_strength?: number;
  upsell_reason?: string;
  // Required fields to match Product interface
  createdAt: Date | string;
  updatedAt: Date | string;
}
