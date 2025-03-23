
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Vérifie si un bucket de stockage existe et le crée s'il n'existe pas
 * @param bucketName - Nom du bucket à vérifier/créer
 * @returns Promise<boolean> - true si le bucket existe ou a été créé avec succès
 */
export const ensureStorageBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification/création du bucket de stockage: ${bucketName}`);
    const supabase = getSupabaseClient();
    
    // 1. Vérifier si le bucket existe déjà
    const { data: exists, error: checkError } = await supabase.rpc(
      'check_bucket_exists',
      { bucket_name: bucketName }
    );
    
    if (checkError) {
      console.error("Erreur lors de la vérification du bucket:", checkError);
      
      // Tenter une approche alternative en cas d'erreur
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
        
        if (!bucketExists) {
          console.log(`Le bucket ${bucketName} n'existe pas, tentative de création...`);
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true
          });
          
          if (createError) {
            console.error("Erreur lors de la création directe du bucket:", createError);
            throw createError;
          }
          
          console.log(`Bucket ${bucketName} créé avec succès via l'API storage`);
          return true;
        }
        
        return true;
      } catch (alternativeError) {
        console.error("Échec de l'approche alternative:", alternativeError);
        throw checkError;
      }
    }
    
    if (!exists) {
      console.log(`Le bucket ${bucketName} n'existe pas, création via RPC...`);
      
      // 2. Créer le bucket s'il n'existe pas
      const { error: createError } = await supabase.rpc(
        'create_storage_bucket',
        { bucket_name: bucketName }
      );
      
      if (createError) {
        console.error("Erreur lors de la création du bucket via RPC:", createError);
        
        // Tenter une création directe en cas d'échec de la RPC
        try {
          const { error: directCreateError } = await supabase.storage.createBucket(bucketName, {
            public: true
          });
          
          if (directCreateError) {
            console.error("Erreur lors de la création directe du bucket:", directCreateError);
            throw directCreateError;
          }
          
          console.log(`Bucket ${bucketName} créé avec succès via l'API storage`);
          return true;
        } catch (directError) {
          console.error("Échec de la création directe:", directError);
          throw createError;
        }
      }
      
      console.log(`Bucket ${bucketName} créé avec succès via RPC`);
    } else {
      console.log(`Le bucket ${bucketName} existe déjà`);
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification/création du bucket:", error);
    throw error;
  }
};

/**
 * Télécharge un fichier dans un bucket de stockage
 * @param bucketName - Nom du bucket
 * @param filePath - Chemin du fichier dans le bucket
 * @param file - Fichier à télécharger
 * @param options - Options de téléchargement
 * @returns URL du fichier téléchargé
 */
export const uploadFile = async (
  bucketName: string,
  filePath: string,
  file: File | Blob | string,
  options?: { contentType?: string; isPublic?: boolean }
): Promise<string> => {
  try {
    console.log(`Téléchargement du fichier dans ${bucketName}/${filePath}`);
    
    // S'assurer que le bucket existe
    await ensureStorageBucket(bucketName);
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: options?.contentType,
        upsert: true
      });
    
    if (error) {
      console.error("Erreur lors du téléchargement du fichier:", error);
      throw error;
    }
    
    if (!data?.path) {
      throw new Error("Chemin du fichier non retourné après téléchargement");
    }
    
    // Obtenir l'URL publique si demandé
    if (options?.isPublic) {
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);
      
      return urlData.publicUrl;
    }
    
    return data.path;
  } catch (error) {
    console.error("Exception lors du téléchargement du fichier:", error);
    throw error;
  }
};

/**
 * Supprime un fichier dans un bucket de stockage
 * @param bucketName - Nom du bucket
 * @param filePath - Chemin du fichier dans le bucket
 */
export const deleteFile = async (bucketName: string, filePath: string): Promise<void> => {
  try {
    console.log(`Suppression du fichier ${bucketName}/${filePath}`);
    
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error("Erreur lors de la suppression du fichier:", error);
      throw error;
    }
    
    console.log(`Fichier ${filePath} supprimé avec succès`);
  } catch (error) {
    console.error("Exception lors de la suppression du fichier:", error);
    throw error;
  }
};

/**
 * Liste les fichiers dans un bucket de stockage
 * @param bucketName - Nom du bucket
 * @param path - Chemin dans le bucket (optionnel)
 * @returns Liste des fichiers
 */
export const listFiles = async (bucketName: string, path?: string): Promise<any[]> => {
  try {
    console.log(`Listage des fichiers dans ${bucketName}${path ? '/' + path : ''}`);
    
    // S'assurer que le bucket existe
    await ensureStorageBucket(bucketName);
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path || '', {
        sortBy: { column: 'name', order: 'asc' }
      });
    
    if (error) {
      console.error("Erreur lors du listage des fichiers:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception lors du listage des fichiers:", error);
    throw error;
  }
};

/**
 * Télécharge une image depuis une URL et la sauvegarde dans un bucket
 * @param imageUrl - URL de l'image à télécharger
 * @param destinationPath - Chemin de destination dans le bucket
 * @param bucketName - Nom du bucket
 * @returns URL publique de l'image téléchargée
 */
export const downloadAndUploadImage = async (
  sourceUrl: string,
  destinationPath: string,
  bucketName: string = 'product-images'
): Promise<string | null> => {
  try {
    console.log(`Téléchargement de l'image depuis ${sourceUrl} vers ${bucketName}/${destinationPath}`);
    
    // S'assurer que le bucket existe
    await ensureStorageBucket(bucketName);
    
    // Télécharger l'image depuis l'URL
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Échec du téléchargement de l'image: ${response.status} ${response.statusText}`);
    }
    
    // Extraire le type de contenu
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Convertir la réponse en blob
    const imageBlob = await response.blob();
    
    // Uploadez l'image vers Supabase Storage
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(destinationPath, imageBlob, {
        contentType,
        upsert: true
      });
    
    if (error) {
      console.error("Erreur lors de l'upload de l'image téléchargée:", error);
      return null;
    }
    
    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(data.path);
    
    console.log(`Image téléchargée et sauvegardée avec succès: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Erreur lors du téléchargement et de l'upload de l'image:", error);
    return null;
  }
};

export default {
  ensureStorageBucket,
  uploadFile,
  deleteFile,
  listFiles,
  downloadAndUploadImage
};
