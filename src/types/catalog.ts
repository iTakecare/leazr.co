
export interface ProductVariationAttributes {
  [key: string]: string[];
}

export interface ProductAttributes {
  [key: string]: string;
}

export interface VariantCombinationPrice {
  id: string;
  product_id: string;
  attributes: ProductAttributes;
  price: number;
  monthly_price?: number;
  stock?: number;
  created_at: string;
  updated_at: string;
}

// Define interfaces for attribute management
export interface AttributeDefinition {
  id: string;
  name: string;
  display_name: string;
  values?: AttributeValue[]; // Added values property
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

// Extend the Product interface to include SEO metadata
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  monthly_price?: number;
  image_url?: string;
  image_urls?: string[];
  image_alt_texts?: string[]; // Added for SEO
  category?: string;
  brand?: string;
  specifications?: Record<string, string | number | boolean>;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  sku?: string;
  parent_id?: string;
  is_parent?: boolean;
  is_variation?: boolean;
  variation_attributes?: ProductVariationAttributes;
  attributes?: ProductAttributes;
  stock?: number;
  meta?: ProductSeoMetadata; // Added for SEO
  
  // Properties for variants handling
  variants?: Product[];
  variants_count?: number;
  variant_combination_prices?: VariantCombinationPrice[];
  selected_attributes?: ProductAttributes;
  variant_id?: string;
  
  // Additional properties used in some components
  model?: string;
  imageUrl?: string; // Alias for image_url for backward compatibility
}

// New interface for SEO metadata
export interface ProductSeoMetadata {
  title?: string;
  description?: string;
  keywords?: string;
  slug?: string;
  canonical_url?: string;
}
