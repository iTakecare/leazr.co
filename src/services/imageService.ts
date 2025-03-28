
/**
 * Service pour gérer le téléchargement et la manipulation d'images
 */
import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "./storageService";
import { toast } from "sonner";

export const uploadProductImage = async (file: File, productId: string, isMainImage = false) => {
  try {
    console.log(`Début du téléchargement d'image pour le produit ${productId} (image principale: ${isMainImage})`);
    
    // Vérifier le bucket
    const bucketName = 'product-images';
    const bucketReady = await ensureStorageBucket(bucketName);
    
    if (!bucketReady) {
      toast.error("Erreur lors de la préparation du stockage des images");
      throw new Error(`Impossible de créer ou vérifier le bucket ${bucketName}`);
    }
    
    // Créer la structure de dossier basée sur l'ID du produit
    const productFolder = `${productId}`;
    
    // Générer un nom de fichier unique avec timestamp pour éviter les conflits
    const timestamp = new Date().getTime();
    const fileName = file.name.replace(/\s+/g, '-');
    const uniqueFileName = `${timestamp}-${fileName}`;
    const filePath = `${productFolder}/${uniqueFileName}`;
    
    // Déterminer le bon type MIME
    let mimeType = '';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (fileExt) {
      case 'jpg':
      case 'jpeg':
        mimeType = 'image/jpeg';
        break;
      case 'png':
        mimeType = 'image/png';
        break;
      case 'gif':
        mimeType = 'image/gif';
        break;
      case 'webp':
        mimeType = 'image/webp';
        break;
      case 'svg':
        mimeType = 'image/svg+xml';
        break;
      default:
        mimeType = file.type || 'image/jpeg';
    }
    
    console.log(`Upload vers: ${filePath} avec type: ${mimeType}`);
    
    // Créer un blob avec le type correct
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: mimeType });
    
    // Upload direct avec fetch pour un meilleur contrôle
    const url = `${supabase.storageUrl}/object/${bucketName}/${filePath}`;
    const formData = new FormData();
    formData.append('file', blob);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabase.supabaseKey}`,
        'x-upsert': 'true'
      },
      body: formData
    });
    
    if (!response.ok) {
      console.error('Réponse d\'erreur:', await response.text());
      toast.error(`Échec de l'upload: ${response.statusText}`);
      throw new Error(`Échec de l'upload: ${response.status} ${response.statusText}`);
    }
    
    // Obtenir l'URL publique
    const { data: publicURL } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log(`Image téléchargée avec succès: ${publicURL.publicUrl}`);
    
    // Mise à jour du produit avec l'URL de l'image
    if (isMainImage) {
      await supabase.from('products').update({
        image_url: publicURL.publicUrl
      }).eq('id', productId);
    } else {
      // Récupérer les URLs d'images existantes
      const { data: product } = await supabase.from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();
      
      let imageUrls = product?.image_urls || [];
      if (!Array.isArray(imageUrls)) {
        imageUrls = [];
      }
      
      // Ajouter la nouvelle URL
      await supabase.from('products').update({
        image_urls: [...imageUrls, publicURL.publicUrl]
      }).eq('id', productId);
    }
    
    toast.success("Image téléchargée avec succès");
    return publicURL.publicUrl;
  } catch (error) {
    console.error('Erreur dans uploadProductImage:', error);
    toast.error(`Erreur lors du téléchargement de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

// Exporter d'autres fonctions existantes pour maintenir la compatibilité
export const reorderProductImages = async (
  productId: string, 
  imageUrls: string[],
  mainImageUrl?: string
): Promise<boolean> => {
  try {
    // Filtrer les URLs vides ou nulles
    const validImageUrls = imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
    
    // Préparer les mises à jour
    const updates: {
      image_url?: string;
      image_urls?: string[];
    } = {
      image_urls: validImageUrls
    };
    
    if (mainImageUrl) {
      updates.image_url = mainImageUrl;
    }
    
    // Mise à jour du produit
    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
    
    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError);
      throw new Error(`Échec de la réorganisation des images: ${updateError.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur dans reorderProductImages:', error);
    toast.error(`Erreur lors de la réorganisation des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

export const setMainProductImage = async (productId: string, imageUrl: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', productId);
    
    if (error) {
      throw new Error(`Échec de la définition de l'image principale: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur dans setMainProductImage:', error);
    toast.error(`Erreur lors de la définition de l'image principale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

export const removeProductImage = async (productId: string, imageUrl: string): Promise<boolean> => {
  try {
    // Récupérer les données du produit
    const { data: product } = await supabase
      .from('products')
      .select('image_url, image_urls')
      .eq('id', productId)
      .single();
    
    if (!product) {
      throw new Error('Échec de la récupération des données du produit');
    }
    
    // Vérifier si c'est l'image principale
    const isMainImage = product.image_url === imageUrl;
    
    // Filtrer les images
    let updatedImageUrls = (product.image_urls || []).filter(url => url !== imageUrl);
    
    const updates: {
      image_url?: string | null;
      image_urls: string[];
    } = {
      image_urls: updatedImageUrls
    };
    
    // Si c'était l'image principale, définir une nouvelle
    if (isMainImage) {
      updates.image_url = updatedImageUrls.length > 0 ? updatedImageUrls[0] : null;
    }
    
    // Mise à jour du produit
    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
    
    if (updateError) {
      throw new Error(`Échec de la suppression de l'image: ${updateError.message}`);
    }
    
    // Essayer de supprimer le fichier physique
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'product-images');
      
      if (bucketIndex >= 0 && bucketIndex + 2 < pathParts.length) {
        const folderPath = pathParts[bucketIndex + 1];
        const fileName = pathParts[bucketIndex + 2];
        
        if (fileName && folderPath) {
          await supabase.storage
            .from('product-images')
            .remove([`${folderPath}/${fileName}`]);
        }
      }
    } catch (parseError) {
      console.warn('Impossible de parser l\'URL pour la suppression physique:', parseError);
    }
    
    return true;
  } catch (error) {
    console.error('Erreur dans removeProductImage:', error);
    toast.error(`Erreur lors de la suppression de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

export const fetchProductImages = async (productId: string): Promise<{mainImage: string | null, additionalImages: string[]}> => {
  try {
    // Récupérer les données du produit
    const { data: product } = await supabase
      .from('products')
      .select('image_url, image_urls')
      .eq('id', productId)
      .single();
    
    if (!product) {
      return { mainImage: null, additionalImages: [] };
    }
    
    // Valider l'image principale
    const mainImage = product.image_url || null;
    
    // Valider les images supplémentaires
    let additionalImages: string[] = [];
    if (Array.isArray(product.image_urls)) {
      additionalImages = product.image_urls.filter(url => url && typeof url === 'string' && url.trim() !== '' && url !== mainImage);
    }
    
    return { mainImage, additionalImages };
  } catch (error) {
    console.error('Erreur dans fetchProductImages:', error);
    toast.error(`Erreur lors de la récupération des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};
