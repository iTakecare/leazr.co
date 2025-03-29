
import { useCallback } from "react";
import { Product } from "@/types/catalog";
import { Json } from '@/utils/typeMappers';

export const useProductMapper = () => {
  // Map database products to application products
  const mapDatabaseProductsToAppProducts = useCallback((dbProducts: any[]): Product[] => {
    if (!Array.isArray(dbProducts)) return [];
    
    return dbProducts.map(product => mapDatabaseProductToAppProduct(product));
  }, []);

  // Map a single database product to application product
  const mapDatabaseProductToAppProduct = useCallback((dbProduct: any): Product => {
    if (!dbProduct) return {} as Product;
    
    // Check if the data already has the application format
    if (dbProduct.createdAt && dbProduct.updatedAt) {
      return dbProduct as Product;
    }
    
    // Convert DB format to app format
    const appProduct: Product = {
      ...dbProduct,
      createdAt: dbProduct.created_at ? new Date(dbProduct.created_at) : new Date(),
      updatedAt: dbProduct.updated_at ? new Date(dbProduct.updated_at) : new Date(),
      imageUrl: dbProduct.image_url || dbProduct.imageUrl || '', // Handle both naming conventions
      imageUrls: dbProduct.image_urls || dbProduct.imageUrls || [],
      
      // Map specifications if available
      specifications: convertJsonField(dbProduct.specifications) as Record<string, string | number>,
      
      // Map attributes if available
      attributes: convertJsonField(dbProduct.attributes) as Record<string, string | number | boolean>,
      
      // Map variation attributes if available
      variation_attributes: convertJsonField(dbProduct.variation_attributes) as Record<string, string[]>,
      
      // Ensure other required fields
      active: dbProduct.active ?? true,
    };
    
    return appProduct;
  }, []);
  
  // Helper to safely convert Json fields (handles strings, objects, and null values)
  const convertJsonField = useCallback((jsonData: Json | null | undefined): Record<string, any> => {
    if (!jsonData) return {};
    
    if (typeof jsonData === 'string') {
      try {
        return JSON.parse(jsonData);
      } catch (e) {
        console.error('Failed to parse JSON string:', e);
        return {};
      }
    }
    
    if (typeof jsonData === 'object' && jsonData !== null) {
      return jsonData as Record<string, any>;
    }
    
    return {};
  }, []);
  
  return {
    mapDatabaseProductsToAppProducts,
    mapDatabaseProductToAppProduct,
    convertJsonField
  };
};
