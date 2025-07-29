export interface ProductPack {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  is_featured: boolean;
  admin_only: boolean;
  valid_from?: Date | string;
  valid_to?: Date | string;
  total_purchase_price: number;
  total_monthly_price: number;
  total_margin: number;
  pack_monthly_price?: number;
  pack_promo_price?: number;
  promo_active: boolean;
  promo_valid_from?: Date | string;
  promo_valid_to?: Date | string;
  leaser_id?: string;
  selected_duration?: number;
  created_at: Date | string;
  updated_at: Date | string;
  items?: ProductPackItem[];
}

export interface ProductPackItem {
  id: string;
  pack_id: string;
  product_id: string;
  variant_price_id?: string;
  quantity: number;
  unit_purchase_price: number;
  unit_monthly_price: number;
  margin_percentage: number;
  custom_price_override: boolean;
  position: number;
  created_at: Date | string;
  
  // Populated data
  product?: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    brand_name?: string;
    category_name?: string;
  };
  variant_price?: {
    id: string;
    attributes: Record<string, string>;
    price: number;
    monthly_price?: number;
    stock?: number;
  };
}

export interface CreatePackData {
  name: string;
  description?: string;
  image_url?: string;
  is_active?: boolean;
  is_featured?: boolean;
  admin_only?: boolean;
  valid_from?: Date;
  valid_to?: Date;
  pack_monthly_price?: number;
  pack_promo_price?: number;
  promo_active?: boolean;
  promo_valid_from?: Date;
  promo_valid_to?: Date;
  leaser_id?: string;
  selected_duration?: number;
}

export interface CreatePackItemData {
  product_id: string;
  variant_price_id?: string;
  quantity: number;
  unit_purchase_price: number;
  unit_monthly_price: number;
  margin_percentage: number;
  custom_price_override?: boolean;
  position: number;
}

export interface PackCalculation {
  total_purchase_price: number;
  total_monthly_price: number;
  total_margin: number;
  average_margin_percentage: number;
  items_count: number;
  total_quantity: number;
}

export interface PackFormData extends CreatePackData {
  items: CreatePackItemData[];
}