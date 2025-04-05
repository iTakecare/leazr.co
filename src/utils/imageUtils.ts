
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
    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return null;
    }
    
    // Generate a unique filename to prevent conflicts
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = folderPath ? `${folderPath}/${fileName}` : fileName;
    
    // Make sure file has correct content type
    let fileToUpload = file;
    if (!file.type.startsWith('image/')) {
      // Force the correct content type based on file extension
      const extension = fileName.split('.').pop()?.toLowerCase();
      const contentType = extension === 'png' ? 'image/png' : 
                          extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
                          extension === 'webp' ? 'image/webp' :
                          extension === 'gif' ? 'image/gif' : 'image/png';
      
      fileToUpload = new File([file], fileName, { type: contentType });
      console.log(`Corrected file type to: ${contentType} for file: ${fileName}`);
    }
    
    console.log(`Uploading to: ${bucketName}/${filePath} with Content-Type: ${fileToUpload.type}`);
    
    // Upload using Supabase Storage API
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileToUpload, {
        contentType: fileToUpload.type,
        upsert: true,
        cacheControl: '3600'
      });
    
    if (error) {
      console.error('Upload error:', error);
      
      // Try the alternative upload method with fetch API
      try {
        console.log('Attempting alternative upload method with explicit content type');
        const formData = new FormData();
        formData.append('file', fileToUpload);
        
        const response = await fetch(`${supabase.supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'x-upsert': 'true'
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${errorText}`);
        }
      } catch (fetchError) {
        console.error('Alternative upload failed:', fetchError);
        throw error; // Throw the original error if the alternative also fails
      }
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      throw new Error('Could not get public URL');
    }
    
    console.log(`Image uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

/**
 * Gets a cached-busted image URL
 */
export function getCacheBustedUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Fix common URL issues 
  let fixedUrl = url;
  
  // Fix missing protocol (if URL starts with single slash)
  if (fixedUrl.startsWith('/') && !fixedUrl.startsWith('//')) {
    fixedUrl = `${window.location.origin}${fixedUrl}`;
  }
  
  // Fix typo in URL (https:/ instead of https://)
  if (fixedUrl.startsWith('https:/') && !fixedUrl.startsWith('https://')) {
    fixedUrl = fixedUrl.replace('https:/', 'https://');
  }
  
  // Add cache busting parameter
  const timestamp = Date.now();
  
  // If URL already has query parameters, append cache busting parameter
  if (fixedUrl.includes('?')) {
    return `${fixedUrl}&t=${timestamp}`;
  }
  
  return `${fixedUrl}?t=${timestamp}`;
}
