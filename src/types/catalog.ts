
export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  attributes: Record<string, string | number | boolean>;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  specifications: Record<string, string | number | boolean>;
  variants?: ProductVariant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}
