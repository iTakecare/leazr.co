
import { Product } from "@/types/catalog";

// Sample product data if API fails - intentionally leaving empty
export const products: Product[] = [];

/**
 * Get a product by its ID
 */
export const getProductById = (id: string): Product | undefined => {
  return products.find((product) => product.id === id);
};

/**
 * Get products by category
 */
export const getProductsByCategory = (category: string): Product[] => {
  return products.filter((product) => product.category === category);
};

/**
 * Get all unique product categories
 */
export const getProductCategories = (): string[] => {
  return [...new Set(products.map((product) => product.category))];
};

/**
 * Get all brands
 */
export const getProductBrands = (): string[] => {
  return [...new Set(products.map((product) => product.brand))];
};

/**
 * Search products by term
 */
export const searchProducts = (term: string): Product[] => {
  const searchTerm = term.toLowerCase();
  return products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm) ||
    product.description?.toLowerCase().includes(searchTerm) ||
    product.brand?.toLowerCase().includes(searchTerm) ||
    product.category?.toLowerCase().includes(searchTerm)
  );
};

// Re-export the Product type for backward compatibility
export type { Product } from "@/types/catalog";
