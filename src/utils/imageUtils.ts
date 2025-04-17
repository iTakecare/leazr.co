
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    
    // Check if bucket exists and create it if needed
    try {
      console.log("Vérification de l'existence du bucket...");
      const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
      
      if (bucketListError) {
        console.error("Erreur lors de la récupération des buckets:", bucketListError);
      }
      
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.log(`Bucket ${bucketName} n'existe pas, tentative de création...`);
        const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true });
        if (createError) {
          console.error('Erreur lors de la création du bucket:', createError);
          toast.error(`Erreur lors de la création du bucket: ${createError.message}`);
          return null;
        }
        console.log(`Bucket ${bucketName} créé avec succès`);
        
        // Définir les politiques d'accès public
        try {
          console.log("Configuration des politiques d'accès...");
          // Cette requête peut échouer mais ce n'est pas bloquant
          await supabase.rpc('create_storage_policy', {
            bucket_name: bucketName,
            policy_name: `${bucketName}_public_select`,
            definition: 'TRUE',
            policy_type: 'SELECT'
          });
        } catch (policyError) {
          console.warn("Erreur non bloquante lors de la création des politiques:", policyError);
        }
      } else {
        console.log(`Bucket ${bucketName} existe déjà`);
      }
    } catch (bucketError) {
      console.error('Erreur lors de la vérification des buckets:', bucketError);
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
    
    // Upload the file with explicit content type
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
