
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Crée un bucket s'il n'existe pas déjà et configure les politiques d'accès
 */
async function ensureBucketExists(bucketName: string): Promise<boolean> {
  try {
    console.log(`Vérification de l'existence du bucket: ${bucketName}`);
    
    // Vérifier si le bucket existe déjà
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Erreur lors de la vérification des buckets:", listError);
      return false;
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Le bucket ${bucketName} existe déjà`);
      return true;
    }
    
    console.log(`Le bucket ${bucketName} n'existe pas, tentative de création...`);
    
    try {
      // Tenter de créer le bucket directement
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024 // 5MB
      });
      
      if (createError) {
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        return false;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès`);
      
      // Ajouter automatiquement les politiques d'accès (via RPC)
      try {
        await supabase.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_select`,
          definition: 'TRUE',
          policy_type: 'SELECT'
        });
        
        await supabase.rpc('create_storage_policy', {
          bucket_name: bucketName,
          policy_name: `${bucketName}_public_insert`,
          definition: 'TRUE', 
          policy_type: 'INSERT'
        });
        
        console.log("Politiques d'accès créées pour le bucket");
        return true;
      } catch (policyError) {
        console.warn("Erreur lors de la création des politiques (non bloquant):", policyError);
        return true; // On continue même si la création des politiques échoue
      }
    } catch (error) {
      console.error("Exception lors de la création du bucket:", error);
      return false;
    }
  } catch (error) {
    console.error("Erreur générale dans ensureBucketExists:", error);
    return false;
  }
}

/**
 * Uploads an image to Supabase storage and returns the public URL
 */
export async function uploadImage(
  file: File,
  bucketName: string = "blog-images",
  folderPath: string = ""
): Promise<string | null> {
  try {
    console.log(`Début du téléchargement de l'image: ${file.name} vers le bucket: ${bucketName}, taille: ${file.size} octets`);
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      console.error("Image trop volumineuse (max 5MB)");
      toast.error("L'image est trop volumineuse (max 5MB)");
      return null;
    }
    
    // S'assurer que le bucket existe
    const bucketExists = await ensureBucketExists(bucketName);
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Impossible de créer l'espace de stockage pour les images`);
      return null;
    }
    
    // Generate a unique filename to prevent conflicts
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    // Determine content type based on file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'image/jpeg'; // Default
    
    if (extension === 'png') contentType = 'image/png';
    else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'webp') contentType = 'image/webp';
    else if (extension === 'gif') contentType = 'image/gif';
    
    console.log(`Utilisation du type MIME: ${contentType} pour le fichier ${fileName}`);
    
    // Upload the file with explicit content type - using upsert to overwrite if exists
    console.log(`Tentative d'upload du fichier...`);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: contentType,
        upsert: true, 
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Erreur d\'upload:', error.message);
      toast.error(`Erreur d'upload: ${error.message}`);
      return null;
    }
    
    console.log("Upload réussi:", data?.path);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!urlData?.publicUrl) {
      console.error("Impossible d'obtenir l'URL publique");
      toast.error("Impossible d'obtenir l'URL publique");
      return null;
    }
    
    console.log(`Image téléchargée avec succès: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Erreur générale d\'upload d\'image:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    return null;
  }
}

// Simplified function for basic URL manipulation - no JSON parsing needed
export function getCacheBustedUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Add cache busting parameter
  if (url.includes('?')) {
    return `${url}&t=${Date.now()}`;
  }
  
  return `${url}?t=${Date.now()}`;
}
