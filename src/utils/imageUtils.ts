
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Uploads an image to Supabase storage and returns the public URL
 */
export async function uploadImage(
  file: File,
  bucketName: string,
  folderPath: string = ""
): Promise<string | null> {
  try {
    console.log(`Starting image upload for file: ${file.name} to bucket: ${bucketName}, size: ${file.size} bytes`);
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return null;
    }
    
    // Generate a unique filename to prevent conflicts
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    // Determine correct content type based on file extension
    const extension = fileName.split('.').pop()?.toLowerCase();
    let contentType = 'image/jpeg'; // Default
    
    if (extension === 'png') contentType = 'image/png';
    else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'webp') contentType = 'image/webp';
    else if (extension === 'gif') contentType = 'image/gif';
    
    console.log(`Using content type: ${contentType} for file ${fileName}`);
    
    // Direct upload approach
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: contentType,
        upsert: true
      });
    
    if (error) {
      console.error('Upload error:', error.message);
      toast.error(`Erreur d'upload: ${error.message}`);
      return null;
    }
    
    console.log("Upload successful:", data?.path);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!urlData?.publicUrl) {
      toast.error("Impossible d'obtenir l'URL publique");
      return null;
    }
    
    console.log(`Image uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
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
