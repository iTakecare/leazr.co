
import { supabase } from "@/integrations/supabase/client";
import { renameImageFile } from "@/utils/imageUtils";
import { Product, Brand, Category } from "@/types/catalog";
import { toast } from "sonner";

/**
 * Récupère toutes les images de produits
 */
export const getAllProductImages = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, images');

    if (error) {
      console.error("Erreur lors de la récupération des images de produits:", error);
      throw new Error(`Erreur lors de la récupération des images de produits: ${error.message}`);
    }

    const productImages: any[] = [];

    data.forEach(product => {
      if (product.images) {
        let images = Array.isArray(product.images) ? product.images : [];

        // Si le produit n'a pas d'images sous forme de tableau, essayer de le convertir
        if (!Array.isArray(product.images)) {
          try {
            images = JSON.parse(product.images);
            if (!Array.isArray(images)) {
              images = [];
            }
          } catch (e) {
            console.error('Erreur lors de la conversion des images:', e);
            images = [];
          }
        }

        images.forEach((image: any) => {
          let imageUrl = '';
          let imageName = '';
          let imageAlt = '';
          let isMain = false;

          if (typeof image === 'string') {
            imageUrl = image;
          } else if (image && image.url) {
            imageUrl = image.url;
            imageName = image.imageName || '';
            imageAlt = image.imageAlt || '';
            isMain = image.isMain || false;
          } else if (image && image.imageUrl) {
            imageUrl = image.imageUrl;
            imageName = image.imageName || '';
            imageAlt = image.imageAlt || '';
            isMain = image.isMain || false;
          }

          productImages.push({
            id: product.id,
            productId: product.id,
            productName: product.name,
            imageUrl: imageUrl,
            imageName: imageName,
            imageAlt: imageAlt,
            isMain: isMain
          });
        });
      }
    });

    return productImages;
  } catch (error: any) {
    console.error("Erreur lors de la récupération des images de produits:", error);
    throw error;
  }
};

/**
 * Met à jour les informations d'une image de produit
 */
export async function updateProductImage(params: {
  id: string; 
  imageData: {
    imageUrl: string;
    newName?: string;
    altText?: string;
  }
}): Promise<{ success: boolean; updatedImageUrl?: string; }> {
  try {
    const { id, imageData } = params;
    
    // Récupérer le produit
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('images')
      .eq('id', id)
      .single();
    
    if (productError) {
      console.error('Erreur lors de la récupération du produit:', productError);
      throw new Error(`Erreur lors de la récupération du produit: ${productError.message}`);
    }
    
    // Vérifier si product.images est défini
    if (!product || !product.images) {
      throw new Error('Le produit ou ses images sont indéfinis');
    }
    
    let images = Array.isArray(product.images) ? product.images : [];
    
    // Si le produit n'a pas d'images sous forme de tableau, essayer de le convertir
    if (!Array.isArray(product.images)) {
      try {
        images = JSON.parse(product.images);
        if (!Array.isArray(images)) {
          images = [];
        }
      } catch (e) {
        console.error('Erreur lors de la conversion des images:', e);
        images = [];
      }
    }
    
    // Chercher l'image à mettre à jour
    const imageToUpdateIndex = images.findIndex((img: any) => {
      // Vérifier les différents formats possibles d'URL d'image
      if (typeof img === 'string') {
        return img === imageData.imageUrl;
      } else if (img && img.url) {
        return img.url === imageData.imageUrl;
      } else if (img && img.imageUrl) {
        return img.imageUrl === imageData.imageUrl;
      }
      return false;
    });
    
    if (imageToUpdateIndex === -1) {
      throw new Error('Image non trouvée dans le produit');
    }
    
    let updatedImageUrl: string | undefined;
    
    // Renommer le fichier si un nouveau nom est fourni
    if (imageData.newName) {
      const newImageUrl = await renameImageFile(imageData.imageUrl, imageData.newName);
      
      if (newImageUrl) {
        // Mettre à jour l'URL de l'image dans le tableau
        if (typeof images[imageToUpdateIndex] === 'string') {
          images[imageToUpdateIndex] = newImageUrl;
        } else if (images[imageToUpdateIndex] && typeof images[imageToUpdateIndex] === 'object') {
          if ('url' in images[imageToUpdateIndex]) {
            images[imageToUpdateIndex].url = newImageUrl;
          } else if ('imageUrl' in images[imageToUpdateIndex]) {
            images[imageToUpdateIndex].imageUrl = newImageUrl;
          }
        }
        updatedImageUrl = newImageUrl;
      } else {
        throw new Error('Échec du renommage du fichier');
      }
    }
    
    // Mettre à jour le texte alternatif si fourni
    if (imageData.altText !== undefined && typeof images[imageToUpdateIndex] === 'object') {
      images[imageToUpdateIndex].imageAlt = imageData.altText;
    }
    
    // Mettre à jour la propriété imageName si nécessaire
    if (imageData.newName && typeof images[imageToUpdateIndex] === 'object') {
      images[imageToUpdateIndex].imageName = imageData.newName;
    }
    
    // Mettre à jour le produit avec les nouvelles images
    const { error: updateError } = await supabase
      .from('products')
      .update({ images: images })
      .eq('id', id);
    
    if (updateError) {
      console.error('Erreur lors de la mise à jour du produit:', updateError);
      throw new Error(`Erreur lors de la mise à jour du produit: ${updateError.message}`);
    }
    
    return { 
      success: true,
      updatedImageUrl
    };
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'image du produit:', error);
    throw error;
  }
}

/**
 * Récupère tous les produits avec filtres optionnels
 */
export const getProducts = async (
  options: { 
    category?: string; 
    brand?: string; 
    includeVariants?: boolean; 
    includeAdminOnly?: boolean; 
    limit?: number;
    search?: string;
  } = {}
): Promise<Product[]> => {
  try {
    let query = supabase.from('products').select('*');

    // Appliquer les filtres
    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.brand) {
      query = query.eq('brand', options.brand);
    }

    // Exclure les produits admin_only par défaut, sauf si spécifié
    if (!options.includeAdminOnly) {
      query = query.is('admin_only', false);
    }

    // Recherche
    if (options.search) {
      query = query.ilike('name', `%${options.search}%`);
    }

    // Limite
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Exécuter la requête
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des produits:", error);
      throw new Error(`Erreur lors de la récupération des produits: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des produits:", error);
    throw error;
  }
};

/**
 * Récupère un produit par son ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Erreur lors de la récupération du produit ${id}:`, error);
      throw new Error(`Erreur lors de la récupération du produit: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Erreur lors de la récupération du produit ${id}:`, error);
    throw error;
  }
};

/**
 * Crée un nouveau produit
 */
export const createProduct = async (productData: Partial<Product>): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la création du produit:", error);
      throw new Error(`Erreur lors de la création du produit: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la création du produit:", error);
    throw error;
  }
};

/**
 * Met à jour un produit existant
 */
export const updateProduct = async (id: string, updateData: Partial<Product>): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erreur lors de la mise à jour du produit ${id}:`, error);
      throw new Error(`Erreur lors de la mise à jour du produit: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du produit ${id}:`, error);
    throw error;
  }
};

/**
 * Supprime un produit
 */
export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Erreur lors de la suppression du produit ${id}:`, error);
      throw new Error(`Erreur lors de la suppression du produit: ${error.message}`);
    }
  } catch (error) {
    console.error(`Erreur lors de la suppression du produit ${id}:`, error);
    throw error;
  }
};

/**
 * Télécharge une image de produit
 */
export const uploadProductImage = async (file: File, productId: string): Promise<string> => {
  try {
    // Générer un nom de fichier unique
    const timestamp = new Date().getTime();
    const fileName = `product_${productId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    
    // Télécharger l'image vers Supabase Storage
    const { data, error } = await supabase.storage
      .from('products')
      .upload(`images/${fileName}`, file);

    if (error) {
      console.error("Erreur lors du téléversement de l'image:", error);
      throw new Error(`Erreur lors du téléversement de l'image: ${error.message}`);
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from('products')
      .getPublicUrl(`images/${fileName}`);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Erreur lors du téléversement de l'image:", error);
    throw error;
  }
};

/**
 * Récupère toutes les marques
 */
export const getBrands = async (): Promise<Brand[]> => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');

    if (error) {
      console.error("Erreur lors de la récupération des marques:", error);
      throw new Error(`Erreur lors de la récupération des marques: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des marques:", error);
    throw error;
  }
};

/**
 * Ajoute une nouvelle marque
 */
export const addBrand = async (brandData: { name: string; translation: string }): Promise<Brand> => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .insert([brandData])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de l'ajout de la marque:", error);
      throw new Error(`Erreur lors de l'ajout de la marque: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la marque:", error);
    throw error;
  }
};

/**
 * Met à jour une marque existante
 */
export const updateBrand = async (params: { 
  originalName: string; 
  name: string; 
  translation: string 
}): Promise<Brand> => {
  try {
    const { originalName, name, translation } = params;
    
    const { data, error } = await supabase
      .from('brands')
      .update({ name, translation })
      .eq('name', originalName)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour de la marque:", error);
      throw new Error(`Erreur lors de la mise à jour de la marque: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la marque:", error);
    throw error;
  }
};

/**
 * Supprime une marque
 */
export const deleteBrand = async (params: { name: string }): Promise<void> => {
  try {
    const { name } = params;
    
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('name', name);

    if (error) {
      console.error("Erreur lors de la suppression de la marque:", error);
      throw new Error(`Erreur lors de la suppression de la marque: ${error.message}`);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la marque:", error);
    throw error;
  }
};

/**
 * Récupère toutes les catégories
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error("Erreur lors de la récupération des catégories:", error);
      throw new Error(`Erreur lors de la récupération des catégories: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    throw error;
  }
};

/**
 * Ajoute une nouvelle catégorie
 */
export const addCategory = async (categoryData: { name: string; translation: string }): Promise<Category> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de l'ajout de la catégorie:", error);
      throw new Error(`Erreur lors de l'ajout de la catégorie: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la catégorie:", error);
    throw error;
  }
};

/**
 * Met à jour une catégorie existante
 */
export const updateCategory = async (params: { 
  originalName: string; 
  name: string; 
  translation: string 
}): Promise<Category> => {
  try {
    const { originalName, name, translation } = params;
    
    const { data, error } = await supabase
      .from('categories')
      .update({ name, translation })
      .eq('name', originalName)
      .select()
      .single();

    if (error) {
      console.error("Erreur lors de la mise à jour de la catégorie:", error);
      throw new Error(`Erreur lors de la mise à jour de la catégorie: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la catégorie:", error);
    throw error;
  }
};

/**
 * Supprime une catégorie
 */
export const deleteCategory = async (params: { name: string }): Promise<void> => {
  try {
    const { name } = params;
    
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', name);

    if (error) {
      console.error("Erreur lors de la suppression de la catégorie:", error);
      throw new Error(`Erreur lors de la suppression de la catégorie: ${error.message}`);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la catégorie:", error);
    throw error;
  }
};

/**
 * Duplique un produit
 */
export const duplicateProduct = async (productId: string): Promise<Product> => {
  try {
    // 1. Récupérer le produit à dupliquer
    const { data: originalProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !originalProduct) {
      console.error("Erreur lors de la récupération du produit à dupliquer:", fetchError);
      throw new Error(`Erreur lors de la récupération du produit: ${fetchError?.message || 'Produit non trouvé'}`);
    }

    // 2. Préparer les données du produit dupliqué
    const duplicatedProductData = {
      ...originalProduct,
      id: undefined, // L'ID sera généré automatiquement
      name: `${originalProduct.name} (copy)`,
      created_at: undefined, // Ces champs seront générés automatiquement
      updated_at: undefined
    };

    // 3. Créer le nouveau produit
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert([duplicatedProductData])
      .select()
      .single();

    if (insertError || !newProduct) {
      console.error("Erreur lors de la duplication du produit:", insertError);
      throw new Error(`Erreur lors de la duplication du produit: ${insertError?.message || 'Création échouée'}`);
    }

    return newProduct;
  } catch (error) {
    console.error("Erreur lors de la duplication du produit:", error);
    throw error;
  }
};

/**
 * Ajoute un produit (alias pour createProduct pour compatibilité)
 */
export const addProduct = createProduct;

/**
 * Convertit un produit standard en produit parent
 */
export const convertProductToParent = async (id: string): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update({ is_parent: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Erreur lors de la conversion du produit ${id} en parent:`, error);
      throw new Error(`Erreur lors de la conversion: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error(`Erreur lors de la conversion du produit ${id} en parent:`, error);
    throw error;
  }
};

/**
 * Trouve une variante de produit en fonction de ses attributs
 */
export const findVariantByAttributes = async (
  productId: string, 
  attributes: Record<string, string | number | boolean>
): Promise<Product | null> => {
  try {
    // D'abord récupérer le produit parent pour obtenir ses variantes
    const { data: parentProduct, error: parentError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (parentError) {
      console.error(`Erreur lors de la récupération du produit parent ${productId}:`, parentError);
      throw new Error(`Erreur: ${parentError.message}`);
    }

    if (!parentProduct.is_parent) {
      throw new Error("Ce produit n'est pas un produit parent");
    }

    // Ensuite récupérer toutes les variantes associées à ce parent
    const { data: variants, error: variantsError } = await supabase
      .from('products')
      .select('*')
      .eq('parent_id', productId);

    if (variantsError) {
      console.error(`Erreur lors de la récupération des variantes pour ${productId}:`, variantsError);
      throw new Error(`Erreur: ${variantsError.message}`);
    }

    // Comparer les attributs pour trouver la variante correspondante
    const matchingVariant = variants.find(variant => {
      if (!variant.attributes) return false;

      // Vérifier si tous les attributs fournis correspondent
      for (const [key, value] of Object.entries(attributes)) {
        if (variant.attributes[key] !== value) {
          return false;
        }
      }
      return true;
    });

    return matchingVariant || null;
  } catch (error) {
    console.error("Erreur lors de la recherche de variante:", error);
    throw error;
  }
};
