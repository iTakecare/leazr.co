
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * S'assure qu'un bucket existe dans le stockage Supabase
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    // Vérifier si le bucket existe déjà
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Erreur lors de la vérification des buckets:", listError);
      return false;
    }
    
    // Vérifier si le bucket existe
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      return true;
    }
    
    // Créer le bucket s'il n'existe pas
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (createError) {
      if (createError.message.includes('already exists')) {
        return true;
      }
      console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
      return false;
    }
    
    // Créer des politiques publiques pour le bucket
    try {
      const { data: createRpcData, error: rpcError } = await supabase.rpc('create_storage_policy', { 
        bucket_name: bucketName,
        policy_name: `${bucketName}_public_select`,
        definition: 'TRUE',
        policy_type: 'SELECT'
      });
      
      if (rpcError) {
        console.error(`Erreur lors de la création des politiques pour ${bucketName}:`, rpcError);
      }
    } catch (error) {
      console.error("Erreur lors de la création des politiques:", error);
    }
    
    return true;
  } catch (error) {
    console.error(`Erreur générale dans ensureBucket pour ${bucketName}:`, error);
    return false;
  }
};

/**
 * Télécharge une image vers Supabase
 */
export const uploadImage = async (
  file: File,
  bucketName: string = "site-settings",
  folder: string = ""
): Promise<string | null> => {
  try {
    // S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      toast.error(`Erreur: Impossible d'accéder au stockage`);
      return null;
    }

    // Créer un nom de fichier unique
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    // Détecter le type MIME
    const fileType = getMimeType(fileExt || '');

    // Télécharger le fichier
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: fileType,
        upsert: true
      });

    if (error) {
      console.error("Erreur d'upload:", error);
      return null;
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Erreur lors du téléchargement de l'image:", error);
    return null;
  }
};

/**
 * Détecte le type MIME à partir d'une extension de fichier
 */
export const getMimeType = (extension: string): string => {
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
    default:
      return 'application/octet-stream';
  }
};

/**
 * Ajoute un paramètre de cache-busting à une URL
 */
export const getCacheBustedUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
};
