
import { Product, ProductAttributes, ProductVariationAttributes } from '@/types/catalog';

/**
 * Transforms data from the database into a properly typed Product object
 */
export function transformDatabaseProduct(dbProduct: any): Product {
  // Safety check
  if (!dbProduct) return {} as Product;
  
  // Parse JSON fields safely
  const specifications = parseJsonField(dbProduct.specifications);
  const attributes = parseJsonField(dbProduct.attributes);
  const variationAttributes = parseJsonField(dbProduct.variation_attributes);
  
  // Create properly typed product
  return {
    ...dbProduct,
    // Ensure specifications is a record of string/number
    specifications: specifications as Record<string, string | number>,
    // Ensure attributes is a proper ProductAttributes
    attributes: attributes as ProductAttributes,
    // Ensure variation_attributes is a proper ProductVariationAttributes
    variation_attributes: variationAttributes as ProductVariationAttributes,
    // Map date fields
    createdAt: dbProduct.created_at || new Date().toISOString(),
    updatedAt: dbProduct.updated_at || new Date().toISOString(),
    // Ensure monthly_price is a number
    monthly_price: typeof dbProduct.monthly_price === 'number' 
      ? dbProduct.monthly_price 
      : parseFloat(dbProduct.monthly_price || '0'),
    // Use image_url or imageUrl
    imageUrl: dbProduct.image_url || dbProduct.imageUrl
  } as Product;
}

/**
 * Safely parses a JSON field
 */
function parseJsonField(field: any): any {
  if (!field) return {};
  
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch (e) {
      console.error('Failed to parse JSON field:', e);
      return {};
    }
  }
  
  return field;
}

/**
 * Transform a batch of products from the database
 */
export function transformDatabaseProducts(dbProducts: any[]): Product[] {
  if (!Array.isArray(dbProducts)) return [];
  return dbProducts.map(transformDatabaseProduct);
}
