import { supabase, getAdminSupabaseClient } from '@/integrations/supabase/client';

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

    // Vérifier si le bucket existe
    const { data, error } = await supabase.storage.listBuckets();
    
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
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Erreur lors de la vérification des buckets:", listError);
      return false;
    }
    
    // Si le bucket existe déjà, retourner true
    if (buckets.some(bucket => bucket.name === bucketName)) {
      return true;
    }
    
    // Essayer de créer le bucket via Edge Function
    try {
      const response = await fetch('/api/create-storage-bucket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bucketName }),
      });

      if (response.ok) {
        return true;
      }
    } catch (error) {
      console.error("Erreur lors de l'appel à l'Edge Function:", error);
    }

    // Si l'Edge Function échoue, essayer de créer directement
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true
    });
    
    if (createError) {
      console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Erreur lors de la création du bucket ${bucketName}:`, error);
    return false;
  }
};

/**
 * Alias for backwards compatibility
 */
export const ensureBucket = createBucketIfNotExists;

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
