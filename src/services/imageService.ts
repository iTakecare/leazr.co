
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { ensureStorageBucket } from "@/services/storageService";

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
    
    // Ensure bucket exists before upload
    const bucketExists = await ensureStorageBucket(BUCKET_NAME);
    if (!bucketExists) {
      console.error(`Bucket ${BUCKET_NAME} does not exist and could not be created`);
      toast.error(`Le bucket ${BUCKET_NAME} n'existe pas et n'a pas pu être créé`);
      return null;
    }
    
    const extension = detectFileExtension(file);
    const folderPath = `products/${productId}`;
    const fileName = `${isMain ? 'main' : uuidv4()}.${extension}`;
    const mimeType = await detectMimeTypeFromSignature(file) || file.type;
    
    console.log(`Uploading product image: ${fileName}, MIME type: ${mimeType}`);
    
    // Create empty placeholder file to ensure folder exists
    try {
      const { error: placeholderError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`${folderPath}/.placeholder`, new Blob([]), {
          contentType: 'text/plain',
          upsert: true
        });
      
      if (placeholderError && !placeholderError.message.includes('The resource already exists')) {
        console.warn("Warning creating folder placeholder:", placeholderError);
      }
    } catch (e) {
      console.warn("Exception creating folder placeholder (continuing):", e);
    }
    
    // Upload the actual image file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`${folderPath}/${fileName}`, file, {
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
      .getPublicUrl(`${folderPath}/${fileName}`);
    
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
