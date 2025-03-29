/**
 * Utility functions for product image handling
 */

/**
 * Check if an image URL is valid
 */
export const isValidImageUrl = (url: string | null | undefined): boolean => {
  // If the URL is null, undefined or empty, it's not valid
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // If it's the default placeholder image, it's not considered valid
  if (url === '/placeholder.svg') {
    return false;
  }
  
  // Check for invalid patterns that commonly indicate problematic URLs
  if (url.includes('.emptyFolderPlaceholder') || 
      url.includes('undefined') ||
      url.endsWith('/')) {
    return false;
  }
  
  return true;
};

/**
 * Normalize a URL by removing double slashes and query parameters
 * Used for URL comparison and deduplication
 */
export const normalizeUrl = (url: string): string => {
  if (!url) return '';
  
  try {
    // First fix double slashes (except after protocol)
    let fixedSlashes = url.replace(/([^:])\/\/+/g, '$1/');
    
    // Remove any query parameters and hash fragments
    fixedSlashes = fixedSlashes.split('?')[0].split('#')[0];
    
    return fixedSlashes;
  } catch (err) {
    console.error("Error normalizing URL:", err);
    return url;
  }
};

/**
 * Filter and deduplicate valid image URLs
 */
export const filterValidImages = (mainImageUrl: string, additionalUrls: string[] = []): string[] => {
  // Create a set to deduplicate images based on normalized URL
  const uniqueUrlsSet = new Set<string>();
  const validUrls: string[] = [];
  
  // Process the main image first if valid
  if (isValidImageUrl(mainImageUrl)) {
    const normalizedMainUrl = normalizeUrl(mainImageUrl);
    uniqueUrlsSet.add(normalizedMainUrl);
    validUrls.push(mainImageUrl);
  }
  
  // Process additional images if valid
  if (Array.isArray(additionalUrls)) {
    additionalUrls.forEach(url => {
      // Only add if it's valid and not already added (based on normalized URL)
      if (isValidImageUrl(url)) {
        const normalizedUrl = normalizeUrl(url);
        if (normalizedUrl && !uniqueUrlsSet.has(normalizedUrl)) {
          uniqueUrlsSet.add(normalizedUrl);
          // Fix URL before adding
          validUrls.push(cleanImageUrl(url));
        }
      }
    });
  }
  
  return validUrls;
};

/**
 * Clean image URL to prevent issues
 * Returns original URL with fixed slashes or placeholder if invalid
 */
export const cleanImageUrl = (url: string): string => {
  if (!url || !isValidImageUrl(url)) {
    return "/placeholder.svg";
  }
  
  // Check if it's already our placeholder
  if (url === '/placeholder.svg') {
    return url;
  }
  
  // Fix double slashes in URLs which can cause issues
  const cleanedUrl = url.replace(/([^:])\/\/+/g, '$1/');
  
  // Remove any timestamp parameters as they can cause caching issues
  const urlWithoutTimestamp = cleanedUrl.split('?')[0];
  
  return urlWithoutTimestamp;
};

/**
 * Legacy function kept for backward compatibility
 */
export const addTimestamp = (url: string): string => {
  return cleanImageUrl(url);
};

/**
 * Uploads an image to Supabase storage
 */
export async function uploadImage(
  file: File,
  bucketName: string,
  folderPath: string = ""
): Promise<{ url: string } | null> {
  try {
    console.log(`Uploading image to ${bucketName}/${folderPath}`);
    
    // Verify file size
    if (file.size > 5 * 1024 * 1024) {
      console.error("Image is too large (max 5MB)");
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
    
    // Create a Blob from the file with explicit MIME type
    const arrayBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: contentType });
    
    console.log(`Uploading ${fileName} with explicit content-type: ${contentType}, Blob type: ${fileBlob.type}`);
    
    // Upload with explicit contentType
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBlob, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      
      // If error is about an object that already exists, try with a different name
      if (error.message.includes('already exists')) {
        const newFileName = `${timestamp}-${Math.floor(Math.random() * 10000)}-${fileName}`;
        const newFilePath = folderPath ? `${folderPath}/${newFileName}` : newFileName;
        
        console.log(`Retrying with new filename: ${newFileName}`);
        
        const { error: retryError } = await supabase.storage
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
          
        return { url: retryUrlData?.publicUrl || '' };
      }
      
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    
    return { url: urlData?.publicUrl || '' };
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
}

// Import statement at the top of the file (required but may be added by Lovable)
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
