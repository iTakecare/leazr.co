
import { Json } from '@supabase/supabase-js';

/**
 * Type guards and conversion utilities to handle the mismatch between 
 * Supabase database types and our application types.
 */

/**
 * Safely converts Json type (from Supabase) to a strongly typed Record
 */
export function jsonToRecord<T>(json: Json | null | undefined, defaultValue: Record<string, T> = {}): Record<string, T> {
  if (!json) return defaultValue;
  
  if (typeof json === 'string') {
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, T>;
      }
    } catch (e) {
      console.error("Failed to parse JSON string:", e);
    }
    return defaultValue;
  }
  
  if (typeof json === 'object' && !Array.isArray(json)) {
    return json as unknown as Record<string, T>;
  }
  
  return defaultValue;
}

/**
 * Safely converts Json type to Record<string, string[]>
 * Used for variation_attributes
 */
export function jsonToStringArrayRecord(json: Json | null | undefined): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const record = jsonToRecord<any>(json);
  
  Object.entries(record).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      result[key] = value.map(v => String(v));
    } else {
      result[key] = [];
    }
  });
  
  return result;
}

/**
 * Safely converts Json type to Record<string, string | number>
 * Used for specifications
 */
export function jsonToSpecifications(json: Json | null | undefined): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  const record = jsonToRecord<any>(json);
  
  Object.entries(record).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      result[key] = value;
    } else {
      result[key] = String(value);
    }
  });
  
  return result;
}

/**
 * Safely converts Json type to ProductAttributes
 * Used for attributes in Product type
 */
export function jsonToProductAttributes(json: Json | null | undefined): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  const record = jsonToRecord<any>(json);
  
  Object.entries(record).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else {
      result[key] = String(value);
    }
  });
  
  return result;
}

/**
 * Convert string dates to Date objects
 */
export function stringToDate(dateString: string | Date | null | undefined): Date {
  if (!dateString) return new Date();
  if (dateString instanceof Date) return dateString;
  
  return new Date(dateString);
}

/**
 * Convert a number to a string, safely
 */
export function numberToString(num: number | null | undefined): string {
  if (num === null || num === undefined) return '';
  return String(num);
}

/**
 * Convert a database product to app Product type
 */
export function dbToAppProduct(dbProduct: any): any {
  if (!dbProduct) return null;
  
  return {
    ...dbProduct,
    specifications: jsonToSpecifications(dbProduct.specifications),
    attributes: jsonToProductAttributes(dbProduct.attributes),
    variation_attributes: jsonToStringArrayRecord(dbProduct.variation_attributes),
    createdAt: dbProduct.created_at ? new Date(dbProduct.created_at) : new Date(),
    updatedAt: dbProduct.updated_at ? new Date(dbProduct.updated_at) : new Date(),
    imageUrl: dbProduct.image_url, // For backwards compatibility
    // Add any other fields that need conversion
  };
}

/**
 * Map an array of database products to app products
 */
export function dbToAppProducts(dbProducts: any[]): any[] {
  if (!Array.isArray(dbProducts)) return [];
  return dbProducts.map(dbToAppProduct);
}

/**
 * Convert a database client to app Client type
 */
export function dbToAppClient(dbClient: any): any {
  if (!dbClient) return null;
  
  return {
    ...dbClient,
    created_at: stringToDate(dbClient.created_at),
    updated_at: stringToDate(dbClient.updated_at),
    user_account_created_at: stringToDate(dbClient.user_account_created_at),
  };
}

/**
 * Convert database commission level to app CommissionLevel type
 */
export function dbToAppCommissionLevel(dbLevel: any): any {
  if (!dbLevel) return null;
  
  return {
    ...dbLevel,
    type: (dbLevel.type === 'ambassador' || dbLevel.type === 'partner') ? dbLevel.type : 'ambassador',
  };
}

/**
 * Safely cast string or number type to ensure it's handled correctly
 */
export function ensureString(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}
