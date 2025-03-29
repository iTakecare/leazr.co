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
    
    // Determine proper MIME type using the proper extension
    let contentType = 'application/octet-stream'; // default fallback
    
    if (extension === 'png') contentType = 'image/png';
    else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
    else if (extension === 'gif') contentType = 'image/gif';
    else if (extension === 'webp') contentType = 'image/webp';
    else if (extension === 'svg') contentType = 'image/svg+xml';
    else if (file.type.startsWith('image/')) contentType = file.type;
    
    console.log(`Normalized filename: ${fileName}, detected MIME type: ${contentType}`);
    
    try {
      // Convert to ArrayBuffer and create a proper Blob with explicit type
      const arrayBuffer = await file.arrayBuffer();
      const fileBlob = new Blob([arrayBuffer], { 
        type: contentType 
      });
      
      // Verify the blob was created with the correct type
      console.log(`Uploading ${fileName} with explicit content-type: ${contentType}, Blob type: ${fileBlob.type}`);
      
      // Upload with explicit content-type option
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBlob, {
          contentType: contentType, // Critical: explicitly pass content type
          cacheControl: '3600',
          upsert: true  // Changed to true to overwrite if file exists
        });
      
      if (error) {
        console.error('Error uploading image:', error);
        toast.error(`Erreur lors de l'upload: ${error.message}`);
        
        // If the error is related to object already exists, try with a different name
        if (error.message.includes('already exists')) {
          const newFileName = `${timestamp}-${Math.floor(Math.random() * 10000)}-${fileName}`;
          const newFilePath = folderPath ? `${folderPath}/${newFileName}` : newFileName;
          
          console.log(`Retrying with new filename: ${newFileName}`);
          
          const { error: retryError, data: retryData } = await supabase.storage
            .from(bucketName)
            .upload(newFilePath, fileBlob, {
              contentType: contentType,
              cacheControl: '3600',
              upsert: false
            });
            
          if (retryError) {
            console.error('Error in retry upload:', retryError);
            return null;
          }
          
          // Get URL for the successful retry
          const { data: retryUrlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(newFilePath);
            
          return retryUrlData?.publicUrl || null;
        }
        
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
    } catch (blobError) {
      console.error('Error processing file:', blobError);
      
      // Last resort fallback: direct upload with explicit contentType
      console.log('Attempting direct upload as fallback...');
      
      // Create a new File object with the correct MIME type
      try {
        const fixedFile = new File([await file.arrayBuffer()], fileName, { 
          type: contentType 
        });
        
        const { error, data } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fixedFile, {
            contentType: contentType,
            cacheControl: '3600',
            upsert: true
          });
        
        if (error) {
          console.error('Error in direct upload fallback:', error);
          return null;
        }
        
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
          
        return urlData?.publicUrl || null;
      } catch (finalError) {
        console.error('Final fallback failed:', finalError);
        return null;
      }
    }
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
