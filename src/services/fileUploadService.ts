
import { v4 as uuidv4 } from 'uuid';
import { supabase, getAdminSupabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Détecte l'extension de fichier à partir du nom du fichier
 */
export const detectFileExtension = (fileName: string): string => {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

/**
 * Détecte le type MIME à partir de l'extension du fichier
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
    case 'pdf':
      return 'application/pdf';
    case 'doc':
    case 'docx':
      return 'application/msword';
    case 'xls':
    case 'xlsx':
      return 'application/vnd.ms-excel';
    default:
      return 'application/octet-stream';
  }
};

/**
 * Force le type MIME pour garantir que les fichiers sont traités correctement
 */
export const enforceCorrectMimeType = (file: File): File => {
  const fileExt = detectFileExtension(file.name);
  const mimeType = detectMimeTypeFromExtension(fileExt);
  
  // Si le MIME type est déjà défini correctement, retourner le fichier tel quel
  if (file.type && file.type.startsWith('image/') && file.type !== 'application/octet-stream') {
    return file;
  }
  
  // Créer un nouveau Blob avec le type MIME correct
  try {
    return new File([file], file.name, { 
      type: mimeType,
      lastModified: file.lastModified 
    });
  } catch (error) {
    console.warn('Impossible de créer un nouveau File avec le type MIME forcé, utilisation du Blob:', error);
    // Fallback vers le fichier original
    return file;
  }
};

/**
 * Upload une image dans un bucket
 */
export const uploadImage = async (
  file: File,
  bucketName: string = "blog-images",
  folderPath: string = ''
): Promise<{ url: string } | null> => {
  try {
    // Normalize bucket name (use "blog-images" instead of "Blog Images")
    const normalizedBucketName = bucketName === "Blog Images" ? "blog-images" : bucketName;
    
    // Vérifier la taille du fichier (limite à 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`Le fichier est trop volumineux. La taille maximale est de 5MB.`);
      return null;
    }

    // Vérifier le type de fichier
    const fileExt = detectFileExtension(file.name);
    if (!fileExt) {
      toast.error(`Type de fichier non pris en charge ou extension manquante.`);
      return null;
    }

    // S'assurer que le type MIME est correct pour les images
    const fileWithCorrectMime = enforceCorrectMimeType(file);
    
    // Générer un nom unique pour le fichier
    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;

    // Déterminer le type MIME correct
    const contentType = fileWithCorrectMime.type || detectMimeTypeFromExtension(fileExt);
    
    console.log(`Uploading file with explicit content type: ${contentType}, size: ${file.size} bytes, to bucket: ${normalizedBucketName}`);

    // Upload directement dans le bucket
    const { data, error } = await supabase.storage
      .from(normalizedBucketName)
      .upload(filePath, fileWithCorrectMime, {
        contentType: contentType,
        upsert: true
      });
        
    if (error) {
      console.error(`Erreur lors de l'upload: ${error.message}`);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      throw error;
    }

    // Récupérer l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(normalizedBucketName)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Impossible d'obtenir l'URL publique");
    }

    console.log(`Image téléchargée avec succès: ${publicUrlData.publicUrl}`);
    return { url: publicUrlData.publicUrl };
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    toast.error("Erreur lors de l'upload du fichier");
    throw error;
  }
};

/**
 * Upload des fichiers dans un bucket
 */
export const uploadFiles = async (
  files: File[],
  bucketName: string,
  folderPath: string = ''
): Promise<{ urls: string[] }> => {
  const urls: string[] = [];

  for (const file of files) {
    try {
      const result = await uploadImage(file, bucketName, folderPath);
      if (result) {
        urls.push(result.url);
      }
    } catch (error) {
      console.error(`Erreur lors de l'upload du fichier ${file.name}:`, error);
    }
  }

  return { urls };
};

/**
 * Supprime un fichier d'un bucket
 */
export const deleteFile = async (
  bucketName: string,
  filePath: string
): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return false;
  }
};

/**
 * Liste les fichiers dans un bucket
 */
export const listFiles = async (
  bucketName: string,
  folderPath: string = ''
): Promise<any[]> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);

    if (error) {
      console.error('Erreur lors de la récupération des fichiers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    return [];
  }
};

/**
 * Pour la rétrocompatibilité - juste un alias pour les anciennes références
 */
export const ensureBucket = (bucketName: string): Promise<boolean> => {
  // Ne fait plus rien - le bucket est supposé exister
  console.log(`Bucket ${bucketName} supposé exister, pas de création nécessaire`);
  return Promise.resolve(true);
};
