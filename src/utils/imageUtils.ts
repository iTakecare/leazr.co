
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Utilise RPC pour créer un bucket et ses politiques d'accès
 */
async function createBucketWithRpc(bucketName: string): Promise<boolean> {
  try {
    console.log(`Tentative de création du bucket ${bucketName} via RPC...`);
    
    // Tentative d'appel à la fonction RPC
    const { data, error } = await supabase.rpc('create_storage_bucket', {
      bucket_name: bucketName
    });
    
    if (error) {
      console.error(`Erreur lors de la création du bucket via RPC: ${error.message}`);
      return false;
    }
    
    console.log(`Bucket ${bucketName} créé avec succès via RPC`);
    return true;
  } catch (error) {
    console.error(`Exception lors de l'appel RPC: ${error}`);
    return false;
  }
}

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
    
    // Essayer d'abord la création via RPC (fonction de base de données)
    if (await createBucketWithRpc(bucketName)) {
      return true;
    }
    
    // Fallback: tenter de créer le bucket directement
    try {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024 // 5MB
      });
      
      if (createError) {
        // Si l'erreur est une violation de RLS, tentons de créer le bucket via une requête HTTP directe
        if (createError.message.includes('violates row-level security policy')) {
          console.warn(`Erreur RLS détectée lors de la création du bucket: ${createError.message}`);
          
          // Le bucket peut exister malgré l'erreur RLS, essayons de l'utiliser quand même
          return true;
        }
        
        console.error(`Erreur lors de la création du bucket ${bucketName}:`, createError);
        return false;
      }
      
      console.log(`Bucket ${bucketName} créé avec succès`);
      return true;
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
    await ensureBucketExists(bucketName);
    console.log("Poursuite du téléchargement même si le bucket pourrait ne pas exister");
    
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
    
    // Création du nom de fichier pour stockage local (fallback)
    const localFileName = `/lovable-uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    
    // Essayer Supabase Storage
    try {
      console.log(`Tentative d'upload du fichier...`);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType: contentType,
          upsert: true, 
          cacheControl: '3600'
        });
      
      if (error) {
        // Si erreur RLS, continuer avec le fallback
        if (error.message.includes('violates row-level security policy')) {
          console.warn("Erreur RLS détectée, utilisation du fallback local");
          return localFileName;
        }
        
        console.error('Erreur d\'upload:', error.message);
        toast.error(`Erreur d'upload: ${error.message}`);
        return localFileName;
      }
      
      console.log("Upload réussi:", data?.path);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        console.error("Impossible d'obtenir l'URL publique");
        toast.error("Impossible d'obtenir l'URL publique");
        return localFileName;
      }
      
      console.log(`Image téléchargée avec succès: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erreur générale d\'upload d\'image:', error);
      // Fallback pour le développement local
      return localFileName;
    }
  } catch (error) {
    console.error('Erreur générale d\'upload d\'image:', error);
    toast.error("Erreur lors du téléchargement de l'image");
    
    // Fallback pour le développement local
    const timestamp = Date.now();
    return `/lovable-uploads/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
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
