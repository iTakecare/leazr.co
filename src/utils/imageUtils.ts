import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBucket } from "@/services/storageService";
import { toast } from "sonner";

/**
 * Uploads an image to Supabase storage
 */
export async function uploadImage(
  file: File,
  bucketName: string,
  folderPath: string = ""
): Promise<string | null> {
  try {
    console.log(`Uploading image to ${bucketName}/${folderPath}`);
    
    // First ensure the bucket exists
    const bucketExists = await ensureStorageBucket(bucketName);
    if (!bucketExists) {
      console.error(`Le bucket ${bucketName} n'existe pas et n'a pas pu être créé`);
      toast.error(`Erreur: Le bucket ${bucketName} n'a pas pu être créé`);
      return null;
    }
    
    // Verify file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return null;
    }
    
    // Normalize filename to prevent extension confusion
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    
    // Extract proper extension - only keep the last extension if multiple exist
    let fileName = originalName;
    const extensionMatch = originalName.match(/\.([^.]+)$/);
    const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
    
    // If the filename has multiple extensions (like .png.webp), normalize it
    if (originalName.match(/\.[^.]+\.[^.]+$/)) {
      fileName = originalName.replace(/\.[^.]+\.[^.]+$/, `.${extension}`);
    }
    
    // Ensure we have a timestamp prefix for uniqueness
    fileName = `${timestamp}-${fileName}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    // Determine proper MIME type
    let contentType = file.type;
    if (!contentType.startsWith('image/')) {
      switch (extension) {
        case 'png': contentType = 'image/png'; break;
        case 'jpg':
        case 'jpeg': contentType = 'image/jpeg'; break;
        case 'gif': contentType = 'image/gif'; break;
        case 'webp': contentType = 'image/webp'; break;
        case 'svg': contentType = 'image/svg+xml'; break;
        default: contentType = 'application/octet-stream';
      }
    }
    
    console.log(`Using content type: ${contentType} for file: ${fileName}`);
    
    // Create a new File object with the correct MIME type to ensure proper handling
    const newFile = new File([await file.arrayBuffer()], fileName, {
      type: contentType
    });
    
    // Upload with explicit content type
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, newFile, {
        contentType: contentType,
        upsert: true
      });
      
    if (error) {
      console.error('Error uploading:', error);
      toast.error("Erreur lors de l'upload de l'image");
      return null;
    }
    
    // Get the public URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!data || !data.publicUrl) {
      console.error('Failed to get public URL');
      return null;
    }
    
    console.log(`Uploaded image: ${data.publicUrl}`);
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    toast.error("Erreur lors de l'upload de l'image");
    return null;
  }
}

/**
 * Gets a direct image URL from Supabase storage with cache-busting
 */
export function getStorageImageUrl(bucketName: string, path: string): string {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);
    
  if (!data || !data.publicUrl) {
    console.error(`Failed to get URL for ${bucketName}/${path}`);
    return "/placeholder.svg";
  }
  
  // Add cache-busting parameter
  const timestamp = Date.now();
  return `${data.publicUrl}?t=${timestamp}`;
}

/**
 * Lists images in a storage folder
 */
export async function listFolderImages(bucketName: string, folderPath: string): Promise<string[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);
    
    if (error) {
      console.error(`Error listing files in ${bucketName}/${folderPath}:`, error);
      return [];
    }
    
    if (!files || files.length === 0) {
      return [];
    }
    
    // Filter valid files and create URLs
    const imageUrls = files
      .filter(file => 
        !file.name.startsWith('.') && 
        file.name !== '.emptyFolderPlaceholder'
      )
      .map(file => {
        const { data } = supabase.storage
          .from(bucketName)
          .getPublicUrl(`${folderPath}/${file.name}`);
        
        return data?.publicUrl || null;
      })
      .filter(Boolean) as string[];
    
    return imageUrls;
  } catch (error) {
    console.error('Error in listFolderImages:', error);
    return [];
  }
}
