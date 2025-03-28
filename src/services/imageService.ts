
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
    
    // Préparer le fichier pour l'upload
    let fileToUpload: File | Blob = file;
    let contentType = file.type || detectMimeTypeFromExtension(file.name);
    
    // Vérifier si le contenu est un JSON contenant une image en base64
    if (contentType === 'application/json') {
      try {
        const fileContent = await readFileAsText(file);
        
        try {
          const jsonData = JSON.parse(fileContent);
          
          if (jsonData && jsonData.data && typeof jsonData.data === 'string') {
            console.log("Image encodée en base64 trouvée dans le JSON");
            
            // Si c'est un data URL, extraire la partie base64
            let base64Data = jsonData.data;
            let mimeType = 'image/png'; // Type par défaut
            
            // Détecter le MIME type à partir des premiers caractères de base64
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
            
            // Nettoyer les données base64 en supprimant les préfixes
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
              
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }
            
            // Créer un blob à partir des données binaires
            const blob = new Blob(byteArrays, { type: mimeType });
            
            // Créer un nouveau File à partir du Blob en conservant le nom du fichier original
            fileToUpload = new File([blob], uniqueFileName, { type: mimeType });
            contentType = mimeType;
            
            console.log(`Fichier converti de JSON à ${mimeType}`);
          }
        } catch (parseError) {
          console.warn("Erreur lors de la tentative de parse JSON:", parseError);
        }
      } catch (checkError) {
        console.warn("Erreur lors de la vérification du type de fichier:", checkError);
      }
    }
    
    // Utiliser upload directs pour éviter les problèmes de duplication
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileToUpload, {
        contentType,
        upsert: false  // Ne pas écraser si existe déjà
      });
    
    if (error) {
      if (error.message.includes('The resource already exists')) {
        console.warn("L'image existe déjà, génération d'un nouveau nom de fichier");
        // Générer un nouveau nom avec un timestamp plus précis
        const preciseTimestamp = new Date().getTime() + Math.floor(Math.random() * 1000);
        const newFilePath = `${productFolder}/${preciseTimestamp}-${fileName}`;
        
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(newFilePath, fileToUpload, {
            contentType,
            upsert: false
          });
        
        if (retryError) {
          console.error('Erreur lors de la seconde tentative d\'upload:', retryError);
          toast.error(`Échec de l'upload: ${retryError.message}`);
          throw new Error(retryError.message);
        }
        
        data = retryData;
      } else {
        console.error('Erreur détaillée lors du téléchargement de l\'image:', error);
        toast.error(`Erreur lors du téléchargement: ${error.message}`);
        throw new Error(error.message);
      }
    }
    
    // Get public URL
    const { data: publicURL } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data?.path || filePath);
    
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
          toast.error("L'image a été téléchargée mais non enregistrée dans la base de données");
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
    
    // Vérifier aussi physiquement dans le bucket de stockage
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('product-images')
      .list(productId);
      
    if (storageError) {
      console.warn(`Erreur lors de la vérification des fichiers dans le stockage: ${storageError.message}`);
    }
    
    // Préparer les données de retour
    const mainImage = product?.image_url || null;
    let additionalImages = (product?.image_urls || []).filter(url => 
      url && typeof url === 'string' && url.trim() !== '' && url !== mainImage
    );
    
    // Réconcilier avec les fichiers physiquement présents si nécessaire
    if (storageFiles && storageFiles.length > 0) {
      // Créer les URLs pour tous les fichiers du stockage
      const bucketUrl = supabase.storage.from('product-images').getPublicUrl('').data.publicUrl;
      const storageUrls = storageFiles.map(file => 
        `${bucketUrl}/${productId}/${file.name}`
      );
      
      // Ajouter les URLs qui ne sont pas déjà dans la liste
      for (const url of storageUrls) {
        if (url !== mainImage && !additionalImages.includes(url)) {
          additionalImages.push(url);
        }
      }
      
      // Vérifier si l'image principale est présente physiquement, sinon la remplacer
      if (mainImage && !storageUrls.includes(mainImage) && additionalImages.length > 0) {
        // Mise à jour du produit avec la première image additionnelle comme principale
        await supabase.from('products').update({
          image_url: additionalImages[0]
        }).eq('id', productId);
      }
    }
    
    return {
      mainImage,
      additionalImages
    };
  } catch (error) {
    console.error('Erreur dans fetchProductImages:', error);
    toast.error(`Erreur lors de la récupération des images: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    throw error;
  }
};

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
