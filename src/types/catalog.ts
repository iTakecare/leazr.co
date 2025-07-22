
// Product type definition
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  brand_id?: string;
  category_id?: string;
  description: string;
  short_description?: string;
  price: number;
  monthly_price?: number;
  purchase_price?: number;
  currentPrice?: number; // Ajout de currentPrice au type Product
  imageUrl?: string;
  specifications?: Record<string, string | number>;
  tier?: string; // Silver, gold, or platinum
  createdAt: Date | string;
  updatedAt: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
  active: boolean;
  model?: string;
  stock?: number;
  admin_only?: boolean; // Added for admin-only products
  is_refurbished?: boolean;
  condition?: string;
  sku?: string;
  company_id?: string;
  
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
  attributes?: ProductAttributes | Record<string, string | number | boolean>;
  defaultAttributes?: any[];
  variations?: any[];
  groupedProducts?: any[];
  menuOrder?: number;
  metaData?: any[];
  price_number?: number;
  discount_per_quantity?: Record<string, any>;
  
  // Additional properties used by the application
  is_parent?: boolean;
  is_variation?: boolean;
  parent_id?: string;
  variants?: Product[]; // List of product variants
  variation_attributes?: ProductVariationAttributes; // Available attribute options for this product
  variant_combination_prices?: VariantCombinationPrice[]; // Prices for specific attribute combinations
  variants_count?: number; // Count of variants for this product
  has_variants?: boolean; // Whether this product has variants
  has_child_variants?: boolean; // Whether this product has child variants
  
  // Used to store the selected attributes for a specific variant
  selected_attributes?: ProductAttributes;
  
  // Alternative property names used in Supabase
  image_url?: string; // Alternative to imageUrl for DB compatibility
  image_urls?: string[]; // Additional images
  imageUrls?: string[]; // Alternative property name
  image_alts?: string[]; // Alt text for additional images
}

// Product attribute definition
export interface ProductAttribute {
  id?: string;
  name: string;
  display_name?: string;
  value: string | number | boolean;
  options?: string[];
}

// Product attributes as key-value pairs
export interface ProductAttributes {
  [key: string]: string | number | boolean;
}

// Product variation attributes definition - for storing available options
export interface ProductVariationAttributes {
  [attributeName: string]: string[]; // attribute name -> list of possible values
}

// Product variant definition - ensuring compatible structure with Product
export interface ProductVariant extends Omit<Product, 'variants' | 'variation_attributes'> {
  parent_id: string;
  attributes: ProductAttributes;
}

// Attribute type definition for the new product_attributes table
export interface AttributeDefinition {
  id: string;
  name: string;
  display_name: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  values?: AttributeValue[];
}

// Attribute value definition for the new product_attribute_values table
export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  display_value: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Price definition for specific combinations of attribute values
export interface VariantCombinationPrice {
  id: string;
  product_id: string; // Parent product ID
  attributes: ProductAttributes; // Combination of attributes
  price: number; // Selling price
  purchase_price?: number; // Purchase price (cost)
  monthly_price?: number;
  stock?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Category type definition
export interface Category {
  id: string;
  name: string;
  slug?: string;
  translation?: string;
  description?: string;
  imageUrl?: string;
  products?: Product[];
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Brand type definition
export interface Brand {
  id: string;
  name: string;
  translation?: string;
  logo?: string;
  description?: string;
  products?: Product[];
  created_at?: Date | string;
  updated_at?: Date | string;
}
