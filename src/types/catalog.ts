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
}

// New interface for SEO metadata
export interface ProductSeoMetadata {
  title?: string;
  description?: string;
  keywords?: string;
  slug?: string;
  canonical_url?: string;
}
