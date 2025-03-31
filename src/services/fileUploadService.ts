
import { v4 as uuidv4 } from 'uuid';
import { supabase, getAdminSupabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Vérifie si un bucket existe et le crée s'il n'existe pas
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Erreur lors de la vérification des buckets:', error);
      return false;
    }

    // Si le bucket existe, retourner true
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return true;
    }

    // Si le bucket n'existe pas, essayer de le créer avec la fonction Edge
    try {
      const response = await fetch('/api/create-storage-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketName }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`Bucket ${bucketName} créé avec succès via Edge Function`);
          return true;
        }
      }
      
      console.error(`Échec de la création du bucket ${bucketName} via Edge Function`);
    } catch (edgeFnError) {
      console.error(`Erreur lors de l'appel Edge Function:`, edgeFnError);
    }

    // Essayer de créer le bucket directement (fallback)
    try {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });

      if (createError) {
        if (createError.message.includes('already exists')) {
          return true;
        }
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        return false;
      }

      return true;
    } catch (createError) {
      console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
      return false;
    }
  } catch (error) {
    console.error(`Erreur lors de la vérification/création du bucket ${bucketName}:`, error);
    return false;
  }
};

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
  bucketName: string,
  folderPath: string = ''
): Promise<{ url: string } | null> => {
  try {
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      toast.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
      return null;
    }

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
    
    console.log(`Uploading file with explicit content type: ${contentType}, size: ${file.size} bytes`);

    // Convertir le fichier en Blob avec le type MIME explicite pour éviter toute mauvaise interprétation
    const fileBlob = new Blob([await fileWithCorrectMime.arrayBuffer()], { type: contentType });

    // Upload du fichier en spécifiant correctement le contentType
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType // Spécifier explicitement le type MIME du fichier
      });

    if (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error("Erreur lors de l'upload du fichier");
      return null;
    }

    // Récupérer l'URL publique
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return { url: data.publicUrl };
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    toast.error("Erreur lors de l'upload du fichier");
    return null;
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
    const result = await uploadImage(file, bucketName, folderPath);
    if (result) {
      urls.push(result.url);
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
