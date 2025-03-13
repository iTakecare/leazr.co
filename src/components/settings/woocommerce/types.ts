
// Types pour l'importateur WooCommerce

export interface WooCommerceProduct {
  id: number;
  name: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: { id: number; name: string; slug: string }[];
  images: { id: number; src: string; alt: string }[];
  variations: number[];
  attributes: {
    id: number;
    name: string;
    options: string[];
  }[];
  sku: string;
  stock_status: string;
}

export interface ProductData {
  name: string;
  brand: string;
  price: number;
  monthly_price: number;
  image_url: string | null;
  active: boolean;
  category?: string;
  description?: string;
}

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

export interface FetchingOptions {
  includeImages: boolean;
  includeVariations: boolean;
  includeDescriptions: boolean;
  importCategories: boolean;
  overwriteExisting: boolean;
  bypassRLS: boolean;
}

export type ImportStatus = 'idle' | 'fetching' | 'importing' | 'completed' | 'error';
export type ConnectionStatus = 'untested' | 'success' | 'error';
