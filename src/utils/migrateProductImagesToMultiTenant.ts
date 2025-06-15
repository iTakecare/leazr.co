
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MigrationResult {
  success: boolean;
  migratedFiles: number;
  updatedProducts: number;
  errors: string[];
}

/**
 * Migre les images de produits vers la structure multi-tenant
 */
export const migrateProductImagesToMultiTenant = async (targetCompanyId: string): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    migratedFiles: 0,
    updatedProducts: 0,
    errors: []
  };

  try {
    console.log("=== DÉBUT MIGRATION MULTI-TENANT ===");
    console.log("Entreprise cible:", targetCompanyId);

    // 1. Lister tous les fichiers dans le bucket product-images
    const { data: files, error: listError } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });

    if (listError) {
      result.errors.push(`Erreur lors du listage des fichiers: ${listError.message}`);
      return result;
    }

    if (!files || files.length === 0) {
      console.log("Aucun fichier trouvé dans product-images");
      result.success = true;
      return result;
    }

    console.log(`Trouvé ${files.length} fichiers à migrer`);

    // 2. Filtrer les fichiers qui ne sont pas déjà dans une structure multi-tenant
    const filesToMigrate = files.filter(file => 
      !file.name.startsWith('company-') && 
      !file.name.startsWith('.') && 
      file.name !== '.emptyFolderPlaceholder'
    );

    console.log(`${filesToMigrate.length} fichiers à migrer vers la structure multi-tenant`);

    // 3. Migrer chaque fichier
    for (const file of filesToMigrate) {
      try {
        console.log(`Migration du fichier: ${file.name}`);

        // Télécharger le fichier existant
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('product-images')
          .download(file.name);

        if (downloadError) {
          result.errors.push(`Erreur téléchargement ${file.name}: ${downloadError.message}`);
          continue;
        }

        // Nouveau chemin avec structure multi-tenant
        const newPath = `company-${targetCompanyId}/${file.name}`;

        // Uploader vers le nouveau chemin
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(newPath, fileData, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) {
          result.errors.push(`Erreur upload ${newPath}: ${uploadError.message}`);
          continue;
        }

        // Supprimer l'ancien fichier
        const { error: deleteError } = await supabase.storage
          .from('product-images')
          .remove([file.name]);

        if (deleteError) {
          result.errors.push(`Erreur suppression ${file.name}: ${deleteError.message}`);
          // Continuer quand même, le fichier a été copié
        }

        console.log(`✅ Fichier migré: ${file.name} -> ${newPath}`);
        result.migratedFiles++;

        // 4. Mettre à jour les références dans la base de données
        const oldUrl = supabase.storage.from('product-images').getPublicUrl(file.name).data.publicUrl;
        const newUrl = supabase.storage.from('product-images').getPublicUrl(newPath).data.publicUrl;

        // Mettre à jour les produits qui référencent cette image
        const { data: productsToUpdate, error: selectError } = await supabase
          .from('products')
          .select('id, image_url')
          .eq('company_id', targetCompanyId)
          .or(`image_url.eq.${oldUrl},image_url.like.%${file.name}%`);

        if (selectError) {
          result.errors.push(`Erreur recherche produits pour ${file.name}: ${selectError.message}`);
          continue;
        }

        if (productsToUpdate && productsToUpdate.length > 0) {
          for (const product of productsToUpdate) {
            const { error: updateError } = await supabase
              .from('products')
              .update({ 
                image_url: newUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', product.id);

            if (updateError) {
              result.errors.push(`Erreur mise à jour produit ${product.id}: ${updateError.message}`);
            } else {
              console.log(`✅ Produit mis à jour: ${product.id}`);
              result.updatedProducts++;
            }
          }
        }

      } catch (error) {
        result.errors.push(`Erreur générale pour ${file.name}: ${error}`);
        console.error(`Erreur migration ${file.name}:`, error);
      }
    }

    console.log("=== MIGRATION TERMINÉE ===");
    console.log(`Fichiers migrés: ${result.migratedFiles}`);
    console.log(`Produits mis à jour: ${result.updatedProducts}`);
    console.log(`Erreurs: ${result.errors.length}`);

    result.success = result.errors.length === 0 || result.migratedFiles > 0;
    return result;

  } catch (error) {
    console.error("Erreur générale de migration:", error);
    result.errors.push(`Erreur générale: ${error}`);
    return result;
  }
};

/**
 * Obtient l'ID de l'entreprise iTakecare
 */
export const getITakecareCompanyId = async (): Promise<string | null> => {
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name')
      .ilike('name', '%itakecare%')
      .limit(1);

    if (error) {
      console.error("Erreur recherche iTakecare:", error);
      return null;
    }

    if (companies && companies.length > 0) {
      return companies[0].id;
    }

    // Si pas trouvé par nom, essayer de trouver la première entreprise
    const { data: firstCompany, error: firstError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);

    if (firstError || !firstCompany || firstCompany.length === 0) {
      console.error("Aucune entreprise trouvée");
      return null;
    }

    console.log(`Utilisation de l'entreprise: ${firstCompany[0].name} (${firstCompany[0].id})`);
    return firstCompany[0].id;

  } catch (error) {
    console.error("Erreur générale:", error);
    return null;
  }
};
