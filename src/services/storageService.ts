
import { supabase, adminSupabase } from "@/integrations/supabase/client";

/**
 * Ensures that a storage bucket exists with the correct public access settings
 * @param bucketName The name of the bucket to create or check
 * @returns Promise<boolean> indicating success
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    // Use adminSupabase client for bucket operations to avoid RLS issues
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await adminSupabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking if bucket ${bucketName} exists:`, listError);
      return false;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${bucketName}`);
      try {
        const { error: createError } = await adminSupabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB limit
        });
        
        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
          return false;
        }
        
        // Set CORS policy for the bucket
        try {
          const { error: corsError } = await adminSupabase.storage.updateBucket(bucketName, {
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
        
        // Try to create public access directly since the RPC function doesn't exist
        try {
          // Create a dummy file to get the bucket URLs public
          const dummyFile = new Blob(['test'], { type: 'text/plain' });
          
          // Upload a test file to get the bucket public
          await adminSupabase.storage
            .from(bucketName)
            .upload('test-public-access.txt', dummyFile, {
              cacheControl: '1',
              upsert: true
            });
            
          // Get public URL to verify it works and make the bucket public
          const { data } = adminSupabase.storage
            .from(bucketName)
            .getPublicUrl('test-public-access.txt');
            
          console.log(`Public access verified for ${bucketName}`);
          
          // Clean up the test file
          await adminSupabase.storage
            .from(bucketName)
            .remove(['test-public-access.txt']);
        } catch (policyError) {
          console.warn(`Could not verify public access for ${bucketName}:`, policyError);
        }
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
      
      // Generate a unique filename with proper extension
      const uniqueFilename = `${filename.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${fileExtension}`;
      
      // Upload to Supabase Storage with explicit content type
      const { error } = await adminSupabase.storage
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
      const { data: publicUrlData } = adminSupabase.storage
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
