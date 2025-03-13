
import { getSupabaseClient } from "@/integrations/supabase/client";
import { ensureStorageBucket, downloadAndUploadImage } from "./storageService";

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
    // Ensure bucket exists
    const bucketExists = await ensureStorageBucket(bucket);
    if (!bucketExists) {
      throw new Error(`Failed to ensure storage bucket ${bucket} exists`);
    }

    // Get original filename for SEO purposes
    const originalFilename = file.name;
    const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg';
    
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

    // Verify the file is an image
    if (!file.type.startsWith('image/')) {
      console.warn(`File is not a valid image, detected type: ${file.type}`);
      
      // Determine type based on extension
      let contentType = 'image/jpeg'; // Default type
      
      if (extension === 'png') contentType = 'image/png';
      else if (extension === 'gif') contentType = 'image/gif';
      else if (extension === 'webp') contentType = 'image/webp';
      else if (extension === 'svg') contentType = 'image/svg+xml';
      
      // Create a new blob with the correct type
      const fileArrayBuffer = await file.arrayBuffer();
      const correctedFile = new File(
        [fileArrayBuffer], 
        file.name, 
        { type: contentType }
      );
      
      // Use this new file
      file = correctedFile;
      console.log(`Corrected file type: ${file.type}`);
    }
    
    // Get Supabase client
    const supabase = getSupabaseClient();
    
    console.log(`Uploading image of type: ${file.type} to path: ${finalPath}`);
    
    // Upload the file with explicit content type
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(finalPath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });
      
    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
      
    console.log(`Successfully uploaded image to: ${publicUrlData?.publicUrl}`);
    
    return {
      url: publicUrlData?.publicUrl || null,
      altText
    };
  } catch (error) {
    console.error("Error in uploadImage:", error);
    return null;
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
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
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
    
    // Download and upload the image
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
  generateAltText
};
