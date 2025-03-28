
import { supabase, adminSupabase } from '@/integrations/supabase/client';

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
