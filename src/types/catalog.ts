
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  imageUrl?: string;
  image_url?: string; 
  imageUrls?: string[];
  image_urls?: string[];
  imageAlt?: string;
  image_alt?: string;
  imageAlts?: string[];
  image_alts?: string[];
  specifications?: Record<string, string>;
  sku?: string;
  parent_id?: string;
  is_variation?: boolean;
  is_parent?: boolean;
  variation_attributes?: Record<string, string>;
  variants_ids?: string[];
  variants?: ProductVariant[];
  monthly_price?: number;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  attributes?: Record<string, string | number | boolean>;
  imageUrl?: string;
  monthly_price?: number;
}

export interface ProductCreateInput {
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  price: number;
  imageUrl?: string;
  image_url?: string;
  imageUrls?: string[];
  image_urls?: string[];
  imageAlt?: string;
  image_alt?: string;
  imageAlts?: string[];
  image_alts?: string[];
  specifications?: Record<string, string>;
}

export interface ProductUpdateInput {
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  image_url?: string;
  imageUrls?: string[];
  image_urls?: string[];
  imageAlt?: string;
  image_alt?: string;
  imageAlts?: string[];
  image_alts?: string[];
  specifications?: Record<string, string>;
  sku?: string;
  active?: boolean;
}

export type ProductsResponse = {
  data: Product[];
  count: number;
};
