
// Re-export all services for backward compatibility
import { 
  fetchProductsFromWooCommerce,
  importProductsToSupabase,
  ImportProgressCallbacks
} from './services/ProductImportService';

import {
  checkDatabaseSchema,
  updateDatabaseSchema,
  checkRLSPermissions,
  SchemaCheckResult,
  SchemaUpdateResult
} from './services/DatabaseUtils';

export {
  fetchProductsFromWooCommerce,
  importProductsToSupabase,
  checkDatabaseSchema,
  updateDatabaseSchema,
  checkRLSPermissions,
  type ImportProgressCallbacks,
  type SchemaCheckResult,
  type SchemaUpdateResult
};
