
import { supabase } from "@/integrations/supabase/client";
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
    
    // Verify file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return null;
    }
    
    // Generate a unique filename
    const timestamp = Date.now();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-');
    const fileName = `${timestamp}-${cleanName}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    // Determine content type from file extension
    const fileExt = cleanName.split('.').pop()?.toLowerCase() || '';
    let contentType = 'image/jpeg'; // default
    
    if (fileExt === 'png') contentType = 'image/png';
    else if (fileExt === 'gif') contentType = 'image/gif';
    else if (fileExt === 'webp') contentType = 'image/webp';
    else if (fileExt === 'svg') contentType = 'image/svg+xml';
    else if (['jpg', 'jpeg'].includes(fileExt)) contentType = 'image/jpeg';
    
    // Use the file's reported MIME type if it seems valid
    if (file.type.startsWith('image/')) {
      contentType = file.type;
    }
    
    // Create a binary blob with the correct content type
    const arrayBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: contentType });
    
    console.log(`Uploading ${fileName} as ${contentType}`);
    
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBlob, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      return null;
    }
    
    // Generate public URL
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
