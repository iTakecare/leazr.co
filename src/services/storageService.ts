
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * S'assure qu'un bucket de stockage existe et est configuré correctement
 * @param bucketName Le nom du bucket à vérifier/créer
 * @returns Promise<boolean> Vrai si le bucket existe ou a été créé avec succès
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification/création du bucket de stockage: ${bucketName}`);
    
    // Cache des buckets existants pour éviter des appels répétés
    if ((window as any).__existingBuckets && (window as any).__existingBuckets[bucketName]) {
      console.log(`Le bucket ${bucketName} existe déjà (depuis le cache)`);
      return true;
    }
    
    // 1. Vérifier si le bucket existe déjà en tentant de lister son contenu
    try {
      const { data, error } = await supabase.storage.from(bucketName).list();
      
      if (!error) {
        console.log(`Le bucket ${bucketName} existe déjà et est accessible`);
        // Mettre en cache pour les appels futurs
        if (typeof window !== "undefined") {
          (window as any).__existingBuckets = (window as any).__existingBuckets || {};
          (window as any).__existingBuckets[bucketName] = true;
        }
        return true;
      } else {
        console.log(`Erreur lors de l'accès au bucket ${bucketName}:`, error);
      }
    } catch (e) {
      console.warn(`Exception lors de la vérification du bucket: ${e}`);
    }
    
    // 2. Essayer via la fonction RPC create_storage_bucket
    try {
      console.log(`Tentative de création via la fonction RPC create_storage_bucket`);
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_storage_bucket', { 
        bucket_name: bucketName 
      });
      
      if (!rpcError) {
        console.log(`Bucket ${bucketName} créé avec succès via RPC`);
        if (typeof window !== "undefined") {
          (window as any).__existingBuckets = (window as any).__existingBuckets || {};
          (window as any).__existingBuckets[bucketName] = true;
        }
        return true;
      } else {
        console.error(`Erreur lors de l'appel à la fonction RPC:`, rpcError);
      }
    } catch (rpcCallError) {
      console.warn(`Exception lors de l'appel à la fonction RPC: ${rpcCallError}`);
    }
    
    // 3. Essayer via l'edge function create-storage-bucket
    try {
      console.log(`Tentative de création via l'edge function create-storage-bucket`);
      const { data, error } = await supabase.functions.invoke('create-storage-bucket', {
        body: { bucket_name: bucketName }
      });
      
      if (error) {
        console.error(`Erreur lors de l'appel à la fonction create-storage-bucket:`, error);
      } else if (data?.success) {
        console.log(`Bucket ${bucketName} créé avec succès via edge function`);
        if (typeof window !== "undefined") {
          (window as any).__existingBuckets = (window as any).__existingBuckets || {};
          (window as any).__existingBuckets[bucketName] = true;
        }
        return true;
      } else if (data?.message?.includes('already exists')) {
        console.log(`Le bucket ${bucketName} existe déjà (signalé par edge function)`);
        if (typeof window !== "undefined") {
          (window as any).__existingBuckets = (window as any).__existingBuckets || {};
          (window as any).__existingBuckets[bucketName] = true;
        }
        return true;
      }
    } catch (functionError) {
      console.warn(`Exception lors de l'appel à l'edge function: ${functionError}`);
    }
    
    // 4. Dernière tentative: création directe via l'API Supabase
    try {
      console.log(`Tentative de création directe du bucket ${bucketName}`);
      
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (createError) {
        if (createError.message && createError.message.includes('already exists')) {
          console.log(`Le bucket ${bucketName} existe déjà (détecté via erreur de création)`);
          if (typeof window !== "undefined") {
            (window as any).__existingBuckets = (window as any).__existingBuckets || {};
            (window as any).__existingBuckets[bucketName] = true;
          }
          return true;
        }
        
        console.error(`Échec de la création directe du bucket ${bucketName}: ${createError.message}`);
        return false;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès via API directe`);
      if (typeof window !== "undefined") {
        (window as any).__existingBuckets = (window as any).__existingBuckets || {};
        (window as any).__existingBuckets[bucketName] = true;
      }
      
      return true;
    } catch (error) {
      console.error(`Exception lors de la création directe du bucket ${bucketName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Erreur générale dans ensureStorageBucket pour ${bucketName}:`, error);
    return false;
  }
}

/**
 * Obtient une URL d'image avec cache-busting
 */
export function getImageUrlWithCacheBuster(url: string | null): string {
  if (!url) return "/placeholder.svg";
  
  try {
    // Nettoyer l'URL en supprimant les paramètres existants
    const baseUrl = url.split('?')[0];
    
    // Ajouter un timestamp comme paramètre de cache-busting
    return `${baseUrl}?t=${Date.now()}`;
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL avec cache-busting:", error);
    return url;
  }
}

/**
 * Détecte le type MIME à partir de l'extension de fichier
 */
function detectMimeType(extension: string): string {
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
    default:
      return 'image/jpeg';  // Fallback
  }
}

/**
 * Vérifie la connexion au stockage Supabase
 */
export const checkStorageConnection = async (): Promise<boolean> => {
  try {
    // Essayer de lister les buckets pour vérifier la connexion
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Erreur lors de la vérification de la connexion au stockage:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification de la connexion au stockage:", error);
    return false;
  }
};

/**
 * Réinitialise la connexion au stockage
 */
export const resetStorageConnection = async (): Promise<boolean> => {
  try {
    // Essayer de créer le bucket 'product-images' via Edge Function
    try {
      const response = await fetch('/api/create-storage-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketName: 'product-images' }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Résultat de la création du bucket:", result);
        return true;
      }
    } catch (error) {
      console.error("Erreur lors de la connexion à l'Edge Function:", error);
    }

    // Vérifier la connexion
    const { error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Erreur lors de la réinitialisation de la connexion au stockage:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la réinitialisation de la connexion au stockage:", error);
    return false;
  }
};

/**
 * Tente de créer un bucket s'il n'existe pas
 */
export const createBucketIfNotExists = async (bucketName: string): Promise<boolean> => {
  return ensureStorageBucket(bucketName);
};

/**
 * Upload a file to a bucket
 */
export const uploadFile = async (
  bucketName: string,
  file: File,
  filePath: string
): Promise<string | null> => {
  try {
    // Upload the file
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error(`Error uploading file to ${bucketName}/${filePath}:`, error);
      return null;
    }

    // Get the public URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error) {
    console.error(`Exception uploading file to ${bucketName}/${filePath}:`, error);
    return null;
  }
};

/**
 * List files in a bucket or folder
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
      console.error(`Error listing files in ${bucketName}/${folderPath}:`, error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error(`Exception listing files in ${bucketName}/${folderPath}:`, error);
    return [];
  }
};

/**
 * Delete a file from a bucket
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
      console.error(`Error deleting file ${bucketName}/${filePath}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Exception deleting file ${bucketName}/${filePath}:`, error);
    return false;
  }
};

