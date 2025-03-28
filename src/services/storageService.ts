
import { supabase, STORAGE_URL, SUPABASE_KEY } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * S'assure qu'un bucket de stockage existe et est configuré correctement
 * @param bucketName Le nom du bucket à vérifier/créer
 * @returns Promise<boolean> Vrai si le bucket existe ou a été créé avec succès
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification/création du bucket de stockage: ${bucketName}`);
    
    // 1. Vérifier si le bucket existe déjà avec l'API directe
    try {
      const { data: existingBuckets, error: bucketError } = await supabase
        .storage
        .listBuckets();
      
      if (bucketError) {
        console.error(`Erreur lors de la vérification des buckets:`, bucketError);
        // Ne pas afficher de toast ici, continuer avec les autres méthodes
      } else {
        const bucketExists = existingBuckets?.some(bucket => bucket.name === bucketName);
        
        if (bucketExists) {
          console.log(`Le bucket ${bucketName} existe déjà`);
          return true;
        }
      }
    } catch (e) {
      console.warn(`Exception lors de la vérification des buckets: ${e}`);
      // Continuer avec les autres méthodes
    }
    
    console.log(`Le bucket ${bucketName} n'existe pas, tentative de création`);
    
    // 2. Tenter de créer le bucket via la fonction RPC
    try {
      const { error: rpcError } = await supabase.rpc('create_storage_bucket', {
        bucket_name: bucketName
      });
      
      if (rpcError) {
        console.warn(`Erreur RPC lors de la création du bucket: ${rpcError.message}`);
        if (rpcError.message.includes('already exists')) {
          return true; // Le bucket existe déjà
        }
      } else {
        console.log(`Bucket ${bucketName} créé avec succès via RPC`);
        return true;
      }
    } catch (rpcException) {
      console.warn(`Exception RPC: ${rpcException}`);
      // Continuer avec la méthode directe
    }
    
    // 3. Essayer de créer directement le bucket si la méthode RPC a échoué
    try {
      // Créer le bucket directement
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (createError) {
        if (createError.message && createError.message.includes('already exists')) {
          console.log(`Le bucket ${bucketName} existe déjà (détecté via erreur de création)`);
          return true;
        }
        
        console.error(`Échec de la création directe du bucket ${bucketName}: ${createError.message}`);
        return false;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès via API directe`);
      
      // 4. Créer manuellement les politiques d'accès publiques pour le nouveau bucket
      await createPublicPolicies(bucketName);
      
      return true;
    } catch (error) {
      console.error(`Exception lors de la création directe du bucket ${bucketName}:`, error);
      return false;
    }
  } catch (error) {
    // Capture toutes les erreurs non traitées
    console.error(`Erreur générale dans ensureStorageBucket pour ${bucketName}:`, error);
    return false;
  }
}

/**
 * Crée des politiques d'accès publiques pour un bucket
 * @param bucketName Le nom du bucket
 */
async function createPublicPolicies(bucketName: string): Promise<void> {
  try {
    console.log(`Création des politiques d'accès pour le bucket ${bucketName}`);
    
    // Utiliser une API fetch directe pour créer les politiques si nécessaire
    // Cette méthode est plus fiable que l'API RPC dans certains cas
    
    const policyTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
    
    for (const policyType of policyTypes) {
      const policyName = `${bucketName}_public_${policyType.toLowerCase()}`;
      
      try {
        // Essayer d'abord avec RPC
        const { error } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: policyName,
          definition: 'TRUE',
          policy_type: policyType
        });
        
        if (error) {
          console.warn(`Erreur lors de la création de la politique ${policyType} via RPC:`, error);
          // On continue, ce n'est pas bloquant
        } else {
          console.log(`Politique ${policyType} créée avec succès pour ${bucketName}`);
        }
      } catch (error) {
        console.warn(`Exception lors de la création de politique ${policyType}:`, error);
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la création des politiques pour ${bucketName}:`, error);
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
