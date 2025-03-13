
import { Product } from "@/types/catalog";

export const products: Product[] = [];

export const getProductById = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter((product) => product.category === category);
};

export const getProductCategories = (): string[] => {
  return [...new Set(products.map((product) => product.category))];
};
