
import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { getMimeTypeFromExtension } from "@/services/imageService";

/**
 * Ensures that a storage bucket exists with the correct public access settings
 * @param bucketName The name of the bucket to create or check
 * @returns Promise<boolean> indicating success
 */
export async function ensureStorageBucket(bucketName: string): Promise<boolean> {
  try {
    console.log(`Checking if bucket ${bucketName} exists using supabase client...`);
    
    // Use regular supabase client first (not admin) to avoid any potential token issues
    let supabase = getSupabaseClient();
    
    // Check if bucket exists
    let { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log(`Error with regular client, trying admin client: ${listError.message}`);
      // Try with admin client as fallback
      supabase = getAdminSupabaseClient();
      const result = await supabase.storage.listBuckets();
      buckets = result.data;
      listError = result.error;
      
      if (listError) {
        console.error(`Error checking if bucket ${bucketName} exists with admin client:`, listError);
        
        // Last resort: try a direct bucket access test
        try {
          console.log(`Attempting direct bucket access test for ${bucketName}`);
          const testUpload = await supabase.storage.from(bucketName).upload(
            'test-bucket-exists.txt', 
            new Blob(['test']), 
            { upsert: true }
          );
          
          if (!testUpload.error) {
            console.log(`Bucket ${bucketName} exists and is accessible via direct test`);
            // Clean up test file
            await supabase.storage.from(bucketName).remove(['test-bucket-exists.txt']);
            return true;
          } else {
            console.log(`Direct test failed: ${testUpload.error.message}`);
            return false;
          }
        } catch (directError) {
          console.error(`Direct bucket test failed:`, directError);
          return false;
        }
      }
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} does not exist, creating it...`);
      
      // Try a direct bucket test first
      try {
        const testUpload = await supabase.storage.from(bucketName).upload(
          'test-bucket-exists.txt', 
          new Blob(['test']), 
          { upsert: true }
        );
        
        if (!testUpload.error) {
          console.log(`Bucket ${bucketName} already exists and is accessible`);
          // Clean up test file
          await supabase.storage.from(bucketName).remove(['test-bucket-exists.txt']);
          return true;
        } else {
          console.log(`Need to create bucket, direct access failed: ${testUpload.error.message}`);
        }
      } catch (directError) {
        console.log(`Direct bucket test failed with error:`, directError);
      }
      
      // Create the bucket
      try {
        const { error: createError } = await supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB limit
        });
        
        if (createError) {
          console.error(`Error creating bucket ${bucketName}:`, createError);
          return false;
        }
        
        // Create public access policy
        await createPublicPolicy(bucketName);
        
        console.log(`Successfully created bucket: ${bucketName}`);
        return true;
      } catch (e) {
        console.error(`Could not create bucket ${bucketName}:`, e);
        return false;
      }
    }
    
    console.log(`Bucket ${bucketName} already exists, no need to create it`);
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
 * Determines the correct MIME type for a file based on extension and binary analysis
 * @param fileOrBlob The file or blob to analyze
 * @param filename The filename (for extension detection)
 * @returns Promise with the corrected MIME type
 */
async function determineCorrectMimeType(fileOrBlob: File | Blob, filename: string): Promise<string> {
  // First try to get extension from filename
  const filenameExtension = filename.split('.').pop()?.toLowerCase();
  let mimeType = 'application/octet-stream'; // Default fallback
  
  // Check for WebP signature (52 49 46 46 XX XX XX XX 57 45 42 50)
  // WebP files start with "RIFF" followed by file size, then "WEBP"
  try {
    const buffer = await fileOrBlob.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // "RIFF"
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50   // "WEBP"
    ) {
      console.log("WebP signature detected in file");
      return "image/webp";
    }
    
    // Check for JPEG signature (FF D8 FF)
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      console.log("JPEG signature detected in file");
      return "image/jpeg";
    }
    
    // Check for PNG signature (89 50 4E 47 0D 0A 1A 0A)
    if (
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A
    ) {
      console.log("PNG signature detected in file");
      return "image/png";
    }
  } catch (e) {
    console.warn("Error analyzing file header:", e);
  }
  
  // If we didn't detect a signature, try extension detection
  if (filenameExtension) {
    mimeType = getMimeTypeFromExtension(filenameExtension, mimeType);
    console.log(`Determined MIME type from extension: ${mimeType}`);
  }
  
  // If the file is a File object with a type, use it as a fallback if our detection failed
  if (fileOrBlob instanceof File && fileOrBlob.type && mimeType === 'application/octet-stream') {
    mimeType = fileOrBlob.type;
    console.log(`Using File.type as fallback: ${mimeType}`);
  }
  
  return mimeType;
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
    
    console.log(`Processing image: ${imageUrl} for filename: ${filename}`);
    
    // For external URLs that aren't from our domain, we can return the URL as-is
    if (imageUrl.startsWith('http') && !imageUrl.includes(window.location.hostname)) {
      console.log("External URL detected, returning original URL");
      return imageUrl;
    }
    
    try {
      // Download the image with a 5 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      console.log("Fetching image...");
      const response = await fetch(imageUrl, { 
        signal: controller.signal,
        headers: {
          // Add typical browser headers to avoid server restrictions
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Failed to download image: ${response.status} ${response.statusText}`);
        return imageUrl;
      }
      
      // Extract content type from response headers
      const contentType = response.headers.get('content-type');
      console.log(`Server reported content type: ${contentType}`);
      
      // Get image as array buffer
      const imageArrayBuffer = await response.arrayBuffer();
      console.log(`Downloaded image size: ${imageArrayBuffer.byteLength} bytes`);
      
      // Determine file extension and correct MIME type
      let fileExtension = '';
      
      // Try to get extension from URL first
      if (imageUrl.includes('.')) {
        fileExtension = imageUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || '';
        console.log(`URL suggests file extension: ${fileExtension}`);
      }
      
      // If extension is invalid or too long, determine from content type
      if (!fileExtension || fileExtension.length > 5 || !/^[a-z0-9]+$/.test(fileExtension)) {
        console.log("Determining extension from content type");
        
        if (contentType?.includes('jpeg') || contentType?.includes('jpg')) fileExtension = 'jpg';
        else if (contentType?.includes('png')) fileExtension = 'png';
        else if (contentType?.includes('gif')) fileExtension = 'gif';
        else if (contentType?.includes('webp')) fileExtension = 'webp';
        else if (contentType?.includes('svg')) fileExtension = 'svg';
        else fileExtension = 'jpg'; // Default fallback
        
        console.log(`Content type suggests file extension: ${fileExtension}`);
      }
      
      // Create a blob with the image data
      const imageBlob = new Blob([imageArrayBuffer]);
      
      // Analyze the blob to determine its actual MIME type
      const uniqueFilename = `${filename.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.${fileExtension}`;
      const detectedMimeType = await determineCorrectMimeType(imageBlob, uniqueFilename);
      
      // Create a properly typed file with correct MIME type
      const imageFile = new File([imageArrayBuffer], uniqueFilename, { 
        type: detectedMimeType
      });
      
      console.log(`Created file with name: ${uniqueFilename} and type: ${detectedMimeType}`);
      
      // Make sure storage bucket exists
      console.log(`Ensuring bucket ${bucketName} exists...`);
      const bucketExists = await ensureStorageBucket(bucketName);
      if (!bucketExists) {
        console.warn(`Failed to ensure storage bucket ${bucketName} exists, using original URL`);
        return imageUrl;
      }
      
      // Get Supabase client
      let supabase = getSupabaseClient();
      
      console.log(`Uploading image to ${uniqueFilename} with content type ${detectedMimeType}`);
      
      // Upload to Supabase Storage with explicit content type
      let { error, data } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFilename, imageFile, {
          cacheControl: '3600',
          upsert: true,
          contentType: detectedMimeType
        });
        
      if (error) {
        console.error("Error uploading image to storage with regular client:", error);
        
        // Fallback: Try using admin client
        const adminSupabase = getAdminSupabaseClient();
        console.log("Retrying upload with admin client...");
        
        const adminResult = await adminSupabase.storage
          .from(bucketName)
          .upload(uniqueFilename, imageFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: detectedMimeType
          });
          
        if (adminResult.error) {
          console.error("Error uploading image with admin client:", adminResult.error);
          return imageUrl;
        }
        
        data = adminResult.data;
        
        // Get public URL using admin client
        const { data: adminPublicUrlData } = adminSupabase.storage
          .from(bucketName)
          .getPublicUrl(data.path);
          
        console.log(`Successfully uploaded image to: ${adminPublicUrlData?.publicUrl}`);
        
        return adminPublicUrlData?.publicUrl || imageUrl;
      }
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);
        
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
