// ============================================
// PARTNER TYPES
// ============================================

export interface Partner {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  hero_image_url?: string;
  website_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  packs_count?: number;
}

export interface PartnerPack {
  id: string;
  partner_id: string;
  pack_id: string;
  position: number;
  is_customizable: boolean;
  created_at: string;
  // Populated
  pack?: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    total_monthly_price: number;
    pack_monthly_price?: number;
    is_active: boolean;
    items?: any[];
  };
  options?: PartnerPackOption[];
}

export interface PartnerPackOption {
  id: string;
  partner_pack_id: string;
  category_name: string;
  is_required: boolean;
  max_quantity: number;
  position: number;
  allowed_product_ids: string[];
}

// ============================================
// EXTERNAL PROVIDER TYPES
// ============================================

export interface ExternalProvider {
  id: string;
  company_id: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed
  products_count?: number;
}

export interface ExternalProviderProduct {
  id: string;
  provider_id: string;
  name: string;
  description?: string;
  price_htva: number;
  billing_period: 'monthly' | 'yearly' | 'one_time';
  is_active: boolean;
  position: number;
  created_at: string;
}

export interface PartnerProviderLink {
  id: string;
  partner_id: string;
  provider_id: string;
  position: number;
  card_title?: string;
  selected_product_ids: string[];
  created_at: string;
  // Populated
  provider?: ExternalProvider;
  products?: ExternalProviderProduct[];
}

// ============================================
// FORM TYPES
// ============================================

export interface CreatePartnerData {
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  hero_image_url?: string;
  website_url?: string;
  is_active?: boolean;
}

export interface CreateExternalProviderData {
  name: string;
  logo_url?: string;
  website_url?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateExternalProviderProductData {
  provider_id: string;
  name: string;
  description?: string;
  price_htva: number;
  billing_period: 'monthly' | 'yearly' | 'one_time';
  is_active?: boolean;
  position?: number;
}

export const BILLING_PERIOD_LABELS: Record<string, string> = {
  monthly: 'Mensuel',
  yearly: 'Annuel',
  one_time: 'Unique',
};
