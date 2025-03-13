
import { getSupabaseClient } from "@/integrations/supabase/client";

/**
 * Ensures that a storage bucket exists with the correct public access settings
 * @param bucketName The name of the bucket to create or check
 * @returns Promise<boolean> indicating success
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking if bucket ${bucketName} exists:`, listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucketName}`);
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB limit
      });
      
      if (createError) {
        console.error(`Error creating bucket ${bucketName}:`, createError);
        return false;
      }
      
      // Set CORS policy for the bucket
      try {
        const { error: corsError } = await supabase.storage.updateBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
        });
        
        if (corsError) {
          console.warn(`Could not set CORS policy for ${bucketName}:`, corsError);
        }
      } catch (corsError) {
        console.warn(`Error setting CORS policy for ${bucketName}:`, corsError);
      }
      
      // Create public access policy
      try {
        await createPublicPolicy(bucketName);
      } catch (policyError) {
        console.warn(`Could not create policy for ${bucketName}:`, policyError);
        // Continue anyway since the bucket was created
      }
    }
    
    return true;
  } catch (error) {
    console.error(`Unexpected error ensuring bucket ${bucketName}:`, error);
    return false;
  }
}

/**
 * Creates a public access policy for a bucket
 */
async function createPublicPolicy(bucketName: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  console.log(`Ensuring public access policy for bucket: ${bucketName}`);
  
  // Create RLS policy to allow public access
  const { error } = await supabase.rpc('create_storage_policy', {
    bucket_name: bucketName,
    policy_name: `${bucketName}_public_access`,
    definition: 'true', // Allow all access
    policy_type: 'SELECT'
  });
  
  if (error) {
    console.warn(`Could not create public access policy for ${bucketName}:`, error);
  }
}

/**
 * Downloads and uploads an image to Supabase storage
 * @param imageUrl The URL of the image to download
 * @param filename A unique filename for the uploaded image
 * @param bucketName The name of the storage bucket
 * @returns The public URL of the uploaded image, or null if there was an error
 */
export async function downloadAndUploadImage(
  imageUrl: string, 
  filename: string, 
  bucketName: string = 'product-images'
): Promise<string | null> {
  try {
    console.log(`Downloading image from: ${imageUrl}`);
    
    // Download the image with a 10 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(imageUrl, { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      // Extract content type and handle based on the type
      const contentType = response.headers.get('content-type');
      
      // Get file extension from URL or content type
      let fileExtension = '';
      if (imageUrl.includes('.')) {
        fileExtension = imageUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
      }
      
      if (!fileExtension || fileExtension.length > 5) {
        // Fallback: determine extension from content type
        if (contentType?.includes('jpeg') || contentType?.includes('jpg')) fileExtension = 'jpg';
        else if (contentType?.includes('png')) fileExtension = 'png';
        else if (contentType?.includes('gif')) fileExtension = 'gif';
        else if (contentType?.includes('webp')) fileExtension = 'webp';
        else if (contentType?.includes('svg')) fileExtension = 'svg';
        else fileExtension = 'jpg'; // Default fallback
      }
      
      // Determine the correct MIME type based on extension
      let correctMimeType: string;
      switch (fileExtension) {
        case 'png': correctMimeType = 'image/png'; break;
        case 'gif': correctMimeType = 'image/gif'; break;
        case 'webp': correctMimeType = 'image/webp'; break;
        case 'svg': correctMimeType = 'image/svg+xml'; break;
        default: correctMimeType = 'image/jpeg'; // Default to JPEG
      }
      
      console.log(`File extension: ${fileExtension}, setting MIME type to: ${correctMimeType}`);
      
      // Get image as array buffer
      const imageArrayBuffer = await response.arrayBuffer();
      
      // Create a properly typed blob
      const imageBlob = new Blob([imageArrayBuffer], { type: correctMimeType });
      
      // Convert blob to file with proper extension to ensure correct handling
      const imageFile = new File(
        [imageBlob], 
        `${filename}.${fileExtension}`, 
        { type: correctMimeType }
      );
      
      // Make sure storage bucket exists
      const bucketExists = await ensureStorageBucket(bucketName);
      if (!bucketExists) {
        throw new Error(`Failed to ensure storage bucket ${bucketName} exists`);
      }
      
      // Get Supabase client
      const supabase = getSupabaseClient();
      
      // Generate a unique filename with proper extension
      const uniqueFilename = `${filename.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${fileExtension}`;
      console.log(`Uploading image to Supabase with filename: ${uniqueFilename}`);
      
      // Upload to Supabase Storage with explicit content type
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFilename, imageFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: correctMimeType
        });
        
      if (error) {
        console.error("Error uploading image to storage:", error);
        return null;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFilename);
        
      console.log(`Successfully uploaded image to: ${publicUrlData?.publicUrl}`);
      
      return publicUrlData?.publicUrl || null;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error downloading and uploading image:", error);
    return null;
  }
}

// Make sure we export both the individual functions and a default export
export default {
  ensureStorageBucket,
  downloadAndUploadImage
};
