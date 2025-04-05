
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
 * Gets a cached-busted image URL and fixes common URL issues
 */
export function getCacheBustedUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Fix common URL issues 
  let fixedUrl = url;
  
  // Try to parse if it's JSON
  if (typeof fixedUrl === 'string' && (fixedUrl.startsWith('{') || fixedUrl.startsWith('['))) {
    try {
      const parsed = JSON.parse(fixedUrl);
      
      // Check various JSON structures that might contain URLs
      if (parsed.url) {
        fixedUrl = parsed.url;
      } else if (parsed.data && typeof parsed.data === 'string') {
        // It might be a data URL or another string URL
        fixedUrl = parsed.data;
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        // If it's an array, try to get the first item that might be a URL
        if (typeof parsed[0] === 'string') {
          fixedUrl = parsed[0];
        } else if (parsed[0]?.url) {
          fixedUrl = parsed[0].url;
        }
      } else {
        // Try to get any property that looks like a URL
        const possibleUrlProps = ['src', 'href', 'link', 'image', 'path', 'publicUrl'];
        for (const prop of possibleUrlProps) {
          if (parsed[prop] && typeof parsed[prop] === 'string') {
            fixedUrl = parsed[prop];
            break;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to parse JSON URL, using as is:', e);
      // Continue with the URL as is
    }
  }
  
  // Fix missing protocol (if URL starts with single slash)
  if (fixedUrl.startsWith('/') && !fixedUrl.startsWith('//')) {
    fixedUrl = `${window.location.origin}${fixedUrl}`;
  }
  
  // Fix typo in URL (https:/ instead of https://)
  if (fixedUrl.startsWith('https:/') && !fixedUrl.startsWith('https://')) {
    fixedUrl = fixedUrl.replace('https:/', 'https://');
  }
  
  // Fix another common typo (https/:/ instead of https://)
  if (fixedUrl.startsWith('https/:/')) {
    fixedUrl = fixedUrl.replace('https/:/', 'https://');
  }
  
  // Ensure valid URL format for data URLs
  if (fixedUrl.startsWith('data:') && !fixedUrl.includes(';base64,')) {
    // Try to add the missing parts if it's a data URL with incorrect format
    if (fixedUrl.includes(',')) {
      const parts = fixedUrl.split(',');
      const mimeType = parts[0].replace('data:', '') || 'image/png';
      fixedUrl = `data:${mimeType};base64,${parts[1]}`;
    } else {
      // If it doesn't have a comma, it's likely just the base64 data without the prefix
      fixedUrl = `data:image/png;base64,${fixedUrl.replace('data:', '')}`;
    }
  }
  
  // Add cache busting parameter
  const timestamp = Date.now();
  
  // Don't add cache busting to data URLs
  if (fixedUrl.startsWith('data:')) {
    return fixedUrl;
  }
  
  // If URL already has query parameters, append cache busting parameter
  if (fixedUrl.includes('?')) {
    return `${fixedUrl}&t=${timestamp}`;
  }
  
  return `${fixedUrl}?t=${timestamp}`;
}

/**
 * Parse various image formats from the database or API responses
 */
export function parseImageData(imageData: any): string | null {
  if (!imageData) return null;
  
  try {
    // Case 1: Direct URL string
    if (typeof imageData === 'string') {
      // Check if it's JSON string
      if (imageData.startsWith('{') || imageData.startsWith('[')) {
        try {
          return parseImageData(JSON.parse(imageData));
        } catch (e) {
          console.warn('Failed to parse JSON image data:', e);
        }
      }
      
      // Regular URL or data URL
      return getCacheBustedUrl(imageData);
    }
    
    // Case 2: Object with URL property
    if (imageData.url) {
      return getCacheBustedUrl(imageData.url);
    }
    
    // Case 3: Object with data property
    if (imageData.data) {
      if (typeof imageData.data === 'string') {
        return getCacheBustedUrl(imageData.data);
      }
      return null;
    }
    
    // Case 4: Array of images, get the first one
    if (Array.isArray(imageData) && imageData.length > 0) {
      return parseImageData(imageData[0]);
    }
    
    // Last resort: stringify the object
    console.warn('Unknown image data format:', imageData);
    return null;
  } catch (e) {
    console.error('Error parsing image data:', e);
    return null;
  }
}
