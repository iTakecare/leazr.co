
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
