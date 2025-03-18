
// Product type definition
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  monthly_price?: number;
  imageUrl?: string;
  specifications?: Record<string, string | number>;
  tier?: string; // Silver, gold, or platinum
  createdAt: Date;
  updatedAt: Date;
  active: boolean;
  
  // Additional properties used by the application
  is_parent?: boolean;
  is_variation?: boolean;
  parent_id?: string;
  variants?: ProductVariant[];
  variation_attributes?: Record<string, string | number | boolean>;
  
  // Alternative property names used in Supabase
  image_url?: string; // Alternative to imageUrl for DB compatibility
  image_urls?: string[]; // Additional images
  image_alts?: string[]; // Alt text for additional images
}

// Product variant definition
export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  attributes?: Record<string, string | number | boolean>;
}

// Category type definition
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  products?: Product[];
}

// Brand type definition
export interface Brand {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  products?: Product[];
}
