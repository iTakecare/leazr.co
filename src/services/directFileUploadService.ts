
import { v4 as uuidv4 } from 'uuid';
import { supabase, getAdminSupabaseClient } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Vérification simplifiée de l'existence d'un bucket
 */
export const ensureBucketExists = async (bucketName: string): Promise<boolean> => {
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
    
    console.log(`Le bucket ${bucketName} n'existe pas. Il faut le créer via la console Supabase.`);
    return false;
  } catch (error) {
    console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Détecte le type MIME à partir de l'extension du fichier
 */
export const detectMimeTypeFromExtension = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
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
    default:
      return 'application/octet-stream';
  }
};

/**
 * Ajoute un paramètre de cache-busting à une URL d'image
 */
export const getCacheBustedUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Vérifier si l'URL est un objet JSON (cas d'erreur)
  if (typeof url === 'string' && (url.startsWith('{') || url.startsWith('['))) {
    console.error("URL invalide (JSON détecté):", url);
    return '';
  }
  
  // Ajouter le paramètre cache-busting
  const timestamp = Date.now();
  
  // Ne pas ajouter de cache-busting aux URLs data:
  if (url.startsWith('data:')) {
    return url;
  }
  
  // Si l'URL contient déjà des paramètres, ajouter le cache-busting
  if (url.includes('?')) {
    return `${url}&t=${timestamp}`;
  }
  
  return `${url}?t=${timestamp}`;
};

/**
 * Upload un fichier dans Supabase Storage
 */
export const uploadFileDirectly = async (
  file: File,
  bucketName: string,
  folderPath: string = ''
): Promise<{ url: string, fileName: string } | null> => {
  try {
    // Valider la taille du fichier (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 5MB)");
      return null;
    }
    
    // Vérifier si le bucket existe
    const bucketExists = await ensureBucketExists(bucketName);
    if (!bucketExists) {
      toast.error(`Le bucket ${bucketName} n'existe pas.`);
      throw new Error(`Le bucket ${bucketName} n'existe pas.`);
    }
    
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const uniqueFileName = `${timestamp}-${fileName}`;
    const fullPath = folderPath ? `${folderPath}/${uniqueFileName}` : uniqueFileName;
    
    // Déterminer le type de contenu en fonction de l'extension du fichier
    const contentType = file.type || detectMimeTypeFromExtension(file.name);
    
    console.log(`Uploading file ${uniqueFileName} with content type ${contentType}`);
    
    // Créer un nouveau Blob avec le type MIME correct pour s'assurer que le fichier est uploadé avec le bon type
    const fileArrayBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([fileArrayBuffer], { type: contentType });
    const fileWithCorrectType = new File([fileBlob], fileName, { type: contentType });
    
    // Upload via l'API Supabase
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fullPath, fileWithCorrectType, {
        contentType,
        upsert: true,
        cacheControl: "3600"
      });
    
    if (error) {
      console.error("Upload error:", error);
      throw error;
    }
    
    // Récupérer l'URL publique
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fullPath);
    
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Impossible d'obtenir l'URL publique");
    }
    
    console.log("File uploaded successfully:", publicUrlData.publicUrl);
    return { url: publicUrlData.publicUrl, fileName: uniqueFileName };
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
};
