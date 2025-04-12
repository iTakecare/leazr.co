
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
  
  // Add missing properties
  currentPrice?: number;
  selected_attributes?: Record<string, string>;
  variants_count?: number;
  image_urls?: string[];
  imageUrls?: string[];
  regularPrice?: number;
  tier?: string;
  createdAt?: Date;
  updatedAt?: Date;
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
  id?: string; // Adding id property
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

// Adding missing types
export interface ProductAttributes {
  [key: string]: string | number | boolean;
}

export interface AttributeDefinition {
  id: string;
  name: string;
  display_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  display_value: string;
  created_at?: string;
  updated_at?: string;
}
