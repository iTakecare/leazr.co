
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
