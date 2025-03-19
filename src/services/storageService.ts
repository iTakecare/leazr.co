import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";

/**
 * Ensures that a storage bucket exists with the correct public access settings
 * @param bucketName The name of the bucket to create or check
 * @returns Promise<boolean> indicating success
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    // Use adminSupabase client for bucket operations to avoid RLS issues
    const supabase = getAdminSupabaseClient();
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking if bucket ${bucketName} exists:`, listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucketName}`);
      try {
        // Bucket doesn't exist yet in this session, but might exist in the database
        // We'll try to use it directly first
        const testUpload = await supabase.storage.from(bucketName).upload(
          'test-bucket-exists.txt', 
          new Blob(['test']), 
          { upsert: true }
        );
        
        if (!testUpload.error) {
          console.log(`Bucket ${bucketName} exists and is accessible`);
          // Clean up test file
          await supabase.storage.from(bucketName).remove(['test-bucket-exists.txt']);
          return true;
        }
        
        // If we're here, we need to explicitly create the bucket
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB limit
        });
        
        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
          return false;
        }
        
        console.log(`Successfully created bucket: ${bucketName}`);
        return true;
      } catch (e) {
        console.error(`Could not create bucket ${bucketName}:`, e);
        return false;
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
  const supabase = getAdminSupabaseClient();
  
  console.log(`Ensuring public access policy for bucket: ${bucketName}`);
  
  try {
    // Try creating the policy directly using SQL
    const { error } = await supabase.rpc('create_storage_policy', {
      bucket_name: bucketName,
      policy_name: `${bucketName}_public_access`,
      definition: 'true', // Allow all access
      policy_type: 'SELECT'
    });
    
    if (error) {
      console.warn(`Could not create public access policy for ${bucketName}:`, error);
      
      // Fallback: Try to directly make the bucket objects public through storage API
      const { error: policyError } = await supabase.storage.from(bucketName).getPublicUrl('test');
      if (policyError) {
        console.warn(`Could not verify public access for ${bucketName}:`, policyError);
      }
    }
  } catch (error) {
    console.warn(`Error creating policy for ${bucketName}:`, error);
  }
}

/**
 * Downloads and uploads an image to Supabase storage
 * @param imageUrl The URL of the image to download
 * @param filename A unique filename for the uploaded image
 * @param bucketName The name of the storage bucket
 * @returns The public URL of the uploaded image, or the original URL if there was an error
 */
export async function downloadAndUploadImage(
  imageUrl: string, 
  filename: string, 
  bucketName: string = 'product-images'
): Promise<string | null> {
  try {
    if (!imageUrl) {
      console.error("No image URL provided");
      return null;
    }
    
    console.log(`Processing image: ${imageUrl} for product: ${filename}`);
    
    // For external URLs, return the URL as-is
    if (imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)) {
      return imageUrl;
    }
    
    try {
      // Download the image with a 5 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(imageUrl, { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Failed to download image: ${response.status} ${response.statusText}`);
        return imageUrl;
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
        console.warn(`Failed to ensure storage bucket ${bucketName} exists, using original URL`);
        return imageUrl;
      }
      
      // Get Supabase client with admin privileges for storage operations
      const supabase = getAdminSupabaseClient();
      
      // Generate a unique filename with proper extension
      const uniqueFilename = `${filename.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${fileExtension}`;
      
      // Upload to Supabase Storage with explicit content type
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFilename, imageFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: correctMimeType
        });
        
      if (error) {
        console.error("Error uploading image to storage:", error);
        return imageUrl;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFilename);
        
      console.log(`Successfully uploaded image to: ${publicUrlData?.publicUrl}`);
      
      return publicUrlData?.publicUrl || imageUrl;
    } catch (fetchError) {
      console.warn("Error fetching/processing image:", fetchError);
      return imageUrl;
    }
  } catch (error) {
    console.error("Error in downloadAndUploadImage:", error);
    return imageUrl;
  }
}

// Make sure we export both the individual functions and a default export
export default {
  ensureStorageBucket,
  downloadAndUploadImage
};
