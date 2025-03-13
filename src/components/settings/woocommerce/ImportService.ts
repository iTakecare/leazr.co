
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
  SchemaUpdateResult
} from './services/SchemaService';

export {
  fetchProductsFromWooCommerce,
  importProductsToSupabase,
  checkDatabaseSchema,
  updateDatabaseSchema,
  checkRLSPermissions,
  type ImportProgressCallbacks,
  type SchemaUpdateResult
};
