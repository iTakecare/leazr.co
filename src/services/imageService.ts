/**
 * Service pour gérer le téléchargement et la manipulation d'images
 */
import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "./storageService";
import { toast } from "sonner";

export const uploadProductImage = async (file: File, productId: string, isMainImage = false) => {
  try {
    console.log(`Début du téléchargement d'image pour le produit ${productId} (image principale: ${isMainImage})`);
    
    // Vérifier d'abord si le bucket existe
    const bucketName = 'product-images';
    
    // Vérifier le bucket avec plusieurs tentatives si nécessaire
    let bucketReady = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!bucketReady && attempts < maxAttempts) {
      attempts++;
      console.log(`Tentative ${attempts}/${maxAttempts} de vérification du bucket ${bucketName}`);
      
      bucketReady = await ensureStorageBucket(bucketName);
      
      if (!bucketReady) {
        console.warn(`Échec de la tentative ${attempts}/${maxAttempts} de vérification/création du bucket`);
        // Attendre un peu avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!bucketReady) {
      console.error(`Le bucket ${bucketName} n'existe pas ou n'a pas pu être créé après ${maxAttempts} tentatives`);
      toast.error("Erreur lors de la préparation du stockage des images");
      throw new Error(`Impossible de créer ou vérifier le bucket ${bucketName}`);
    }
    
    console.log(`Bucket ${bucketName} vérifié et prêt pour l'upload`);
    
    // Créer la structure de dossier basée sur l'ID du produit
    const productFolder = `${productId}`;
    
    // Générer un nom de fichier unique avec timestamp pour éviter les conflits
    const timestamp = new Date().getTime();
    const fileName = file.name.replace(/\s+/g, '-');
    
    // Extraire l'extension de fichier correcte
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    
    // Assurer un nom de fichier avec l'extension correcte
    const uniqueFileName = `${timestamp}-${fileName}`;
    
    // Déterminer le nom de fichier
    const filePath = `${productFolder}/${uniqueFileName}`;
    
    console.log(`Téléchargement de l'image vers: ${filePath} dans le bucket ${bucketName}`);
    
    // Vérifier si le fichier existe déjà
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from(bucketName)
        .list(productFolder);
      
      if (listError) {
        console.warn(`Erreur lors de la vérification des fichiers existants: ${listError.message}`);
        // On continue malgré l'erreur
      } else if (existingFiles) {
        // Si c'est l'image principale et qu'il y en a une existante, la supprimer
        if (isMainImage) {
          const mainFiles = existingFiles.filter(f => f.name.toLowerCase().includes('main'));
          for (const mainFile of mainFiles) {
            console.log(`Suppression de l'ancienne image principale: ${productFolder}/${mainFile.name}`);
            await supabase.storage
              .from(bucketName)
              .remove([`${productFolder}/${mainFile.name}`]);
          }
        }
      }
    } catch (listError) {
      console.warn(`Exception lors de la vérification des fichiers existants, on continue: ${listError}`);
      // Non bloquant, on continue
    }
    
    // Déterminer le bon type MIME en fonction de l'extension
    let contentType = '';
    
    // Force la détection du MIME type à partir de l'extension ou du contenu
    if (file.type && file.type !== 'application/json' && file.type !== 'application/octet-stream') {
      // Si le type est déjà correctement défini, l'utiliser
      contentType = file.type;
    } else {
      // Détecter à partir de l'extension
      switch (fileExtension) {
        case 'jpg':
        case 'jpeg':
          contentType = 'image/jpeg';
          break;
        case 'png':
          contentType = 'image/png';
          break;
        case 'gif':
          contentType = 'image/gif';
          break;
        case 'webp':
          contentType = 'image/webp';
          break;
        case 'svg':
          contentType = 'image/svg+xml';
          break;
        default:
          contentType = `image/${fileExtension || 'jpeg'}`;
      }
    }
    
    console.log(`Type de contenu détecté pour le fichier: ${contentType}`);
    
    // Convertir le fichier en ArrayBuffer pour créer un nouveau Blob avec le type correct
    const fileBuffer = await file.arrayBuffer();
    const correctBlob = new Blob([fileBuffer], { type: contentType });
    
    // Utiliser upload directs pour éviter les problèmes de duplication
    let uploadResult = await supabase.storage
      .from(bucketName)
      .upload(filePath, correctBlob, {
        contentType,
        upsert: false  // Ne pas écraser si existe déjà
      });
    
    let resultFilePath = filePath;
    
    if (uploadResult.error) {
      if (uploadResult.error.message.includes('The resource already exists')) {
        console.warn("L'image existe déjà, génération d'un nouveau nom de fichier");
        // Générer un nouveau nom avec un timestamp plus précis
        const preciseTimestamp = new Date().getTime() + Math.floor(Math.random() * 1000);
        const newFilePath = `${productFolder}/${preciseTimestamp}-${fileName}`;
        
        const retryResult = await supabase.storage
          .from(bucketName)
          .upload(newFilePath, correctBlob, {
            contentType,
            upsert: false
          });
        
        if (retryResult.error) {
          console.error('Erreur lors de la seconde tentative d\'upload:', retryResult.error);
          toast.error(`Échec de l'upload: ${retryResult.error.message}`);
          throw new Error(retryResult.error.message);
        }
        
        uploadResult = retryResult;
        resultFilePath = newFilePath;
      } else {
        console.error('Erreur détaillée lors du téléchargement de l\'image:', uploadResult.error);
        toast.error(`Erreur lors du téléchargement: ${uploadResult.error.message}`);
        throw new Error(uploadResult.error.message);
      }
    }
    
    // Get public URL
    const { data: publicURL } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadResult.data?.path || resultFilePath);
    
    console.log(`Image téléchargée avec succès: ${publicURL.publicUrl}`);
    
    // Update product with image URL
    if (isMainImage) {
      const { error: updateError } = await supabase.from('products').update({
        image_url: publicURL.publicUrl
      }).eq('id', productId);
      
      if (updateError) {
        console.error(`Erreur lors de la mise à jour de l'image principale dans la base de données:`, updateError);
        toast.error("L'image a été téléchargée mais non enregistrée dans la base de données");
      } else {
        console.log(`Image principale mise à jour pour le produit ${productId}`);
      }
    } else {
      // Get current image_urls array
      const { data: product, error: fetchError } = await supabase.from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();
      
      if (fetchError) {
        console.error(`Erreur lors de la récupération des URLs d'images existantes:`, fetchError);
        toast.error("L'image a été téléchargée mais non enregistrée dans la base de données");
      } else {
        let imageUrls = product?.image_urls || [];
        if (!Array.isArray(imageUrls)) {
          imageUrls = [];
        }
        
        // Filtrer les URLs vides ou nulles avant d'ajouter la nouvelle
        imageUrls = imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
        
        // Add new URL and update
        const { error: updateError } = await supabase.from('products').update({
          image_urls: [...imageUrls, publicURL.publicUrl]
        }).eq('id', productId);
        
        if (updateError) {
          console.error(`Erreur lors de la mise à jour des URLs d'images:`, updateError);
          toast.error("L'image a ��té téléchargée mais non enregistrée dans la base de données");
        } else {
          console.log(`Image secondaire ajoutée pour le produit ${productId}`);
        }
      }
    }
    
    return publicURL.publicUrl;
  } catch (error) {
    console.error('Erreur dans uploadProductImage:', error);
    toast.error(`Erreur lors du téléchargement de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

// Fonction pour déterminer l'extension de fichier à partir du MIME type
function getExtensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'jpg'; // extension par défaut
  }
}

// Fonction utilitaire pour lire un fichier sous forme de texte
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Échec de la lecture du fichier"));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// Fonction pour réorganiser les images d'un produit
export const reorderProductImages = async (
  productId: string, 
  imageUrls: string[],
  mainImageUrl?: string
): Promise<boolean> => {
  try {
    console.log(`Réorganisation des images pour le produit ${productId}`);
    
    // Filtrer les URLs vides ou nulles
    const validImageUrls = imageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
    
    // Préparer les mises à jour
    const updates: {
      image_url?: string;
      image_urls?: string[];
    } = {
      image_urls: validImageUrls
    };
    
    // Si une nouvelle image principale est spécifiée, la définir
    if (mainImageUrl) {
      updates.image_url = mainImageUrl;
    }
    
    // Mise à jour du produit
    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
    
    if (updateError) {
      console.error('Erreur lors de la mise à jour de l\'ordre des images:', updateError);
      throw new Error(`Échec de la réorganisation des images: ${updateError.message}`);
    }
    
    console.log('Images réorganisées avec succès pour le produit:', productId);
    return true;
  } catch (error) {
    console.error('Erreur dans reorderProductImages:', error);
    toast.error(`Erreur lors de la réorganisation des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

// Fonction pour définir l'image principale d'un produit
export const setMainProductImage = async (productId: string, imageUrl: string): Promise<boolean> => {
  try {
    console.log(`Définition de l'image principale pour le produit ${productId}:`, imageUrl);
    
    const { error } = await supabase
      .from('products')
      .update({ image_url: imageUrl })
      .eq('id', productId);
    
    if (error) {
      console.error(`Erreur lors de la définition de l'image principale:`, error);
      throw new Error(`Échec de la définition de l'image principale: ${error.message}`);
    }
    
    console.log(`Image principale mise à jour avec succès pour le produit ${productId}`);
    return true;
  } catch (error) {
    console.error('Erreur dans setMainProductImage:', error);
    toast.error(`Erreur lors de la définition de l'image principale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

// Fonction pour supprimer une image d'un produit
export const removeProductImage = async (productId: string, imageUrl: string): Promise<boolean> => {
  try {
    console.log(`Suppression de l'image pour le produit ${productId}:`, imageUrl);
    
    // Récupérer d'abord le produit pour obtenir les URLs d'images actuelles
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('image_url, image_urls')
      .eq('id', productId)
      .single();
    
    if (fetchError || !product) {
      console.error('Erreur lors de la récupération des données du produit:', fetchError);
      throw new Error('Échec de la récupération des données du produit');
    }
    
    // Vérifier si c'est l'image principale
    const isMainImage = product.image_url === imageUrl;
    
    // Filtrer les images pour retirer celle à supprimer
    let updatedImageUrls = (product.image_urls || []).filter(url => url !== imageUrl);
    
    // Filtrer les URLs vides ou nulles
    updatedImageUrls = updatedImageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
    
    const updates: {
      image_url?: string | null;
      image_urls: string[];
    } = {
      image_urls: updatedImageUrls
    };
    
    // Si c'était l'image principale, définir une nouvelle image principale
    // si disponible, sinon mettre à null
    if (isMainImage) {
      updates.image_url = updatedImageUrls.length > 0 ? updatedImageUrls[0] : null;
    }
    
    // Mise à jour du produit
    const { error: updateError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);
    
    if (updateError) {
      console.error('Erreur lors de la suppression de l\'image:', updateError);
      throw new Error(`Échec de la suppression de l'image: ${updateError.message}`);
    }
    
    // Essayer de supprimer physiquement le fichier du stockage
    try {
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split('/');
      // Chercher les parties pertinentes du chemin
      const bucketIndex = pathParts.findIndex(part => part === 'product-images');
      if (bucketIndex >= 0 && bucketIndex + 2 < pathParts.length) {
        const folderPath = pathParts[bucketIndex + 1];
        const fileName = pathParts[bucketIndex + 2];
        
        if (fileName && folderPath) {
          // Supprimer le fichier du stockage
          const { error: storageError } = await supabase.storage
            .from('product-images')
            .remove([`${folderPath}/${fileName}`]);
          
          if (storageError) {
            console.warn(`Erreur lors de la suppression du fichier physique, mais l'image a été supprimée de la base de données:`, storageError);
          } else {
            console.log(`Fichier physique supprimé avec succès: ${folderPath}/${fileName}`);
          }
        }
      }
    } catch (parseError) {
      console.warn('Impossible de parser l\'URL de l\'image pour la suppression physique:', parseError);
    }
    
    console.log(`Image supprimée avec succès pour le produit ${productId}`);
    return true;
  } catch (error) {
    console.error('Erreur dans removeProductImage:', error);
    toast.error(`Erreur lors de la suppression de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

// Fonction pour récupérer correctement toutes les images d'un produit
export const fetchProductImages = async (productId: string): Promise<{mainImage: string | null, additionalImages: string[]}> => {
  try {
    console.log(`Récupération des images pour le produit ${productId}`);
    
    // Récupérer les données du produit
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('image_url, image_urls')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error('Erreur lors de la récupération des données du produit:', fetchError);
      throw new Error('Échec de la récupération des données du produit');
    }
    
    // Set pour stocker les URLs uniques d'images valides
    const validImageUrls = new Set<string>();
    
    // 1. Ajouter l'image principale si elle existe et est valide
    const mainImage = product?.image_url || null;
    if (isValidImageUrl(mainImage)) {
      validImageUrls.add(mainImage);
    }
    
    // 2. Ajouter les images supplémentaires de la base de données
    if (product?.image_urls && Array.isArray(product.image_urls)) {
      product.image_urls.forEach(url => {
        if (isValidImageUrl(url)) {
          validImageUrls.add(url);
        }
      });
    }
    
    // 3. Vérifier les fichiers physiques dans le stockage
    try {
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('product-images')
        .list(productId);
        
      if (storageError) {
        console.warn(`Erreur lors de la vérification des fichiers dans le stockage: ${storageError.message}`);
      } else if (storageFiles && storageFiles.length > 0) {
        // Filtrer les fichiers de type placeholder et autres fichiers invisibles
        const validFiles = storageFiles.filter(file => 
          !file.name.startsWith('.') && 
          !file.name.endsWith('.emptyFolderPlaceholder') &&
          isValidImageFileName(file.name)
        );
        
        if (validFiles.length > 0) {
          const bucketUrl = supabase.storage.from('product-images').getPublicUrl('').data.publicUrl;
          
          // Générer les URLs pour tous les fichiers valides du stockage
          validFiles.forEach(file => {
            const url = `${bucketUrl}/${productId}/${file.name}`;
            validImageUrls.add(url);
          });
        }
      }
    } catch (storageError) {
      console.warn('Impossible d\'accéder au stockage:', storageError);
    }
    
    // Convertir l'ensemble en tableau
    const imagesList = Array.from(validImageUrls);
    
    // S'il n'y a pas d'image principale définie mais que nous avons des images, définir la première comme principale
    let finalMainImage = mainImage;
    let finalAdditionalImages: string[] = [];
    
    if (imagesList.length > 0) {
      if (!isValidImageUrl(finalMainImage)) {
        finalMainImage = imagesList[0];
        
        // Mettre à jour la base de données avec cette image principale
        try {
          await supabase.from('products').update({
            image_url: finalMainImage
          }).eq('id', productId);
          console.log(`Image principale automatiquement définie pour le produit ${productId}: ${finalMainImage}`);
        } catch (updateError) {
          console.warn(`Impossible de mettre à jour l'image principale dans la base de données:`, updateError);
        }
        
        // Filtrer cette image des images supplémentaires
        finalAdditionalImages = imagesList.filter(url => url !== finalMainImage);
      } else {
        // Filtrer l'image principale des images supplémentaires
        finalAdditionalImages = imagesList.filter(url => url !== finalMainImage);
      }
      
      // Mettre à jour les image_urls dans la base de données si nécessaire
      if (!arraysEqual(product?.image_urls || [], finalAdditionalImages)) {
        try {
          await supabase.from('products').update({
            image_urls: finalAdditionalImages
          }).eq('id', productId);
          console.log(`Images supplémentaires mises à jour pour le produit ${productId}`);
        } catch (updateError) {
          console.warn(`Impossible de mettre à jour les images supplémentaires dans la base de données:`, updateError);
        }
      }
    }
    
    console.log(`Images récupérées pour le produit ${productId}:`, {
      mainImage: finalMainImage,
      additionalImages: finalAdditionalImages,
      totalCount: (finalMainImage ? 1 : 0) + finalAdditionalImages.length
    });
    
    return {
      mainImage: finalMainImage,
      additionalImages: finalAdditionalImages
    };
  } catch (error) {
    console.error('Erreur dans fetchProductImages:', error);
    toast.error(`Erreur lors de la récupération des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

// Fonction pour vérifier si une URL d'image est valide
function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Vérifier que l'URL ne contient pas de placeholder ou de fichier caché
  if (
    url.includes('.emptyFolderPlaceholder') || 
    url.split('/').pop()?.startsWith('.') ||
    url === '/placeholder.svg'
  ) {
    return false;
  }
  
  // Vérifier les extensions d'images connues
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.some(ext => url.toLowerCase().endsWith(ext)) || 
         url.includes('/images/') || 
         url.includes('/product-images/');
}

// Fonction pour vérifier si un nom de fichier est une image valide
function isValidImageFileName(fileName: string): boolean {
  if (!fileName || fileName.startsWith('.')) {
    return false;
  }
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

// Fonction utilitaire pour comparer deux tableaux
function arraysEqual(arr1: any[], arr2: any[]): boolean {
  if (arr1.length !== arr2.length) return false;
  
  const set1 = new Set(arr1);
  for (const item of arr2) {
    if (!set1.has(item)) return false;
  }
  
  return true;
}

// Fonction pour télécharger une image dans un bucket spécifique
export const uploadImage = async (
  file: File | string,
  bucket: string,
  folder: string = '',
  upsert: boolean = true
): Promise<{ url: string }> => {
  try {
    // Vérifier d'abord si le bucket existe avec plusieurs tentatives
    let bucketReady = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!bucketReady && attempts < maxAttempts) {
      attempts++;
      console.log(`Tentative ${attempts}/${maxAttempts} de vérification du bucket ${bucket}`);
      
      bucketReady = await ensureStorageBucket(bucket);
      
      if (!bucketReady) {
        console.warn(`Échec de la tentative ${attempts}/${maxAttempts} de vérification/création du bucket`);
        // Attendre un peu avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!bucketReady) {
      console.error(`Le bucket ${bucket} n'existe pas ou n'a pas pu être créé après ${maxAttempts} tentatives`);
      toast.error(`Erreur lors de la préparation du bucket ${bucket}`);
      throw new Error(`Impossible de créer ou vérifier le bucket ${bucket}`);
    }
    
    // Si file est une chaîne, c'est déjà une URL ou un chemin de fichier
    if (typeof file === 'string') {
      if (file.startsWith('http')) {
        return { url: file }; // C'est déjà une URL, on la retourne simplement
      }
      // Sinon, on pourrait implémenter un téléchargement depuis le chemin, mais pas nécessaire pour l'instant
      throw new Error('Le téléchargement depuis un chemin de fichier n\'est pas supporté');
    }
    
    // C'est un objet File, on procède normalement
    // Utiliser le nom de fichier original
    const originalFileName = file.name;
    const filePath = folder ? `${folder}/${originalFileName}` : originalFileName;
    
    console.log(`Upload du fichier vers: ${bucket}/${filePath}`);

    // Important: Vérifier que le fichier est bien une image réelle et pas un objet JSON
    let fileToUpload: File | Blob = file;
    let contentType = file.type || detectMimeTypeFromExtension(file.name);

    if (contentType === 'application/json') {
      try {
        const fileContent = await readFileAsText(file);
        
        try {
          const jsonData = JSON.parse(fileContent);
          
          // Si c'est un JSON et qu'il contient une propriété data qui est une chaîne
          if (jsonData.data && typeof jsonData.data === 'string') {
            console.log("Image encodée en base64 trouvée dans le JSON");
            
            // Si c'est un data URL, extraire la partie base64
            let base64Data = jsonData.data;
            let mimeType = 'image/png';
            
            // Détecter le MIME type à partir des premiers caractères du base64
            if (base64Data.includes('data:')) {
              const parts = base64Data.split(';base64,');
              if (parts.length > 1) {
                mimeType = parts[0].replace('data:', '');
                base64Data = parts[1];
              }
            } else if (base64Data.startsWith('/9j/')) {
              mimeType = 'image/jpeg';
            } else if (base64Data.startsWith('iVBORw0KGgo')) {
              mimeType = 'image/png';
            } else if (base64Data.startsWith('UklGR')) {
              mimeType = 'image/webp';
            } else if (base64Data.startsWith('R0lGODlh')) {
              mimeType = 'image/gif';
            }
            
            // Extraire la partie base64 si nécessaire
            if (base64Data.includes('base64,')) {
              base64Data = base64Data.split('base64,')[1];
            }
            
            // Convertir la chaîne base64 en Blob
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            const sliceSize = 512;
            
            for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
              const slice = byteCharacters.slice(offset, offset + sliceSize);
              const byteNumbers = new Array(slice.length);
              
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              
              byteArrays.push(new Uint8Array(byteNumbers));
            }
            
            // Créer un blob à partir des données binaires
            const blob = new Blob(byteArrays, { type: mimeType });
            
            // Créer un nouveau File à partir du Blob en conservant le nom du fichier original
            fileToUpload = new File([blob], originalFileName, { type: mimeType });
            contentType = mimeType;
            
            console.log(`Fichier converti de JSON à ${mimeType} avec nom ${originalFileName}`);
          }
        } catch (parseError) {
          console.warn("Erreur lors de la tentative de parse JSON:", parseError);
        }
      } catch (checkError) {
        console.warn("Erreur lors de la vérification du type de fichier:", checkError);
      }
    }
    
    // Utiliser FormData pour l'upload
    const formData = new FormData();
    formData.append('file', fileToUpload);
    
    // Utiliser l'API REST directement
    const uploadUrl = `${supabase.storageUrl}/object/${bucket}/${filePath}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${supabase.supabaseKey}`
    };
    
    if (upsert) {
      headers['x-upsert'] = 'true';
    }
    
    let uploadAttempts = 0;
    const maxUploadAttempts = 3;
    let uploadSuccessful = false;
    let uploadError;
    
    while (!uploadSuccessful && uploadAttempts < maxUploadAttempts) {
      uploadAttempts++;
      console.log(`Tentative d'upload ${uploadAttempts}/${maxUploadAttempts}`);
      
      try {
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers,
          body: formData
        });
        
        if (!response.ok) {
          console.warn(`Échec de l'upload via API REST: ${response.statusText}`);
          const errorText = await response.text();
          throw new Error(`Échec de l'upload: ${errorText}`);
        }
        
        uploadSuccessful = true;
      } catch (e) {
        console.warn(`Exception lors de la tentative d'upload ${uploadAttempts}/${maxUploadAttempts}:`, e);
        uploadError = e;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!uploadSuccessful) {
      console.error('Erreur détaillée lors du téléchargement de l\'image:', uploadError);
      toast.error(`Erreur lors du téléchargement: ${uploadError?.message || "Erreur inconnue"}`);
      throw new Error(uploadError?.message || "Échec de l'upload après plusieurs tentatives");
    }
    
    // Get public URL
    const { data: publicURL } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    console.log(`Image téléchargée avec succès: ${publicURL.publicUrl}`);
    
    return { url: publicURL.publicUrl };
  } catch (error) {
    console.error('Erreur dans uploadImage:', error);
    toast.error(`Erreur lors du téléchargement de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

export const detectFileExtension = (file: File | string): string => {
  if (typeof file === 'string') {
    // Si file est une chaîne (filename)
    const parts = file.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  } else {
    // Si file est un File object
    const parts = file.name.split('.');
    return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
  }
};

export const detectMimeTypeFromExtension = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return ext && mimeTypes[ext] ? mimeTypes[ext] : 'application/octet-stream';
};

export const detectMimeTypeFromSignature = async (file: File): Promise<string> => {
  // Simple mime type detection based on file extension
  const ext = detectFileExtension(file);
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return mimeTypes[ext] || file.type || 'application/octet-stream';
};
