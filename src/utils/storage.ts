
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if a storage bucket exists
 * @param bucketName The name of the bucket to check
 * @returns True if the bucket exists, false otherwise
 */
export const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Checking if bucket exists: ${bucketName}`);
    
    // Try to list buckets first
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error checking buckets:", error);
      return false;
    }
    
    const exists = buckets.some(bucket => bucket.name === bucketName);
    console.log(`Bucket ${bucketName} exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error("Error in checkBucketExists:", error);
    return false;
  }
};

/**
 * Ensures a folder exists in a bucket by creating an empty placeholder file if needed
 * @param bucketName The name of the bucket
 * @param folderPath The folder path within the bucket
 * @returns True if successful, false otherwise
 */
export const ensureFolderExists = async (bucketName: string, folderPath: string): Promise<boolean> => {
  try {
    console.log(`Ensuring folder exists: ${bucketName}/${folderPath}`);
    
    // Check if folder already exists
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);
    
    if (!error && data && data.length > 0) {
      // Folder exists
      console.log(`Folder ${folderPath} already exists in bucket ${bucketName}`);
      return true;
    }
    
    // Create an empty placeholder file to ensure the folder exists
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(`${folderPath}/.placeholder`, new Blob([]), {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Error creating folder:", uploadError);
      return false;
    }
    
    console.log(`Successfully created folder: ${bucketName}/${folderPath}`);
    return true;
  } catch (error) {
    console.error("Error in ensureFolderExists:", error);
    return false;
  }
};
