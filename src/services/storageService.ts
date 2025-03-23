
import { supabase, STORAGE_URL, SUPABASE_KEY } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload an image to the specified bucket
 * @param file File to upload
 * @param bucket Bucket to upload to (default: 'images')
 * @returns URL of the uploaded image
 */
export const uploadImage = async (file: File, bucket: string = 'pdf-templates'): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    console.log(`Uploading file to ${bucket}/${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
    
    console.log('File uploaded successfully:', data);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

/**
 * Delete an image from the specified bucket
 * @param path Path of the image to delete
 * @param bucket Bucket to delete from (default: 'images')
 */
export const deleteImage = async (path: string, bucket: string = 'images'): Promise<boolean> => {
  try {
    // Extract the file name from the path
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([fileName]);
    
    if (error) {
      console.error('Error deleting file:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteImage:', error);
    return false;
  }
};

/**
 * Ensure that a storage bucket exists
 * @param bucket Name of the bucket to check/create
 * @returns Boolean indicating if the bucket exists or was created
 */
export const ensureStorageBucket = async (bucket: string): Promise<boolean> => {
  try {
    // First check if the bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }
    
    // Check if our bucket is in the list
    const bucketExists = buckets.some(b => b.name === bucket);
    
    if (bucketExists) {
      console.log(`Bucket ${bucket} already exists`);
      return true;
    }
    
    // Create the bucket if it doesn't exist
    const { data, error } = await supabase.storage.createBucket(bucket, {
      public: true
    });
    
    if (error) {
      console.error(`Error creating bucket ${bucket}:`, error);
      return false;
    }
    
    console.log(`Created bucket ${bucket} successfully`);
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket ${bucket} exists:`, error);
    return false;
  }
};

/**
 * Download an image from a URL and upload it to Supabase storage
 * @param url The URL of the image to download
 * @param path The path to save the image to in the bucket
 * @param bucket The bucket to upload to
 * @returns The URL of the uploaded image or null if there was an error
 */
export const downloadAndUploadImage = async (
  url: string,
  path: string,
  bucket: string = 'images'
): Promise<string | null> => {
  try {
    // First ensure the bucket exists
    const bucketExists = await ensureStorageBucket(bucket);
    if (!bucketExists) {
      console.error(`Failed to ensure bucket ${bucket} exists`);
      return null;
    }
    
    // If the URL is a blob URL from the browser, we need to handle it differently
    if (url.startsWith('blob:')) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Generate a file name for this blob
        const extension = blob.type.split('/')[1] || 'jpg';
        const fileName = `${path}.${extension}`;
        
        // Upload to Supabase
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, blob, {
            cacheControl: '3600',
            upsert: true
          });
        
        if (error) {
          console.error('Error uploading blob:', error);
          return null;
        }
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
          
        return urlData.publicUrl;
      } catch (error) {
        console.error('Error processing blob URL:', error);
        return null;
      }
    }
    
    // For regular URLs, fetch the image
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const blob = await response.blob();
    
    // Determine file extension based on content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.split('/')[1] || 'jpg';
    const fileName = `${path}.${extension}`;
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in downloadAndUploadImage:', error);
    return null;
  }
};
