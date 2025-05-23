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
    
    // Au lieu de créer le bucket nous-mêmes, utilisons la fonction RPC définie dans la base de données
    const { data: funcData, error: funcError } = await supabase.rpc('ensure_site_settings_bucket');
    
    if (funcError) {
      console.error("Erreur lors de la création du bucket via RPC:", funcError);
      
      // Tentative alternative d'utilisation de la fonction plus générique
      const { data: genericData, error: genericError } = await supabase.rpc('create_storage_bucket', { 
        bucket_name: bucketName 
      });
      
      if (genericError) {
        console.error("Erreur lors de la création du bucket via create_storage_bucket:", genericError);
        return false;
      }
    }
    
    // Vérifiez à nouveau si le bucket existe après la tentative de création
    const { data: checkBuckets } = await supabase.storage.listBuckets();
    return checkBuckets?.some(bucket => bucket.name === bucketName) || false;
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
      console.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé.`);
      toast.error(`Erreur: Impossible d'accéder au stockage`);
      throw new Error("Erreur lors du téléchargement du logo");
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
      throw new Error("Erreur lors du téléchargement du logo");
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Erreur lors du téléchargement de l'image:", error);
    throw error;
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
