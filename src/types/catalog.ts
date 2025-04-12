
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  monthly_price?: number;
  image_url?: string;
  imageUrl?: string;
  category?: string;
  brand?: string;
  stock?: number;
  active?: boolean;
  specifications?: Record<string, string>;
  is_parent?: boolean;
  parent_id?: string | null;
  is_variation?: boolean;
  attributes?: Record<string, any>;
  variation_attributes?: ProductVariationAttributes;
  variants?: Product[];
  variant_combination_prices?: VariantCombinationPrice[];
  created_at?: string;
  updated_at?: string;
  admin_only?: boolean;
  model?: string;
  image_urls?: string[];
}

export interface ProductVariationAttributes {
  [key: string]: string[];
}

export interface VariantCombinationPrice {
  attributes: Record<string, any>;
  price: number;
  monthly_price?: number;
  stock?: number;
  active?: boolean;
  sku?: string;
}

export interface Brand {
  id: string;
  name: string;
  translation: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  translation: string;
  created_at?: string;
  updated_at?: string;
}
