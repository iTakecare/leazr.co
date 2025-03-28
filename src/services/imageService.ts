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

/**
 * Télécharge et stocke une image dans un bucket Supabase
 * @param file Fichier image à télécharger
 * @param bucketName Nom du bucket (par défaut: 'images')
 * @param folderPath Chemin optionnel du dossier dans le bucket
 * @returns Information sur l'image téléchargée {url, path} ou null en cas d'erreur
 */
export const uploadImage = async (
  file: File, 
  bucketName: string = 'images', 
  folderPath: string = ''
): Promise<{url: string, path: string} | null> => {
  try {
    console.log(`Téléchargement d'image dans le bucket ${bucketName}/${folderPath}`);
    
    // Vérifier que le bucket existe
    const bucketExists = await ensureStorageBucket(bucketName);
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Le bucket de stockage n'a pas pu être créé`);
      return null;
    }
    
    // Extraire le nom du fichier et l'extension
    const fileName = file.name.replace(/\s+/g, '-');
    
    // Générer un nom unique avec timestamp
    const timestamp = Date.now();
    const fileNameWithoutExt = fileName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '-');
    const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const uniqueFileName = `${fileNameWithoutExt}-${timestamp}.${fileExt}`;
    
    // Construire le chemin complet
    const filePath = folderPath ? `${folderPath}/${uniqueFileName}` : uniqueFileName;
    
    // Déterminer le type MIME correct
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      mimeType = detectMimeTypeFromExtension(fileExt);
    }
    
    console.log(`Upload vers ${bucketName}/${filePath} avec type: ${mimeType}`);
    
    // Créer un FormData pour un meilleur contrôle du type de contenu
    const formData = new FormData();
    
    // Créer un nouveau Blob avec le type MIME explicite
    const blob = new Blob([await file.arrayBuffer()], { type: mimeType });
    formData.append('file', blob, uniqueFileName);
    
    // URL pour l'upload direct
    const uploadUrl = `${supabase.storageUrl}/object/${bucketName}/${filePath}`;
    
    // Upload via fetch pour un meilleur contrôle
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabase.supabaseKey}`,
        'x-upsert': 'true'
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erreur lors de l'upload (${response.status}): ${errorText}`);
      throw new Error(`Échec de l'upload: ${response.statusText}`);
    }
    
    // Obtenir l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    console.log(`Image téléchargée avec succès: ${publicUrlData.publicUrl}`);
    
    return {
      url: publicUrlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Erreur dans uploadImage:', error);
    toast.error(`Erreur lors du téléchargement de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return null;
  }
};

/**
 * Détecte le type MIME à partir de l'extension de fichier
 */
export const detectMimeTypeFromExtension = (extension: string): string => {
  switch (extension.toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    case 'bmp':
      return 'image/bmp';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
};

/**
 * Détecte le type MIME à partir des premiers octets du fichier (signature)
 */
export const detectMimeTypeFromSignature = async (file: File): Promise<string | null> => {
  try {
    const fileHeader = await readFileHeader(file, 12);
    
    // Signatures courantes pour les formats d'image
    if (fileHeader.startsWith('89504E47')) {
      return 'image/png';
    } else if (fileHeader.startsWith('FFD8FF')) {
      return 'image/jpeg';
    } else if (fileHeader.startsWith('47494638')) {
      return 'image/gif';
    } else if (fileHeader.startsWith('52494646') && fileHeader.substring(8, 16) === '57454250') {
      return 'image/webp';
    } else if (fileHeader.startsWith('25504446')) {
      return 'application/pdf';
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de la détection du type MIME:', error);
    return null;
  }
};

/**
 * Lit les premiers octets d'un fichier et les convertit en représentation hexadécimale
 */
const readFileHeader = async (file: File, bytes: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const arr = new Uint8Array(reader.result as ArrayBuffer);
      let hex = '';
      for (let i = 0; i < Math.min(bytes, arr.length); i++) {
        hex += arr[i].toString(16).padStart(2, '0').toUpperCase();
      }
      resolve(hex);
    };
    reader.onerror = () => reject(reader.error);
    const blob = file.slice(0, bytes);
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Détecte l'extension à partir du type MIME
 */
export const detectFileExtension = (mimeType: string): string => {
  switch (mimeType.toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    case 'image/bmp':
      return 'bmp';
    case 'application/pdf':
      return 'pdf';
    default:
      return 'bin';
  }
};
