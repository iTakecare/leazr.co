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
    
    // Use FormData for correct content-type handling
    const formData = new FormData();
    formData.append('file', file);
    
    // Using direct Fetch API for better control over content-type
    const fetchResponse = await fetch(
      `${supabase.supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: formData
      }
    );
    
    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      console.error('Error uploading using fetch:', errorText);
      
      // Fall back to traditional supabase upload method as backup
      console.log('Falling back to traditional upload method');
      
      // Determine proper MIME type using the proper extension
      let contentType = 'application/octet-stream'; // default fallback
      
      if (extension === 'png') contentType = 'image/png';
      else if (extension === 'jpg' || extension === 'jpeg') contentType = 'image/jpeg';
      else if (extension === 'gif') contentType = 'image/gif';
      else if (extension === 'webp') contentType = 'image/webp';
      else if (extension === 'svg') contentType = 'image/svg+xml';
      else if (file.type.startsWith('image/')) contentType = file.type;
      
      // Create a new File object with the correct MIME type
      const newFile = new File([await file.arrayBuffer()], fileName, {
        type: contentType
      });
      
      console.log(`Using explicit File with content-type: ${newFile.type}`);
      
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, newFile, {
          contentType: contentType,
          upsert: true
        });
        
      if (error) {
        console.error('Error in fallback upload:', error);
        toast.error(`Erreur lors de l'upload: ${error.message}`);
        return null;
      }
    } else {
      console.log('Upload successful using fetch API');
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
