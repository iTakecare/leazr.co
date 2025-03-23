
import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Service simplifié de gestion des fichiers avec Supabase Storage
 */

/**
 * Vérifie si un bucket existe et le crée si nécessaire avec les bonnes permissions
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification du bucket: ${bucketName}`);
    const supabase = getSupabaseClient();
    const adminClient = getAdminSupabaseClient();
    
    // Vérifier si le bucket existe
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} non trouvé, création en cours...`);
      
      // Essayer avec le client admin pour contourner les problèmes de RLS
      try {
        const { error } = await adminClient.storage.createBucket(bucketName, {
          public: true
        });
        
        if (error) {
          console.error("Erreur lors de la création du bucket avec client admin:", error);
          
          // Si l'approche admin échoue, essayer avec l'API RPC personnalisée
          const { error: rpcError } = await supabase.rpc(
            'create_storage_bucket',
            { bucket_name: bucketName }
          );
          
          if (rpcError) {
            console.error("Erreur lors de la création du bucket via RPC:", rpcError);
            return false;
          }
        }
        
        // Créer des politiques d'accès public
        await adminClient.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_select`,
          definition: 'TRUE',
          policy_type: 'SELECT'
        });
        
        await adminClient.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_insert`,
          definition: 'TRUE',
          policy_type: 'INSERT'
        });
        
        await adminClient.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_update`,
          definition: 'TRUE',
          policy_type: 'UPDATE'
        });
        
        await adminClient.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_delete`,
          definition: 'TRUE',
          policy_type: 'DELETE'
        });
      } catch (adminError) {
        console.error("Exception lors de la création admin du bucket:", adminError);
        return false;
      }
    }
    
    console.log(`Bucket ${bucketName} est prêt à être utilisé`);
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification/création du bucket:", error);
    return false;
  }
};

/**
 * Télécharge un fichier dans un bucket spécifié
 */
export const uploadFile = async (
  bucketName: string,
  file: File,
  customPath?: string
): Promise<string | null> => {
  try {
    // S'assurer que le bucket existe
    const bucketExists = await ensureBucket(bucketName);
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'a pas pu être créé/vérifié`);
      return null;
    }
    
    // Générer un nom de fichier unique
    const uniqueId = uuidv4();
    const filePath = customPath || `${uniqueId}-${file.name}`;
    
    const supabase = getSupabaseClient();
    
    // Détecter le type MIME
    const contentType = file.type || 'application/octet-stream';
    console.log(`Upload du fichier ${filePath} avec type: ${contentType}`);
    
    // Uploader le fichier
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType,
        upsert: true
      });
    
    if (error) {
      console.error("Erreur lors de l'upload:", error);
      
      // Essayer avec le client admin
      const adminClient = getAdminSupabaseClient();
      const { data: adminData, error: adminError } = await adminClient.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType,
          upsert: true
        });
      
      if (adminError) {
        console.error("Échec de l'upload même avec le client admin:", adminError);
        return null;
      }
      
      // Récupérer l'URL publique
      const { data: urlData } = adminClient.storage.from(bucketName).getPublicUrl(adminData.path);
      return urlData.publicUrl;
    }
    
    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Exception lors de l'upload:", error);
    return null;
  }
};

/**
 * Liste les fichiers dans un bucket
 */
export const listFiles = async (bucketName: string, path: string = ''): Promise<any[]> => {
  try {
    // S'assurer que le bucket existe
    await ensureBucket(bucketName);
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(path);
    
    if (error) {
      console.error("Erreur lors du listage des fichiers:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception lors du listage des fichiers:", error);
    return [];
  }
};

/**
 * Supprime un fichier d'un bucket
 */
export const deleteFile = async (bucketName: string, filePath: string): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error("Erreur lors de la suppression:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Exception lors de la suppression:", error);
    return false;
  }
};

/**
 * Télécharge une image depuis une URL et l'enregistre dans un bucket
 */
export const downloadAndSaveImage = async (
  imageUrl: string,
  bucketName: string,
  customPath?: string
): Promise<string | null> => {
  try {
    console.log(`Téléchargement de l'image depuis ${imageUrl}`);
    
    // Télécharger l'image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`Erreur lors du téléchargement: ${response.status}`);
      return null;
    }
    
    // Récupérer le type MIME et le blob
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const blob = await response.blob();
    
    // Créer un fichier à partir du blob
    const filename = imageUrl.split('/').pop() || 'image.jpg';
    const file = new File([blob], filename, { type: contentType });
    
    // Uploader le fichier
    return await uploadFile(bucketName, file, customPath);
  } catch (error) {
    console.error("Exception lors du téléchargement et de l'enregistrement:", error);
    return null;
  }
};

export default {
  ensureBucket,
  uploadFile,
  listFiles,
  deleteFile,
  downloadAndSaveImage
};
