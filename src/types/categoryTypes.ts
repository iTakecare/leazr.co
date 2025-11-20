import { Category } from "./catalog";

export interface CategoryType {
  id: string;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CategoryCompatibility {
  id: string;
  parent_category_type_id: string;
  child_category_type_id: string;
  compatibility_strength: number;
  is_bidirectional: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
  parent_type?: CategoryType;
  child_type?: CategoryType;
}

export interface CategorySpecificLink {
  id: string;
  parent_category_id: string;
  child_category_id: string;
  link_type: 'exception' | 'recommended' | 'required';
  priority: number;
  created_at?: Date | string;
  updated_at?: Date | string;
  parent_category?: Category;
  child_category?: Category;
}

export interface UpsellProduct {
  id: string;
  name: string;
  slug?: string;
  price?: number;
  monthly_price?: number;
  image_url?: string;
  brand?: string;
  category?: string;
  description?: string;
  short_description?: string;
  active?: boolean;
  upsell_source: 'compatibility' | 'exception' | 'both';
  upsell_strength?: number;
  upsell_reason?: string;
  // Required fields to match Product interface
  createdAt: Date | string;
  updatedAt: Date | string;
}
