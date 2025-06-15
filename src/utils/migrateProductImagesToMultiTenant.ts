
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

    // 1. Vérifier que le bucket existe et est accessible
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      result.errors.push(`Erreur lors de la vérification des buckets: ${bucketsError.message}`);
      return result;
    }
    
    const productImagesBucket = buckets?.find(bucket => bucket.id === 'product-images');
    if (!productImagesBucket) {
      result.errors.push('Le bucket product-images n\'existe pas');
      return result;
    }

    // 2. Lister tous les fichiers dans le bucket product-images
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

    console.log(`Trouvé ${files.length} fichiers à examiner`);

    // 3. Filtrer les fichiers qui ne sont pas déjà dans une structure multi-tenant
    const filesToMigrate = files.filter(file => 
      !file.name.startsWith('company-') && 
      !file.name.startsWith('.') && 
      file.name !== '.emptyFolderPlaceholder' &&
      file.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) // Seulement les images
    );

    console.log(`${filesToMigrate.length} fichiers d'images à migrer vers la structure multi-tenant`);

    if (filesToMigrate.length === 0) {
      console.log("Aucun fichier à migrer - la structure multi-tenant est déjà en place");
      result.success = true;
      return result;
    }

    // 4. Migrer chaque fichier
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

        // Vérifier si le fichier de destination existe déjà
        const { data: existingFile, error: existingError } = await supabase.storage
          .from('product-images')
          .download(newPath);

        if (existingFile && !existingError) {
          console.log(`Le fichier ${newPath} existe déjà, on passe au suivant`);
          result.migratedFiles++;
          continue;
        }

        // Uploader vers le nouveau chemin
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(newPath, fileData, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.metadata?.mimetype || 'image/jpeg'
          });

        if (uploadError) {
          result.errors.push(`Erreur upload ${newPath}: ${uploadError.message}`);
          continue;
        }

        // Vérifier que l'upload a bien fonctionné
        const { data: verifyData, error: verifyError } = await supabase.storage
          .from('product-images')
          .download(newPath);

        if (verifyError || !verifyData) {
          result.errors.push(`Erreur vérification upload ${newPath}: ${verifyError?.message || 'Fichier introuvable'}`);
          continue;
        }

        // Supprimer l'ancien fichier seulement si l'upload a réussi
        const { error: deleteError } = await supabase.storage
          .from('product-images')
          .remove([file.name]);

        if (deleteError) {
          result.errors.push(`Erreur suppression ${file.name}: ${deleteError.message}`);
          // Continuer quand même, le fichier a été copié
        }

        console.log(`✅ Fichier migré: ${file.name} -> ${newPath}`);
        result.migratedFiles++;

        // 5. Mettre à jour les références dans la base de données
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
    // D'abord essayer de récupérer l'entreprise de l'utilisateur connecté
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!profileError && userProfile?.company_id) {
        console.log(`Utilisation de l'entreprise de l'utilisateur: ${userProfile.company_id}`);
        return userProfile.company_id;
      }
    }

    // Sinon, chercher iTakecare par nom
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
      console.log(`Entreprise iTakecare trouvée: ${companies[0].name} (${companies[0].id})`);
      return companies[0].id;
    }

    // Si pas trouvé par nom, essayer de trouver la première entreprise active
    const { data: firstCompany, error: firstError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);

    if (firstError || !firstCompany || firstCompany.length === 0) {
      console.error("Aucune entreprise active trouvée");
      return null;
    }

    console.log(`Utilisation de la première entreprise active: ${firstCompany[0].name} (${firstCompany[0].id})`);
    return firstCompany[0].id;

  } catch (error) {
    console.error("Erreur générale:", error);
    return null;
  }
};
