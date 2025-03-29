
import { useState, useCallback } from 'react';
import { Product, VariantCombinationPrice } from '@/types/catalog';
import { 
  jsonToProductAttributes, 
  jsonToSpecifications, 
  jsonToStringArrayRecord, 
  stringToDate
} from '@/utils/typeMappers';

export function useProductMapper() {
  const [processingMaps, setProcessingMaps] = useState(false);
  
  /**
   * Map a raw database product to the application Product type
   */
  const mapDatabaseProductToAppProduct = useCallback((dbProduct: any): Product => {
    if (!dbProduct) {
      console.warn("Attempted to map null or undefined product");
      return {} as Product;
    }
    
    try {
      // Handle basic fields
      const product: Product = {
        id: dbProduct.id,
        name: dbProduct.name || '',
        brand: dbProduct.brand || '',
        category: dbProduct.category || '',
        description: dbProduct.description || '',
        price: typeof dbProduct.price === 'number' ? dbProduct.price : 0,
        monthly_price: dbProduct.monthly_price,
        active: dbProduct.active !== false, // Default to true if undefined
        
        // Handle specifications safely
        specifications: jsonToSpecifications(dbProduct.specifications),
        
        // Handle attributes safely
        attributes: jsonToProductAttributes(dbProduct.attributes),
        
        // Handle variation attributes safely
        variation_attributes: jsonToStringArrayRecord(dbProduct.variation_attributes),
        
        // Convert created_at/updated_at to Date objects
        createdAt: stringToDate(dbProduct.created_at),
        updatedAt: stringToDate(dbProduct.updated_at),
        
        // Handle image fields
        image_url: dbProduct.image_url || '',
        imageUrl: dbProduct.image_url || dbProduct.imageUrl || '', // For backwards compatibility
        
        // Handle other properties
        is_parent: dbProduct.is_parent === true,
        is_variation: dbProduct.is_variation === true,
        parent_id: dbProduct.parent_id || undefined,
        
        // Handle variant combination prices
        variant_combination_prices: dbProduct.variant_combination_prices 
          ? mapVariantCombinationPrices(dbProduct.variant_combination_prices)
          : [],
          
        // Additional fields as needed
        model: dbProduct.model || '',
        stock: typeof dbProduct.stock === 'number' ? dbProduct.stock : undefined,
        
        // Original DB fields if needed for compatibility
        created_at: dbProduct.created_at,
        updated_at: dbProduct.updated_at
      };
      
      return product;
    } catch (error) {
      console.error("Error mapping database product to app product:", error, dbProduct);
      return {
        id: dbProduct?.id || 'error',
        name: dbProduct?.name || 'Error Product',
        brand: '',
        category: '',
        description: 'Error loading product data',
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        active: false,
        specifications: {}
      } as Product;
    }
  }, []);
  
  /**
   * Map database variant prices to application variant prices
   */
  const mapVariantCombinationPrices = useCallback((dbVariantPrices: any[]): VariantCombinationPrice[] => {
    if (!Array.isArray(dbVariantPrices)) return [];
    
    return dbVariantPrices.map(dbPrice => ({
      id: dbPrice.id,
      product_id: dbPrice.product_id,
      attributes: jsonToProductAttributes(dbPrice.attributes),
      price: typeof dbPrice.price === 'number' ? dbPrice.price : 0,
      purchase_price: dbPrice.purchase_price,
      monthly_price: dbPrice.monthly_price,
      stock: dbPrice.stock,
      created_at: dbPrice.created_at ? new Date(dbPrice.created_at) : new Date(),
      updated_at: dbPrice.updated_at ? new Date(dbPrice.updated_at) : new Date()
    }));
  }, []);
  
  /**
   * Map database products to application Products
   */
  const mapDatabaseProductsToAppProducts = useCallback((dbProducts: any[]): Product[] => {
    setProcessingMaps(true);
    try {
      if (!Array.isArray(dbProducts)) return [];
      
      const mappedProducts = dbProducts.map(mapDatabaseProductToAppProduct);
      
      return mappedProducts;
    } catch (error) {
      console.error("Error mapping database products to app products:", error);
      return [];
    } finally {
      setProcessingMaps(false);
    }
  }, [mapDatabaseProductToAppProduct]);
  
  /**
   * Prepare product for database saving
   */
  const mapAppProductToDatabaseProduct = useCallback((product: Product): any => {
    return {
      ...product,
      updated_at: new Date().toISOString(),
      // Convert Date objects to ISO strings
      created_at: product.created_at instanceof Date ? product.created_at.toISOString() : product.created_at,
    };
  }, []);
  
  return {
    mapDatabaseProductToAppProduct,
    mapDatabaseProductsToAppProducts,
    mapAppProductToDatabaseProduct,
    processingMaps
  };
}
