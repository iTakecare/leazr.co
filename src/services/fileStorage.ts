import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

/**
 * Service amélioré de gestion des fichiers avec Supabase Storage
 */

/**
 * Vérifie si un bucket existe et le crée si nécessaire avec les bonnes permissions
 */
export const ensureBucket = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification du bucket: ${bucketName}`);
    const supabase = getSupabaseClient();
    
    // Vérifier si le bucket existe
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error("Erreur lors de la vérification des buckets:", bucketError);
      throw new Error(`Erreur de vérification des buckets: ${bucketError.message}`);
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} non trouvé, création en cours...`);
      
      // Créer le bucket
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true
      });
      
      if (createError) {
        console.error("Erreur lors de la création du bucket:", createError);
        
        // Essayer avec le client admin
        try {
          const adminClient = getAdminSupabaseClient();
          const { error: adminError } = await adminClient.storage.createBucket(bucketName, {
            public: true
          });
          
          if (adminError) {
            console.error("Échec de la création même avec le client admin:", adminError);
            throw new Error(`Impossible de créer le bucket: ${adminError.message}`);
          }
          
          // Créer des politiques d'accès public avec le client admin
          await createBucketPolicies(bucketName, adminClient);
        } catch (adminClientError) {
          console.error("Erreur avec le client admin:", adminClientError);
          throw new Error("Impossible d'utiliser le client admin");
        }
      } else {
        // Créer des politiques d'accès public
        await createBucketPolicies(bucketName, supabase);
      }
    }
    
    console.log(`Bucket ${bucketName} est prêt à être utilisé`);
    return true;
  } catch (error) {
    console.error("Exception lors de la vérification/création du bucket:", error);
    toast.error(`Problème avec le stockage: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return false;
  }
};

// Fonction utilitaire pour créer les politiques d'accès aux buckets
const createBucketPolicies = async (bucketName: string, client: any) => {
  try {
    // Créer la politique pour SELECT (lire)
    await client.storage.from(bucketName).createPolicy('read_policy', {
      name: `${bucketName}_read_policy`,
      definition: {
        statements: ['SELECT'],
        roles: ['anon', 'authenticated'],
        condition: 'TRUE'
      }
    });
    
    // Créer la politique pour INSERT (écrire)
    await client.storage.from(bucketName).createPolicy('write_policy', {
      name: `${bucketName}_write_policy`,
      definition: {
        statements: ['INSERT'],
        roles: ['anon', 'authenticated'],
        condition: 'TRUE'
      }
    });
    
    // Créer la politique pour UPDATE (mettre à jour)
    await client.storage.from(bucketName).createPolicy('update_policy', {
      name: `${bucketName}_update_policy`,
      definition: {
        statements: ['UPDATE'],
        roles: ['anon', 'authenticated'],
        condition: 'TRUE'
      }
    });
    
    // Créer la politique pour DELETE (supprimer)
    await client.storage.from(bucketName).createPolicy('delete_policy', {
      name: `${bucketName}_delete_policy`,
      definition: {
        statements: ['DELETE'],
        roles: ['anon', 'authenticated'],
        condition: 'TRUE'
      }
    });
    
    console.log(`Politiques créées pour le bucket ${bucketName}`);
  } catch (error) {
    console.error("Erreur lors de la création des politiques:", error);
    // Ne pas bloquer le processus si la création des politiques échoue
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
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      return null;
    }
    
    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Exception lors de l'upload:", error);
    toast.error(`Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
