import { supabase } from "@/integrations/supabase/client";
import { renameImageFile } from "@/utils/imageUtils";

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
