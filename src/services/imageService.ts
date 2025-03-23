import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import storageService from "./storageService";

// Destructurer les fonctions dont nous avons besoin
const { ensureStorageBucket, uploadFile, downloadAndUploadImage } = storageService;

/**
 * Prepare a SEO-friendly filename from the original file name
 * @param filename Original filename
 * @returns Sanitized SEO-friendly filename
 */
export function prepareSeoFilename(filename: string): string {
  // Remove file extension
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
  
  // Replace spaces and special characters with hyphens
  const sanitized = nameWithoutExtension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-") // Replace multiple hyphens with a single one
    .replace(/^-|-$/g, ""); // Remove leading and trailing hyphens
  
  return sanitized || "product-image"; // Fallback if sanitized name is empty
}

/**
 * Generate SEO-friendly alt text from product and filename information
 * @param filename Original filename
 * @param productName Product name (optional)
 * @returns SEO-friendly alt text
 */
export function generateAltText(filename: string, productName?: string): string {
  // Remove extension
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
  
  // If product name provided, use it as prefix
  if (productName) {
    return `${productName} - ${nameWithoutExtension}`;
  }
  
  return nameWithoutExtension || "Product image";
}

/**
 * Get the correct MIME type based on file extension
 * @param extension File extension
 * @param fallbackType Fallback content type if extension is not recognized
 * @returns Correct MIME type
 */
export function getMimeTypeFromExtension(extension: string, fallbackType: string = "image/jpeg"): string {
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'bmp': 'image/bmp',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
    'ico': 'image/x-icon'
  };
  
  return mimeTypes[extension.toLowerCase()] || fallbackType;
}

/**
 * Analyzes the first bytes of a file to detect its type based on binary signature
 * @param file The file to analyze
 * @returns Promise with the detected MIME type
 */
export async function detectMimeTypeFromSignature(file: File): Promise<string | null> {
  try {
    // Read first 12 bytes of the file to check signatures
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check for WebP signature (52 49 46 46 XX XX XX XX 57 45 42 50)
    // WebP files start with "RIFF" followed by file size, then "WEBP"
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50   // "WEBP"
    ) {
      console.log("WebP signature detected");
      return "image/webp";
    }
    
    // Check for JPEG signature (FF D8 FF)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      console.log("JPEG signature detected");
      return "image/jpeg";
    }
    
    // Check for PNG signature (89 50 4E 47 0D 0A 1A 0A)
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
    ) {
      console.log("PNG signature detected");
      return "image/png";
    }
    
    // Check for GIF signature (47 49 46 38)
    if (
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
    ) {
      console.log("GIF signature detected");
      return "image/gif";
    }
    
    return null; // No signature match
  } catch (error) {
    console.error("Error analyzing file signature:", error);
    return null;
  }
}

/**
 * Create a new file with the correct content type
 * @param file Original file
 * @param extension File extension
 * @returns New file with correct content type
 */
export async function createFileWithCorrectType(file: File, extension: string): Promise<File> {
  // First try to detect the MIME type from file signature
  const signatureMimeType = await detectMimeTypeFromSignature(file);
  
  // If signature detection worked, use that, otherwise fall back to extension
  const contentType = signatureMimeType || getMimeTypeFromExtension(extension);
  
  console.log(`Using content type: ${contentType} for file with extension: ${extension}`);
  
  const fileArrayBuffer = await file.arrayBuffer();
  return new File([fileArrayBuffer], file.name, { type: contentType });
}

/**
 * Detects the correct file extension based on content type and filename
 * @param file The file to analyze
 * @returns The detected file extension
 */
export function detectFileExtension(file: File): string {
  // First try to get extension from filename
  const filenameExtension = file.name.split('.').pop()?.toLowerCase();
  
  // Attempt to detect from MIME type if no extension or unusual extension
  if (!filenameExtension || filenameExtension.length > 5) {
    const mimeTypeMapping: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp',
      'image/tiff': 'tiff'
    };
    
    return mimeTypeMapping[file.type] || 'jpg';
  }
  
  return filenameExtension;
}

/**
 * Upload an image file to Supabase Storage with SEO-friendly name
 * @param file The file to upload
 * @param path The path to store the file at (including filename)
 * @param bucket The bucket to store the file in
 * @param preserveOriginalName Whether to preserve the original filename in the stored path
 * @returns The public URL of the uploaded file and SEO metadata or null if there was an error
 */
export async function uploadImage(
  file: File,
  path: string,
  bucket: string = 'product-images',
  preserveOriginalName: boolean = true
): Promise<{ url: string | null, altText: string } | null> {
  try {
    console.log(`Starting image upload for file: ${file.name} to path: ${path} in bucket: ${bucket}`);
    
    // Ensure bucket exists
    console.log(`Ensuring bucket ${bucket} exists...`);
    const bucketExists = await ensureStorageBucket(bucket);
    if (!bucketExists) {
      console.error(`Failed to ensure storage bucket ${bucket} exists`);
      // Fallback to returning a default alt text but no URL
      return { url: null, altText: file.name };
    }
    console.log(`Bucket ${bucket} is confirmed to exist`);

    // Get original filename for SEO purposes
    const originalFilename = file.name;
    
    // Detect the correct file extension
    const extension = detectFileExtension(file);
    console.log(`Detected file extension: ${extension}`);
    
    // Create SEO-friendly version of the filename
    const seoFilename = prepareSeoFilename(originalFilename);
    
    // Generate alt text
    const altText = generateAltText(originalFilename);
    
    // Modify path to include original filename if requested
    let finalPath = path;
    if (preserveOriginalName) {
      // Extract the directory part of the path
      const pathParts = path.split('/');
      pathParts.pop(); // Remove the last segment (original filename)
      
      // Create new path with SEO-friendly name while preserving original extension
      finalPath = `${pathParts.join('/')}/${seoFilename}-${Date.now()}.${extension}`;
    }

    // First try to detect MIME type from file signature 
    const signatureMimeType = await detectMimeTypeFromSignature(file);
    const contentType = signatureMimeType || getMimeTypeFromExtension(extension);
    console.log(`Determined content type: ${contentType} for upload`);
    
    // Read the file as an array buffer so we can create a correctly typed blob
    const arrayBuffer = await file.arrayBuffer();
    
    // Create a new blob with the correct MIME type - this is crucial for proper content type setting
    const blob = new Blob([arrayBuffer], { type: contentType });
    
    console.log(`Uploading image to path: ${finalPath} with explicit content type: ${contentType}`);
    
    // Try with regular client first
    let supabase = getSupabaseClient();
    
    // Upload the file with explicit content type using fetches directly - avoiding Supabase's auto content type detection
    const formData = new FormData();
    formData.append('file', blob, file.name);
    
    // Get upload URL from Supabase
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(finalPath);
    
    if (signedUrlError) {
      console.error("Error getting signed URL:", signedUrlError);
      console.log("Trying with standard upload method...");
      
      // Fall back to standard upload method
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(finalPath, blob, {
          cacheControl: '3600',
          upsert: true,
          contentType: contentType // Explicitly set content type
        });
        
      if (error) {
        console.error("Error uploading with standard method:", error);
        console.log("Trying with admin client...");
        
        // Try with admin client as last resort
        supabase = getAdminSupabaseClient();
        const result = await supabase.storage
          .from(bucket)
          .upload(finalPath, blob, {
            cacheControl: '3600',
            upsert: true,
            contentType: contentType // Explicitly set content type
          });
          
        if (result.error) {
          console.error("Error uploading with admin client:", result.error);
          return { url: null, altText };
        }
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(result.data.path);
          
        console.log(`Successfully uploaded image to: ${publicUrlData?.publicUrl}`);
        
        return {
          url: publicUrlData?.publicUrl || null,
          altText
        };
      }
      
      // Get public URL if standard method worked
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);
        
      console.log(`Successfully uploaded image to: ${publicUrlData?.publicUrl}`);
      
      return {
        url: publicUrlData?.publicUrl || null,
        altText
      };
    }
    
    // If we got a signed URL, use direct fetch with explicit content type header
    console.log("Using signed URL for upload with explicit content type");
    const { signedUrl, token, path: storagePath } = signedUrlData;
    
    try {
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'x-upsert': 'true'
        },
        body: blob
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }
      
      console.log("Upload successful with fetch and explicit content type");
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath);
        
      console.log(`Successfully uploaded image to: ${publicUrlData?.publicUrl}`);
      
      return {
        url: publicUrlData?.publicUrl || null,
        altText
      };
    } catch (fetchError) {
      console.error("Error with fetch upload:", fetchError);
      return { url: null, altText };
    }
  } catch (error) {
    console.error("Error in uploadImage:", error);
    return { url: null, altText: file.name };
  }
}

/**
 * Upload multiple images for a product
 * @param files Array of image files to upload
 * @param productId The product ID
 * @param productName The product name for SEO alt text
 * @param bucket The storage bucket name
 * @returns Array of uploaded image URLs with their alt texts
 */
export async function uploadProductImages(
  files: File[],
  productId: string,
  productName?: string,
  bucket: string = 'product-images'
): Promise<Array<{ url: string, altText: string }>> {
  if (!files.length) return [];
  
  const uploadedImages: Array<{ url: string, altText: string }> = [];
  
  try {
    // Ensure bucket exists
    await ensureStorageBucket(bucket);
    
    // Process files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now();
      const extension = detectFileExtension(file);
      const path = `${productId}/${i === 0 ? 'main' : `additional_${i}`}_${timestamp}.${extension}`;
      
      const result = await uploadImage(file, path, bucket, true);
      if (result && result.url) {
        // Use product name for alt text if available
        const altText = productName 
          ? generateAltText(file.name, productName)
          : result.altText;
          
        uploadedImages.push({
          url: result.url,
          altText
        });
      }
    }
    
    return uploadedImages;
  } catch (error) {
    console.error("Error uploading product images:", error);
    return uploadedImages; // Return any successfully uploaded images
  }
}

/**
 * Download an image from a URL and save it to Supabase Storage
 */
export async function downloadProductImage(
  imageUrl: string,
  productId: string,
  productName?: string,
  isMain: boolean = false,
  bucket: string = 'product-images'
): Promise<{ url: string, altText: string } | null> {
  if (!imageUrl) return null;
  
  try {
    // Extract original filename from URL for SEO purposes
    const urlObj = new URL(imageUrl);
    const pathname = urlObj.pathname;
    const originalFilename = pathname.split('/').pop() || 'image.jpg';
    
    // Create a SEO-friendly version of the filename
    const seoFilename = prepareSeoFilename(originalFilename);
    
    // Create final path
    const timestamp = Date.now();
    const filename = `${productId}/${isMain ? 'main' : `additional_${timestamp}`}-${seoFilename}`;
    
    // Download and upload the image using the imported function from storageService
    const url = await downloadAndUploadImage(imageUrl, filename, bucket);
    
    if (!url) return null;
    
    // Generate alt text based on product name and original filename
    const altText = productName 
      ? generateAltText(originalFilename, productName)
      : generateAltText(originalFilename);
    
    return { url, altText };
  } catch (error) {
    console.error("Error downloading product image:", error);
    return null;
  }
}

export default {
  uploadImage,
  uploadProductImages,
  downloadProductImage,
  prepareSeoFilename,
  generateAltText,
  getMimeTypeFromExtension,
  createFileWithCorrectType,
  detectFileExtension,
  detectMimeTypeFromSignature
};
