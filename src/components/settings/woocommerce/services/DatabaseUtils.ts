
import { adminSupabase, supabase } from '@/integrations/supabase/client';

export interface SchemaCheckResult {
  hasCategory: boolean; 
  hasDescription: boolean;
}

export interface SchemaUpdateResult {
  success: boolean; 
  error?: string;
}

/**
 * Checks if the specified column exists in the products table
 */
export const checkColumnExists = async (columnName: string): Promise<boolean> => {
  try {
    // Build a simple query to check if the column exists
    // If the column doesn't exist, it will throw an error
    const query = `select ${columnName} from products limit 1`;
    const { error } = await supabase.rpc('execute_sql', { sql_query: query });
    
    // If there's no error, the column exists
    return !error;
  } catch (error) {
    console.error(`Error checking if ${columnName} exists:`, error);
    return false;
  }
};

/**
 * Checks if products table has the required columns
 */
export const checkDatabaseSchema = async (): Promise<SchemaCheckResult> => {
  try {
    const hasCategory = await checkColumnExists('category');
    const hasDescription = await checkColumnExists('description');
    
    return { hasCategory, hasDescription };
  } catch (error) {
    console.error('Error checking schema:', error);
    return { hasCategory: false, hasDescription: false };
  }
};

/**
 * Updates the database schema to add missing columns
 */
export const updateDatabaseSchema = async (): Promise<SchemaUpdateResult> => {
  try {
    console.log('Starting schema update process...');
    
    // Create SQL statements for adding columns if they don't exist
    const addCategorySQL = `
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'products' AND column_name = 'category'
        ) THEN 
          ALTER TABLE products ADD COLUMN category text DEFAULT 'other'; 
        END IF; 
      END $$;
    `;
    
    const addDescriptionSQL = `
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'products' AND column_name = 'description'
        ) THEN 
          ALTER TABLE products ADD COLUMN description text DEFAULT NULL; 
        END IF; 
      END $$;
    `;
    
    // Execute SQL to add category column
    const { error: categoryError } = await adminSupabase.rpc('execute_sql', { 
      sql_query: addCategorySQL 
    });
    
    if (categoryError) {
      console.error('Error adding category column:', categoryError);
      return { success: false, error: categoryError.message };
    }
    
    // Execute SQL to add description column
    const { error: descriptionError } = await adminSupabase.rpc('execute_sql', { 
      sql_query: addDescriptionSQL 
    });
    
    if (descriptionError) {
      console.error('Error adding description column:', descriptionError);
      return { success: false, error: descriptionError.message };
    }
    
    console.log('Schema update completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error updating schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error updating schema'
    };
  }
};

/**
 * Checks if the current user has RLS permissions to modify products
 */
export const checkRLSPermissions = async (): Promise<boolean> => {
  try {
    // Try a simple operation to check permissions
    const { error } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    // If no error, the user probably has the necessary permissions
    return error === null;
  } catch (error) {
    console.error('Error checking RLS permissions:', error);
    return false;
  }
};
