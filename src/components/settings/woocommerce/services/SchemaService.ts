
import { adminSupabase, supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Return type for schema update operations
export interface SchemaUpdateResult {
  success: boolean; 
  error?: string;
}

/**
 * Checks if the products table has category and description columns
 */
export const checkDatabaseSchema = async (): Promise<{ hasCategory: boolean; hasDescription: boolean }> => {
  try {
    // Vérifier l'existence des colonnes category et description
    const { data, error } = await supabase
      .from('products')
      .select('category, description')
      .limit(1);
    
    if (!error) {
      return { hasCategory: true, hasDescription: true };
    } else {
      console.warn('Schema check failed, assuming new columns are not available yet:', error);
      // Si on a une erreur, déterminer quelles colonnes sont manquantes
      const hasCategory = !(error.message && error.message.includes('category'));
      const hasDescription = !(error.message && error.message.includes('description'));
      
      return { hasCategory, hasDescription };
    }
  } catch (error) {
    console.error('Error checking schema:', error);
    return { hasCategory: false, hasDescription: false };
  }
};

/**
 * Updates the database schema to add category and description columns if they don't exist
 */
export const updateDatabaseSchema = async (): Promise<SchemaUpdateResult> => {
  try {
    // Utilisation du client admin qui permet de contourner les restrictions RLS
    // pour les opérations DDL (modification de schéma)
    
    // Adding console.log for debugging
    console.log('Starting schema update process...');
    
    // Add category column
    const { error: categoryError } = await adminSupabase.rpc(
      'add_column_if_not_exists',
      {
        table_name: 'products',
        column_name: 'category',
        column_type: 'text',
        column_default: "'other'"
      }
    );
    
    if (categoryError) {
      console.error('Erreur lors de l\'ajout de la colonne category:', categoryError);
      return { success: false, error: categoryError.message };
    }
    
    // Add description column
    const { error: descriptionError } = await adminSupabase.rpc(
      'add_column_if_not_exists',
      {
        table_name: 'products',
        column_name: 'description',
        column_type: 'text',
        column_default: 'NULL'
      }
    );
    
    if (descriptionError) {
      console.error('Erreur lors de l\'ajout de la colonne description:', descriptionError);
      return { success: false, error: descriptionError.message };
    }
    
    console.log('Schema update completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Erreur lors de la mise à jour du schéma:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de la mise à jour du schéma'
    };
  }
};

/**
 * Checks if the current user has Row Level Security permissions to modify products
 */
export const checkRLSPermissions = async (): Promise<boolean> => {
  try {
    // Tenter une simple opération de lecture pour vérifier les permissions
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    // Si aucune erreur, l'utilisateur a probablement les permissions nécessaires
    return error === null;
  } catch (error) {
    console.error('Error checking RLS permissions:', error);
    return false;
  }
};
