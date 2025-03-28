
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { checkBucketExists, ensureFolderExists } from "@/utils/storage";

/**
 * Detects the file extension from a File object
 */
export const detectFileExtension = (file: File): string => {
  if (file.name.includes('.')) {
    return file.name.split('.').pop()?.toLowerCase() || 'jpg';
  }
  
  // Fallback based on mime type
  const mimeType = file.type.toLowerCase();
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('gif')) return 'gif';
  return 'jpg'; // Default to jpg
};

/**
 * Detects the MIME type from the file's binary signature
 */
export const detectMimeTypeFromSignature = async (file: File): Promise<string | null> => {
  try {
    // Read the first few bytes to detect file signature
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 12));
    
    // Check for common image signatures
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }
    
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return 'image/png';
    }
    
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }
    
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }
    
    // SVG detection (text-based, harder to detect by signature)
    if (file.type === 'image/svg+xml') {
      return 'image/svg+xml';
    }
    
    // Default fallback to the browser-reported type
    return file.type || null;
  } catch (e) {
    console.error("Error detecting MIME type:", e);
    return null;
  }
};

/**
 * Uploads an image to Supabase Storage
 */
export const uploadImage = async (
  fileOrPath: File | string,
  bucketName: string,
  folderPath?: string
): Promise<{ url: string } | null> => {
  try {
    console.log(`Uploading to bucket: ${bucketName}, folder: ${folderPath || 'root'}`);
    
    // Handle the case where a file path string is provided instead of a File object
    if (typeof fileOrPath === 'string') {
      // This is just a URL/path, return it directly
      return { url: fileOrPath };
    }
    
    // Vérifier si le bucket existe
    const bucketExists = await checkBucketExists(bucketName);
    if (!bucketExists) {
      console.error(`Bucket ${bucketName} does not exist`);
      toast.error(`Le bucket ${bucketName} n'existe pas`);
      return null;
    }
    
    // We're dealing with a File object
    const file = fileOrPath;
    const extension = detectFileExtension(file);
    const fileName = `${folderPath ? folderPath + '/' : ''}${uuidv4()}.${extension}`;
    const mimeType = await detectMimeTypeFromSignature(file) || file.type;
    
    console.log(`File name: ${fileName}, MIME type: ${mimeType}`);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        contentType: mimeType,
        upsert: true
      });
    
    if (error) {
      console.error("Upload error:", error);
      throw error;
    }
    
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    console.log("Upload successful, URL:", urlData?.publicUrl);
    
    return { url: urlData?.publicUrl || '' };
  } catch (error: any) {
    console.error("Error in uploadImage:", error);
    return null;
  }
};

/**
 * Uploads a product image specifically
 */
export const uploadProductImage = async (
  file: File,
  productId: string,
  isMain: boolean = false
): Promise<string | null> => {
  try {
    const BUCKET_NAME = 'catalog';
    
    // Vérifier si le bucket existe
    const bucketExists = await checkBucketExists(BUCKET_NAME);
    if (!bucketExists) {
      console.error(`Bucket ${BUCKET_NAME} n'existe pas`);
      toast.error(`Le bucket ${BUCKET_NAME} n'existe pas`);
      return null;
    }
    
    // Créer le dossier du produit s'il n'existe pas
    const folderPath = `products/${productId}`;
    const folderOk = await ensureFolderExists(BUCKET_NAME, folderPath);
    if (!folderOk) {
      console.error(`Impossible de créer le dossier ${folderPath}`);
      toast.error(`Erreur lors de la création du dossier`);
      return null;
    }
    
    const extension = detectFileExtension(file);
    const fileName = `${isMain ? 'main' : uuidv4()}.${extension}`;
    const filePath = `${folderPath}/${fileName}`;
    const mimeType = await detectMimeTypeFromSignature(file) || file.type;
    
    console.log(`Uploading product image: ${fileName}, MIME type: ${mimeType}`);
    
    // Upload the actual image file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: true
      });
    
    if (error) {
      console.error("Product image upload error:", error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
      return null;
    }
    
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    const imageUrl = urlData?.publicUrl || '';
    console.log("Product image upload successful, URL:", imageUrl);
    
    // Update the product's image URL if this is the main image
    if (isMain) {
      try {
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', productId);
        
        if (updateError) {
          console.error("Error updating product image URL:", updateError);
        } else {
          console.log(`Successfully updated product ${productId} with main image URL`);
        }
      } catch (updateErr) {
        console.error("Exception when updating product image URL:", updateErr);
      }
    }
    
    return imageUrl;
  } catch (error: any) {
    console.error("Error in uploadProductImage:", error);
    toast.error(`Erreur lors de l'upload de l'image: ${error.message}`);
    return null;
  }
};
