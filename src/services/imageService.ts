
/**
 * Service pour gérer le téléchargement et la manipulation d'images
 */

export const uploadProductImage = async (file: File, productId: string, isMainImage = false) => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get file extension
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}${isMainImage ? '-main' : `-${Date.now()}`}.${fileExt}`;
    const filePath = `product-images/${fileName}`;
    
    // Check if bucket exists - we know it already exists from your information
    console.log(`Uploading image to path: ${filePath} in product-images bucket`);
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error(uploadError.message);
    }
    
    // Get public URL
    const { data: publicURL } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    // Update product with image URL
    if (isMainImage) {
      await supabase.from('products').update({
        image_url: publicURL.publicUrl
      }).eq('id', productId);
    } else {
      // Get current image_urls array
      const { data: product } = await supabase.from('products')
        .select('image_urls')
        .eq('id', productId)
        .single();
      
      let imageUrls = product?.image_urls || [];
      if (!Array.isArray(imageUrls)) {
        imageUrls = [];
      }
      
      // Add new URL and update
      await supabase.from('products').update({
        image_urls: [...imageUrls, publicURL.publicUrl]
      }).eq('id', productId);
    }
    
    return publicURL.publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};
