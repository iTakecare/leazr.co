
import { supabase, adminSupabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  WooCommerceProduct, 
  ProductData, 
  FetchingOptions 
} from './types';
import {
  fetchAllProducts,
  fetchProductVariations,
  cleanHtml,
  getCategoryMapping,
  parsePrice,
  calculateMonthlyPrice
} from './WooCommerceService';

// Types internes pour le service d'importation
interface ImportProgressCallbacks {
  onStageChange: (stage: string) => void;
  onProgressUpdate: (progress: number) => void;
  onImageImported: () => void;
  onSuccess: (count: number) => void;
  onError: (count: number) => void;
  onErrorMessage: (message: string) => void;
}

export const fetchProductsFromWooCommerce = async (): Promise<WooCommerceProduct[]> => {
  try {
    return await fetchAllProducts();
  } catch (error) {
    console.error('Erreur lors de la récupération des produits WooCommerce:', error);
    throw error;
  }
};

export const importProductsToSupabase = async (
  products: WooCommerceProduct[],
  options: FetchingOptions,
  schemaInfo: { hasCategory: boolean; hasDescription: boolean },
  callbacks: ImportProgressCallbacks
): Promise<void> => {
  if (products.length === 0) {
    throw new Error('Aucun produit à importer');
  }
  
  // Déterminer quel client Supabase utiliser (normal ou avec bypass RLS)
  const db = options.bypassRLS ? adminSupabase : supabase;
  
  // Vérifier les produits existants si on ne veut pas les écraser
  let existingProducts: Record<string, boolean> = {};
  
  if (!options.overwriteExisting) {
    callbacks.onStageChange('Vérification des produits existants...');
    const { data, error } = await db
      .from('products')
      .select('name, brand');
    
    if (error) throw error;
    
    if (data) {
      existingProducts = data.reduce((acc, product) => {
        const key = `${product.brand}-${product.name}`.toLowerCase();
        acc[key] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }
  }
  
  let importSuccess = 0;
  let importErrors = 0;
  
  // Traiter chaque produit
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    callbacks.onProgressUpdate(Math.round((i / products.length) * 100));
    callbacks.onStageChange(`Importation du produit ${i + 1}/${products.length}: ${product.name}`);
    
    try {
      // Extraire la marque et le nom
      let brand = 'Generic';
      let name = product.name;
      
      // Essayer d'extraire la marque du début du nom
      const brandMatch = name.match(/^([\\w\\s]+)\\s+(.+)$/);
      if (brandMatch) {
        brand = brandMatch[1].trim();
        name = brandMatch[2].trim();
      }
      
      // Vérifier si le produit existe déjà
      const productKey = `${brand}-${name}`.toLowerCase();
      if (!options.overwriteExisting && existingProducts[productKey]) {
        callbacks.onErrorMessage(`Produit "${product.name}" déjà existant, ignoré`);
        importErrors++;
        continue;
      }
      
      // Gérer l'image si l'option est activée
      let imageUrl = '';
      if (options.includeImages && product.images && product.images.length > 0) {
        callbacks.onStageChange(`Importation du produit ${i + 1}/${products.length}: ${product.name} - Traitement de l'image`);
        imageUrl = product.images[0].src;
        callbacks.onImageImported();
      }
      
      // Préparer la description
      let description = '';
      if (options.includeDescriptions && schemaInfo.hasDescription) {
        description = product.short_description || product.description 
          ? cleanHtml(product.short_description || product.description)
          : '';
      }
      
      // Mapper la catégorie
      let category = 'other';
      if (options.importCategories && schemaInfo.hasCategory && product.categories && product.categories.length > 0) {
        category = getCategoryMapping(product.categories);
      }
      
      // Calculer les prix
      const price = parsePrice(product.price);
      const monthlyPrice = calculateMonthlyPrice(price);
      
      // Préparer les données du produit
      const productData: ProductData = {
        name,
        brand,
        price,
        monthly_price: monthlyPrice,
        image_url: imageUrl || null,
        active: product.stock_status === 'instock'
      };
      
      // Ajouter les champs optionnels selon le schéma
      if (schemaInfo.hasCategory) {
        productData.category = category;
      }
      
      if (schemaInfo.hasDescription) {
        productData.description = description;
      }
      
      // Insertion dans la base de données
      let result;
      
      if (options.overwriteExisting) {
        // Tentative de mise à jour (si existe) sinon insertion
        const { data: existingProduct } = await db
          .from('products')
          .select('id')
          .eq('name', name)
          .eq('brand', brand)
          .maybeSingle();
          
        if (existingProduct) {
          // Mise à jour du produit existant
          const { error: updateError } = await db
            .from('products')
            .update(productData)
            .eq('id', existingProduct.id);
            
          if (updateError) throw updateError;
        } else {
          // Insertion d'un nouveau produit
          const { error: insertError } = await db
            .from('products')
            .insert(productData);
            
          if (insertError) throw insertError;
        }
      } else {
        // Insertion directe (on a déjà filtré les existants)
        const { error: insertError } = await db
          .from('products')
          .insert(productData);
          
        if (insertError) throw insertError;
      }
      
      // Gestion des variations si l'option est activée
      if (options.includeVariations && product.variations && product.variations.length > 0) {
        callbacks.onStageChange(`Importation du produit ${i + 1}/${products.length}: ${product.name} - Traitement des variations`);
        
        // Récupérer les détails des variations
        try {
          const variations = await fetchProductVariations(product.id);
          
          // Pour chaque variation, créer un produit séparé
          for (const variation of variations) {
            // Construire un nom incluant les attributs
            const attributeText = variation.attributes
              .map((attr: any) => `${attr.option}`)
              .join(' - ');
              
            const variationName = attributeText ? `${name} - ${attributeText}` : name;
            
            // Préparer les données de la variation
            const variationData: ProductData = {
              name: variationName,
              brand,
              price: parsePrice(variation.price || product.price),
              monthly_price: calculateMonthlyPrice(parsePrice(variation.price || product.price)),
              image_url: (variation.image?.src || imageUrl || null),
              active: variation.stock_status === 'instock' || product.stock_status === 'instock'
            };
            
            if (schemaInfo.hasCategory) {
              variationData.category = category;
            }
            
            if (schemaInfo.hasDescription) {
              variationData.description = description;
            }
            
            // Vérifier si cette variation existe déjà
            const variationKey = `${brand}-${variationName}`.toLowerCase();
            if (!options.overwriteExisting && existingProducts[variationKey]) {
              continue; // Ignorer cette variation
            }
            
            // Insérer la variation comme produit distinct
            const { error: variationError } = await db
              .from('products')
              .insert(variationData);
            
            if (variationError) {
              console.error(`Error importing variation of "${product.name}":`, variationError);
            }
          }
        } catch (variationError) {
          console.error(`Error fetching variations for "${product.name}":`, variationError);
        }
      }
      
      importSuccess++;
    } catch (error) {
      console.error(`Error importing product ${product.name}:`, error);
      callbacks.onErrorMessage(`Erreur lors de l'importation de "${product.name}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      importErrors++;
    }
  }
  
  callbacks.onProgressUpdate(100);
  callbacks.onSuccess(importSuccess);
  callbacks.onError(importErrors);
  
  if (importSuccess > 0) {
    toast.success(`${importSuccess} produits importés avec succès`);
  }
  
  if (importErrors > 0) {
    toast.error(`${importErrors} erreurs lors de l'importation`);
  }
};

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

interface SchemaUpdateResult {
  success: boolean; 
  error?: string;
}

// Fix for the TypeScript errors - update the RPC call parameters structure
export const updateDatabaseSchema = async (): Promise<SchemaUpdateResult> => {
  try {
    // Utilisation du client admin qui permet de contourner les restrictions RLS
    // pour les opérations DDL (modification de schéma)
    
    // Adding console.log for debugging
    console.log('Starting schema update process...');
    
    // Fix: Pass parameters as a single object without nested p_ properties
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
    
    // Fix: Pass parameters as a single object without nested p_ properties
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
