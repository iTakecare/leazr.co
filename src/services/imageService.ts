
import { getSupabaseClient } from "@/integrations/supabase/client";
import { ensureStorageBucket, downloadAndUploadImage } from "./storageService";

/**
 * Upload an image file to Supabase Storage
 * @param file The file to upload
 * @param path The path to store the file at (including filename)
 * @param bucket The bucket to store the file in
 * @returns The public URL of the uploaded file or null if there was an error
 */
export async function uploadImage(
  file: File,
  path: string,
  bucket: string = 'product-images'
): Promise<string | null> {
  try {
    // Ensure bucket exists
    const bucketExists = await ensureStorageBucket(bucket);
    if (!bucketExists) {
      throw new Error(`Failed to ensure storage bucket ${bucket} exists`);
    }

    // Verify the file is an image
    if (!file.type.startsWith('image/')) {
      console.warn(`File is not a valid image, detected type: ${file.type}`);
      
      // Determine type based on extension
      const extension = file.name.split('.').pop()?.toLowerCase();
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
    
    console.log(`Uploading image of type: ${file.type} to path: ${path}`);
    
    // Upload the file with explicit content type
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
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
    
    return publicUrlData?.publicUrl || null;
  } catch (error) {
    console.error("Error in uploadImage:", error);
    return null;
  }
}

/**
 * Upload multiple images for a product
 * @param files Array of image files to upload
 * @param productId The product ID
 * @param bucket The storage bucket name
 * @returns Array of uploaded image URLs
 */
export async function uploadProductImages(
  files: File[],
  productId: string,
  bucket: string = 'product-images'
): Promise<string[]> {
  if (!files.length) return [];
  
  const uploadedUrls: string[] = [];
  
  try {
    // Ensure bucket exists
    await ensureStorageBucket(bucket);
    
    // Process files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const timestamp = Date.now();
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${productId}/${i === 0 ? 'main' : `additional_${i}`}_${timestamp}.${extension}`;
      
      const url = await uploadImage(file, path, bucket);
      if (url) {
        uploadedUrls.push(url);
      }
    }
    
    return uploadedUrls;
  } catch (error) {
    console.error("Error uploading product images:", error);
    return uploadedUrls; // Return any successfully uploaded images
  }
}

/**
 * Download an image from a URL and save it to Supabase Storage
 */
export async function downloadProductImage(
  imageUrl: string,
  productId: string,
  isMain: boolean = false,
  bucket: string = 'product-images'
): Promise<string | null> {
  if (!imageUrl) return null;
  
  try {
    const filename = `${productId}/${isMain ? 'main' : `additional_${Date.now()}`}`;
    return await downloadAndUploadImage(imageUrl, filename, bucket);
  } catch (error) {
    console.error("Error downloading product image:", error);
    return null;
  }
}

export default {
  uploadImage,
  uploadProductImages,
  downloadProductImage
};
