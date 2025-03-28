
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * S'assure qu'un bucket de stockage existe et est configuré correctement
 * @param bucketName Le nom du bucket à vérifier/créer
 * @returns Promise<boolean> Vrai si le bucket existe ou a été créé avec succès
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification/création du bucket de stockage: ${bucketName}`);
    
    // Vérifier si le bucket existe déjà
    const { data: existingBuckets, error: bucketError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketError) {
      console.error(`Erreur lors de la vérification des buckets:`, bucketError);
      toast.error("Erreur lors de la vérification des buckets");
      return false;
    }
    
    const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Le bucket ${bucketName} existe déjà`);
      // Ne pas essayer de créer des politiques si le bucket existe déjà
      return true;
    }
    
    // Le bucket n'existe pas, on le crée via RPC pour utiliser la fonction créée en SQL
    try {
      const { error: createError } = await supabase.rpc('create_storage_bucket', {
        bucket_name: bucketName
      });
      
      if (createError) {
        // Vérifier si l'erreur est due au fait que le bucket existe déjà
        if (createError.message && createError.message.includes('already exists')) {
          console.log(`Le bucket ${bucketName} existe déjà (détecté via message d'erreur)`);
          return true;
        }
        
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        toast.error("Erreur lors de la création du bucket");
        return false;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès`);
      return true;
    } catch (error) {
      console.error(`Exception lors de la création du bucket ${bucketName}:`, error);
      
      // Dernier recours: essayer de créer le bucket directement via l'API Storage
      try {
        const { error: directError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 52428800 // 50MB
        });
        
        if (directError) {
          if (directError.message && directError.message.includes('already exists')) {
            console.log(`Le bucket ${bucketName} existe déjà (détection directe)`);
            return true;
          }
          console.error(`Erreur lors de la création directe du bucket ${bucketName}:`, directError);
          toast.error("Erreur lors de la création du bucket");
          return false;
        }
        
        console.log(`Bucket ${bucketName} créé directement avec succès`);
        
        // Créer les politiques d'accès manuellement
        try {
          // Politique pour SELECT (lecture publique)
          await supabase.rpc('create_storage_policy', {
            bucket_name: bucketName,
            policy_name: `${bucketName}_public_select`,
            definition: 'TRUE',
            policy_type: 'SELECT'
          });
          
          // Politique pour INSERT (écriture publique)
          await supabase.rpc('create_storage_policy', {
            bucket_name: bucketName,
            policy_name: `${bucketName}_public_insert`,
            definition: 'TRUE',
            policy_type: 'INSERT'
          });
          
          console.log(`Politiques d'accès créées manuellement pour ${bucketName}`);
        } catch (policyError) {
          console.warn(`Erreur lors de la création manuelle des politiques (non bloquant):`, policyError);
        }
        
        return true;
      } catch (finalError) {
        console.error(`Échec final de création du bucket ${bucketName}:`, finalError);
        toast.error("Impossible de créer le bucket de stockage");
        return false;
      }
    }
  } catch (error) {
    console.error(`Erreur générale dans ensureStorageBucket pour ${bucketName}:`, error);
    toast.error("Erreur lors de la préparation du stockage");
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
      console.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Le bucket ${bucketName} n'a pas pu être créé`);
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
      console.log(`Téléchargement de l'image: ${imageUrl}`);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Erreur lors du téléchargement de l'image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Uploader l'image dans le bucket
      console.log(`Upload de l'image vers ${bucketName}/${filePath}`);
      const { data, error } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true
        });
      
      if (error) {
        console.error(`Erreur lors de l'upload de l'image dans ${bucketName}/${filePath}:`, error);
        toast.error("Erreur lors de l'upload de l'image");
        return null;
      }
      
      // Obtenir l'URL publique
      const { data: publicUrlData } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      console.log(`Image téléchargée avec succès: ${publicUrlData.publicUrl}`);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error(`Erreur détaillée lors du téléchargement et stockage de l'image ${imageUrl}:`, error);
      toast.error("Erreur lors du téléchargement de l'image");
      return null;
    }
  } catch (error) {
    console.error(`Erreur dans downloadAndStoreImage:`, error);
    toast.error("Erreur lors du téléchargement de l'image");
    return null;
  }
}
