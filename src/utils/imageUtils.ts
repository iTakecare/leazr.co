
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
    
    // Use direct upload with proper Content-Type handling
    const formData = new FormData();
    formData.append('file', file);
    
    // Construct the URL for the upload
    const storageUrl = `${supabase.supabaseUrl}/storage/v1/object/${bucketName}/${filePath}`;
    
    console.log(`Uploading to: ${bucketName}/${filePath}`);
    
    // Upload using fetch API for better control over the upload process
    const response = await fetch(storageUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabase.supabaseKey}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Upload error: ${response.status} - ${errorText}`);
      
      // Try the traditional Supabase upload method as fallback
      console.log('Attempting fallback upload method');
      const { error: supabaseError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          contentType: file.type,
          upsert: true
        });
        
      if (supabaseError) {
        console.error('Fallback upload error:', supabaseError);
        throw new Error(supabaseError.message);
      }
    }
    
    // Get public URL
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    if (!data || !data.publicUrl) {
      throw new Error('Could not get public URL');
    }
    
    return data.publicUrl;
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
  const timestamp = Date.now();
  return `${url}?t=${timestamp}`;
}
