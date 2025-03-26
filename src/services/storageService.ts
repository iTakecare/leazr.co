
import { supabase } from "@/integrations/supabase/client";

/**
 * S'assure qu'un bucket de stockage existe et est configuré correctement
 * @param bucketName Le nom du bucket à vérifier/créer
 * @returns Promise<boolean> Vrai si le bucket existe ou a été créé avec succès
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification du bucket de stockage: ${bucketName}`);
    
    // Vérifier si le bucket existe déjà
    const { data: existingBuckets, error: listError } = await supabase
      .storage
      .listBuckets();
    
    if (listError) {
      console.error(`Erreur lors de la vérification des buckets:`, listError);
      return false;
    }
    
    // Vérifier si le bucket est dans la liste
    const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Le bucket ${bucketName} existe déjà`);
      return true;
    }
    
    // Le bucket n'existe pas dans la liste, essayons de le récupérer directement
    try {
      const { data: getBucketData, error: getBucketError } = await supabase
        .storage
        .getBucket(bucketName);
      
      if (!getBucketError && getBucketData) {
        console.log(`Le bucket ${bucketName} existe déjà (vérifié par getBucket)`);
        return true;
      }
    } catch (getBucketErr) {
      console.log(`Erreur getBucket ignorée:`, getBucketErr);
      // Continuer, car nous allons tenter de créer le bucket
    }
    
    console.log(`Le bucket ${bucketName} n'existe pas, tentative de création...`);
    
    // Essayer d'appeler la fonction RPC si elle existe
    try {
      const { data: rpcData, error: rpcError } = await supabase.functions.invoke('create-storage-bucket', {
        body: {
          bucket_name: bucketName
        }
      });
      
      if (!rpcError && rpcData?.success) {
        console.log(`Bucket ${bucketName} créé avec succès via RPC`);
        return true;
      }
      
      console.log(`La fonction RPC a échoué ou n'existe pas:`, rpcError || 'Sans erreur mais sans succès');
    } catch (rpcErr) {
      console.log(`Exception lors de l'appel RPC:`, rpcErr);
      // Continuer car nous allons essayer de créer directement
    }
    
    // Tenter de créer directement le bucket
    try {
      const { data: createData, error: createError } = await supabase
        .storage
        .createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800, // 50MB
        });
      
      if (createError) {
        // Si l'erreur est "Bucket already exists", le bucket existe déjà
        if (createError.message.includes("already exists")) {
          console.log(`Le bucket ${bucketName} existe déjà (d'après l'erreur)`);
          return true;
        }
        
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        return false;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès`);
      return true;
    } catch (error) {
      console.error(`Exception lors de la création du bucket ${bucketName}:`, error);
      return false;
    }
  } catch (error) {
    console.error(`Erreur générale lors de l'opération sur le bucket ${bucketName}:`, error);
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
