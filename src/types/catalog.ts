
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
  createdAt: Date | string;
  updatedAt: Date | string;
  active: boolean;
  
  // WooCommerce compatibility fields
  slug?: string;
  permalink?: string;
  dateCreated?: string;
  dateModified?: string;
  type?: string;
  status?: string;
  featured?: boolean;
  catalogVisibility?: string;
  shortDescription?: string;
  sku?: string;
  regularPrice?: string;
  salePrice?: string;
  dateOnSaleFrom?: string | null;
  dateOnSaleTo?: string | null;
  priceHtml?: string;
  onSale?: boolean;
  purchasable?: boolean;
  totalSales?: number;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: any[];
  downloadLimit?: number;
  downloadExpiry?: number;
  externalUrl?: string;
  buttonText?: string;
  taxStatus?: string;
  taxClass?: string;
  manageStock?: boolean;
  stockQuantity?: number;
  inStock?: boolean;
  backorders?: string;
  backordersAllowed?: boolean;
  backordered?: boolean;
  soldIndividually?: boolean;
  weight?: string;
  dimensions?: {
    length: string;
    width: string;
    height: string;
  };
  shippingRequired?: boolean;
  shippingTaxable?: boolean;
  shippingClass?: string;
  shippingClassId?: number;
  reviewsAllowed?: boolean;
  averageRating?: string;
  ratingCount?: number;
  relatedIds?: number[];
  upsellIds?: number[];
  crossSellIds?: number[];
  parentId?: number;
  purchaseNote?: string;
  categories?: any[];
  tags?: any[];
  images?: any[];
  attributes?: Record<string, string | number | boolean> | any[];
  defaultAttributes?: any[];
  variations?: any[];
  groupedProducts?: any[];
  menuOrder?: number;
  metaData?: any[];
  price_number?: number;
  stock?: number;
  discount_per_quantity?: Record<string, any>;
  model?: string;
  
  // Additional properties used by the application
  is_parent?: boolean;
  is_variation?: boolean;
  parent_id?: string;
  variants?: Product[]; // Changed from ProductVariant[] to Product[]
  variation_attributes?: Record<string, string | number | boolean>;
  
  // Alternative property names used in Supabase
  image_url?: string; // Alternative to imageUrl for DB compatibility
  image_urls?: string[]; // Additional images
  imageUrls?: string[]; // Alternative property name
  image_alts?: string[]; // Alt text for additional images
}

// Product variant definition - simplified as we're using Product objects for variants
export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  monthly_price?: number;
  imageUrl?: string;
  image_url?: string;
  specifications?: Record<string, string | number>;
  attributes?: Record<string, string | number | boolean>;
  parent_id?: string;
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
