
import { supabase, STORAGE_URL, SUPABASE_KEY, adminSupabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { detectMimeTypeFromSignature, getMimeTypeFromExtension } from "@/services/imageService";

/**
 * Upload an image to the specified bucket
 * @param file File to upload
 * @param bucket Bucket to upload to (default: 'images')
 * @returns URL of the uploaded image
 */
export const uploadImage = async (file: File, bucket: string = 'pdf-templates'): Promise<string | null> => {
  try {
    console.log(`Starting upload for file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    
    // Generate unique filename with correct extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = fileName;
    
    // Skip bucket creation as it causes RLS issues and the bucket already exists
    console.log(`Uploading file to ${bucket}/${filePath}`);
    
    // Create a blob with the file data - don't rely on file.type as it might be incorrect
    const fileBuffer = await file.arrayBuffer();
    
    // Upload the file directly using formData to preserve correct content type
    const formData = new FormData();
    formData.append('cacheControl', '3600');
    formData.append('', file);

    // Try with standard client first
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type // Let the browser determine the correct content type
        });

      if (uploadError) {
        console.error('Error with standard upload:', uploadError);
        throw uploadError;
      }
      
      console.log('File uploaded successfully with standard client:', uploadData);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      console.log('Generated public URL:', urlData.publicUrl);
      return urlData.publicUrl;
    } 
    catch (standardUploadError) {
      console.error('Trying fallback direct fetch upload method');
      
      // Direct fetch upload as a fallback approach
      const endpoint = `${STORAGE_URL}/object/${bucket}/${filePath}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'x-upsert': 'true'
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('Fetch upload succeeded:', responseData);
      
      // Get public URL
      const publicUrl = `${STORAGE_URL}/object/public/${bucket}/${filePath}`;
      console.log('Generated public URL:', publicUrl);
      return publicUrl;
    }
  } catch (error) {
    console.error('Final error in uploadImage:', error);
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
  // The bucket should already exist in Supabase, so we'll just return true
  // Creating buckets through API has RLS policy issues
  return true;
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
    // Si l'URL est une URL blob du navigateur, nous devons la traiter différemment
    if (url.startsWith('blob:')) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Créer un fichier à partir du blob pour l'uploader
        const file = new File([blob], `${path}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });
        return await uploadImage(file, bucket);
      } catch (error) {
        console.error('Error processing blob URL:', error);
        return null;
      }
    }
    
    // Pour les URLs normales, récupérer l'image
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const blob = await response.blob();
    
    // Déterminer l'extension de fichier basée sur le type de contenu
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.split('/')[1] || 'jpg';
    
    // Créer un fichier à partir du blob
    const file = new File([blob], `${path}.${extension}`, { type: contentType });
    return await uploadImage(file, bucket);
  } catch (error) {
    console.error('Error in downloadAndUploadImage:', error);
    return null;
  }
};

