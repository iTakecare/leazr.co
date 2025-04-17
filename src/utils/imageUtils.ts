
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
      
      // If bucket doesn't exist, try creating it via RPC
      if (error.message.includes('bucket') || error.message.includes('not found')) {
        try {
          console.log(`Tentative de création du bucket ${bucketName} via RPC...`);
          const { error: rpcError } = await supabase.rpc('create_storage_bucket', { bucket_name: bucketName });
          
          if (rpcError) {
            console.error('Erreur lors de la création du bucket via RPC:', rpcError);
          } else {
            console.log(`Bucket ${bucketName} créé avec succès via RPC, nouvel essai d'upload...`);
            
            // Try upload again
            const { data: retryData, error: retryError } = await supabase.storage
              .from(bucketName)
              .upload(filePath, file, {
                contentType: contentType,
                upsert: true,
                cacheControl: '3600'
              });
              
            if (retryError) {
              console.error('Erreur lors du second essai d\'upload:', retryError);
              toast.error(`Erreur d'upload: ${retryError.message}`);
              return null;
            }
            
            // If retry succeeded, get the URL
            const { data: retryUrlData } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filePath);
              
            if (retryUrlData?.publicUrl) {
              console.log(`Image téléchargée avec succès après création du bucket: ${retryUrlData.publicUrl}`);
              return retryUrlData.publicUrl;
            }
          }
        } catch (rpcError) {
          console.error('Exception lors de la création du bucket:', rpcError);
        }
      }
      
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
