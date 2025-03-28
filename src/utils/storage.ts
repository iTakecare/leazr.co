
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if a storage bucket exists
 * @param bucketName The name of the bucket to check
 * @returns True if the bucket exists, false otherwise
 */
export const checkBucketExists = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Vérification de l'existence du bucket: ${bucketName}`);
    
    // Try to list buckets first
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Erreur lors de la vérification des buckets:", error);
      return false;
    }
    
    const exists = buckets.some(bucket => bucket.name === bucketName);
    console.log(`Bucket ${bucketName} existe: ${exists}`);
    return exists;
  } catch (error) {
    console.error("Erreur dans checkBucketExists:", error);
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
    console.log(`Vérification de l'existence du dossier: ${bucketName}/${folderPath}`);
    
    // Check if folder already exists
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folderPath);
    
    if (!error && data && data.length > 0) {
      // Folder exists
      console.log(`Le dossier ${folderPath} existe déjà dans le bucket ${bucketName}`);
      return true;
    }
    
    console.log(`Création du dossier ${folderPath} dans le bucket ${bucketName}`);
    
    // Create an empty placeholder file to ensure the folder exists
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(`${folderPath}/.placeholder`, new Blob([]), {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (uploadError) {
      console.error("Erreur lors de la création du dossier:", uploadError);
      return false;
    }
    
    console.log(`Dossier créé avec succès: ${bucketName}/${folderPath}`);
    return true;
  } catch (error) {
    console.error("Erreur dans ensureFolderExists:", error);
    return false;
  }
};
