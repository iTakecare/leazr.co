
import { supabase } from "@/integrations/supabase/client";

/**
 * Upload an image to the product-images bucket
 * @param file File object to upload
 * @param productId Product ID to associate with the image
 * @param isMainImage Whether this is the main product image
 * @returns Promise with the public URL of the uploaded image
 */
export const uploadProductImage = async (
  file: File,
  productId: string,
  isMainImage: boolean = false
): Promise<string> => {
  try {
    if (!file) throw new Error("No file provided");
    
    // Get file extension
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}${isMainImage ? '-main' : `-${Date.now()}`}.${fileExt}`;
    const filePath = `${productId}/${fileName}`;
    
    console.log(`Uploading image to path: ${filePath}`);
    
    // Upload the file with explicit content type
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      throw new Error(error.message);
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data?.path || filePath);
    
    console.log(`Image uploaded successfully: ${publicUrlData?.publicUrl}`);
    
    return publicUrlData?.publicUrl || '';
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};

/**
 * Updates a product's image URL in the database
 * @param productId Product ID
 * @param imageUrl Image URL
 * @param isMainImage Whether this is the main product image
 */
export const updateProductImage = async (
  productId: string,
  imageUrl: string,
  isMainImage: boolean = true
): Promise<void> => {
  try {
    if (isMainImage) {
      // Update the main image
      const { error } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', productId);
      
      if (error) {
        console.error('Error updating product image:', error);
        throw error;
      }
    } else {
      // Get current image_urls array
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching product image_urls:', fetchError);
        throw fetchError;
      }
      
      let imageUrls = product?.image_urls || [];
      if (!Array.isArray(imageUrls)) {
        imageUrls = [];
      }
      
      // Add new URL to the array
      const { error: updateError } = await supabase
        .from('products')
        .update({
          image_urls: [...imageUrls, imageUrl]
        })
        .eq('id', productId);
      
      if (updateError) {
        console.error('Error updating product image_urls:', updateError);
        throw updateError;
      }
    }
  } catch (error) {
    console.error('Error in updateProductImage:', error);
    throw error;
  }
};

export default {
  uploadProductImage,
  updateProductImage
};
