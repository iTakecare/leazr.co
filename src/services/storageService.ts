
import { supabase, STORAGE_URL, SUPABASE_KEY, adminSupabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Upload an image to the specified bucket
 * @param file File to upload
 * @param bucket Bucket to upload to (default: 'images')
 * @returns URL of the uploaded image
 */
export const uploadImage = async (file: File, bucket: string = 'pdf-templates'): Promise<string | null> => {
  try {
    // Préparer le fichier pour l'upload
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    console.log(`Uploading file to ${bucket}/${filePath} with type ${file.type}`);
    
    // Créer un blob avec le type de contenu correct
    const contentType = file.type || `image/${fileExt}`;
    const arrayBuffer = await file.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: contentType });
    
    // Essayer d'uploader directement sans vérifier si le bucket existe
    // Utiliser d'abord le client standard
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });
    
    if (error) {
      console.error('Error uploading file:', error);
      
      // Si l'erreur est liée à l'absence du bucket, essayer de l'utiliser avec le client admin
      if (error.message.includes('The resource was not found') || 
          error.message.includes('bucket') || 
          error.message.includes('policy')) {
        console.log('Trying with admin client...');
        
        // Essayer avec le client admin
        const { data: adminData, error: adminError } = await adminSupabase.storage
          .from(bucket)
          .upload(filePath, fileBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: contentType
          });
        
        if (adminError) {
          console.error('Error uploading file with admin client:', adminError);
          return null;
        }
        
        console.log('File uploaded successfully with admin client:', adminData);
        
        // Obtenir l'URL publique
        const { data: urlData } = adminSupabase.storage
          .from(bucket)
          .getPublicUrl(filePath);
        
        return urlData.publicUrl;
      }
      
      return null;
    }
    
    console.log('File uploaded successfully:', data);
    
    // Obtenir l'URL publique
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
    // D'abord vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }
    
    // Vérifier si notre bucket est dans la liste
    const bucketExists = buckets.some(b => b.name === bucket);
    
    if (bucketExists) {
      console.log(`Bucket ${bucket} already exists`);
      return true;
    }
    
    console.log(`Bucket ${bucket} does not exist, trying to create with standard client`);
    
    // Créer le bucket s'il n'existe pas
    // Essayer d'abord avec le client standard
    const { data, error } = await supabase.storage.createBucket(bucket, {
      public: true
    });
    
    if (error) {
      console.error(`Error creating bucket ${bucket}:`, error);
      
      // Essayer avec le client admin
      console.log(`Trying to create bucket ${bucket} with admin client`);
      const { data: adminData, error: adminError } = await adminSupabase.storage.createBucket(bucket, {
        public: true
      });
      
      if (adminError) {
        console.error(`Error creating bucket ${bucket} with admin client:`, adminError);
        return false;
      }
      
      console.log(`Created bucket ${bucket} successfully with admin client`);
      return true;
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
    // Si l'URL est une URL blob du navigateur, nous devons la traiter différemment
    if (url.startsWith('blob:')) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Générer un nom de fichier pour ce blob
        const extension = blob.type.split('/')[1] || 'jpg';
        const fileName = `${path}.${extension}`;
        
        // Créer un nouveau blob avec le type de contenu explicite
        const contentType = blob.type || `image/${extension}`;
        const arrayBuffer = await blob.arrayBuffer();
        const fileBlob = new Blob([arrayBuffer], { type: contentType });
        
        // Upload vers Supabase avec le type de contenu explicite
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(fileName, fileBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: contentType
          });
        
        if (error) {
          console.error('Error uploading blob:', error);
          
          // Essayer avec le client admin
          const { data: adminData, error: adminError } = await adminSupabase.storage
            .from(bucket)
            .upload(fileName, fileBlob, {
              cacheControl: '3600',
              upsert: true,
              contentType: contentType
            });
          
          if (adminError) {
            console.error('Error uploading blob with admin client:', adminError);
            return null;
          }
          
          // Obtenir l'URL publique
          const { data: urlData } = adminSupabase.storage
            .from(bucket)
            .getPublicUrl(fileName);
            
          return urlData.publicUrl;
        }
        
        // Obtenir l'URL publique
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);
          
        return urlData.publicUrl;
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
    const fileName = `${path}.${extension}`;
    
    // Créer un nouveau blob avec le type de contenu explicite
    const arrayBuffer = await blob.arrayBuffer();
    const fileBlob = new Blob([arrayBuffer], { type: contentType });
    
    // Upload vers Supabase avec le type de contenu explicite
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      
      // Essayer avec le client admin
      const { data: adminData, error: adminError } = await adminSupabase.storage
        .from(bucket)
        .upload(fileName, fileBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: contentType
        });
      
      if (adminError) {
        console.error('Error uploading image with admin client:', adminError);
        return null;
      }
      
      // Obtenir l'URL publique
      const { data: urlData } = adminSupabase.storage
        .from(bucket)
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    }
    
    // Obtenir l'URL publique
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in downloadAndUploadImage:', error);
    return null;
  }
};
