
import { supabase } from "@/integrations/supabase/client";

/**
 * S'assure qu'un bucket de stockage existe et est configuré correctement
 * @param bucketName Le nom du bucket à vérifier/créer
 * @returns Promise<boolean> Vrai si le bucket existe ou a été créé avec succès
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification/création du bucket de stockage: ${bucketName}`);
    
    // Vérifier si le bucket existe déjà
    const { data: existingBucket, error: bucketError } = await supabase
      .storage
      .getBucket(bucketName);
    
    if (existingBucket) {
      console.log(`Le bucket ${bucketName} existe déjà`);
      return true;
    }
    
    if (bucketError && bucketError.message !== 'Bucket not found') {
      console.error(`Erreur lors de la vérification du bucket ${bucketName}:`, bucketError);
      return false;
    }
    
    // Le bucket n'existe pas, essayons de le créer
    try {
      // Essayons d'appeler la fonction RPC si elle existe
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_storage_bucket', {
        bucket_name: bucketName
      });
      
      if (rpcError) {
        console.log(`La fonction RPC n'existe pas ou a échoué, création directe: ${rpcError.message}`);
        // Échec de la fonction RPC, essayons de créer directement
        const { data: createData, error: createError } = await supabase
          .storage
          .createBucket(bucketName, {
            public: true,
            fileSizeLimit: 52428800, // 50MB
          });
        
        if (createError) {
          console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
          return false;
        }
        
        console.log(`Bucket ${bucketName} créé avec succès`);
        return true;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès via RPC`);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la création du bucket ${bucketName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Erreur lors de la vérification/création du bucket ${bucketName}:`, error);
    return false;
  }
}

/**
 * Télécharge une image à partir d'une URL et la stocke dans un bucket Supabase
 * @param imageUrl L'URL de l'image à télécharger
 * @param bucketName Le nom du bucket où stocker l'image
 * @param folder Dossier optionnel dans le bucket
 * @returns La nouvelle URL de l'image stockée ou null en cas d'erreur
 */
export async function downloadAndStoreImage(imageUrl: string, bucketName: string, folder: string = ''): Promise<string | null> {
  try {
    if (!imageUrl) return null;
    
    // Vérifier que le bucket existe
    const bucketExists = await ensureStorageBucket(bucketName);
    if (!bucketExists) {
      throw new Error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
    }
    
    // Extraire le nom du fichier et l'extension de l'URL
    const urlParts = imageUrl.split('/');
    let fileName = urlParts[urlParts.length - 1];
    
    // Nettoyer le nom de fichier
    fileName = fileName.split('?')[0]; // Supprimer les paramètres de requête
    
    // Générer un nom unique pour éviter les collisions
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;
    const filePath = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
    
    // Télécharger l'image
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement de l'image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Uploader l'image dans le bucket
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true
        });
      
      if (error) {
        console.error(`Erreur lors de l'upload de l'image dans ${bucketName}/${filePath}:`, error);
        return null;
      }
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error(`Erreur lors du téléchargement et stockage de l'image ${imageUrl}:`, error);
      return null;
    }
  } catch (error) {
    console.error(`Erreur dans downloadAndStoreImage:`, error);
    return null;
  }
}
