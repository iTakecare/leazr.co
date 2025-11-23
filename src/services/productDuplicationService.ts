import { supabase, getFileUploadClient } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

export interface DuplicateProductOptions {
  productId: string;
  copyImages?: boolean;
  copyUpsells?: boolean;
  copyVariantPrices?: boolean;
  nameSuffix?: string;
}

interface DuplicateProductResult {
  product: Product;
  success: boolean;
  error?: string;
}

/**
 * Generate a unique slug by appending timestamp
 */
const generateUniqueSlug = async (baseSlug: string, companyId: string): Promise<string> => {
  const timestamp = Date.now();
  let newSlug = `${baseSlug}-copie-${timestamp}`;
  
  // Check if slug exists
  const { data } = await supabase
    .from('products')
    .select('id')
    .eq('company_id', companyId)
    .eq('slug', newSlug)
    .maybeSingle();
  
  // If exists, add random suffix
  if (data) {
    newSlug = `${baseSlug}-copie-${timestamp}-${Math.random().toString(36).substring(7)}`;
  }
  
  return newSlug;
};

/**
 * Copy image files in storage bucket
 */
const copyProductImages = async (
  originalProduct: Product,
  newProductId: string,
  companyId: string
): Promise<{ image_url?: string; image_urls?: string[] }> => {
  const fileClient = getFileUploadClient();
  const newImages: string[] = [];
  
  try {
    // Get all image URLs to copy
    const imagesToCopy: string[] = [];
    if (originalProduct.image_url) {
      imagesToCopy.push(originalProduct.image_url);
    }
    if (originalProduct.image_urls && Array.isArray(originalProduct.image_urls)) {
      imagesToCopy.push(...originalProduct.image_urls.filter(url => url && url !== originalProduct.image_url));
    }
    
    for (const imageUrl of imagesToCopy) {
      // Skip non-Supabase URLs (external URLs or base64)
      if (!imageUrl.includes('supabase.co/storage') && !imageUrl.includes('/product-images/')) {
        newImages.push(imageUrl); // Keep external URLs as-is
        continue;
      }
      
      // Extract path from Supabase URL
      const pathMatch = imageUrl.match(/\/product-images\/(.+)$/);
      if (!pathMatch) {
        newImages.push(imageUrl);
        continue;
      }
      
      const oldPath = pathMatch[1];
      const fileName = oldPath.split('/').pop() || 'image.jpg';
      const newPath = `${companyId}/products/${newProductId}/${fileName}`;
      
      // Download original
      const { data: fileData, error: downloadError } = await fileClient.storage
        .from('product-images')
        .download(oldPath);
      
      if (downloadError || !fileData) {
        console.warn(`Failed to download image ${oldPath}:`, downloadError);
        continue;
      }
      
      // Upload copy
      const { data: uploadData, error: uploadError } = await fileClient.storage
        .from('product-images')
        .upload(newPath, fileData, {
          contentType: fileData.type,
          upsert: false
        });
      
      if (uploadError) {
        console.warn(`Failed to upload image copy ${newPath}:`, uploadError);
        continue;
      }
      
      // Get public URL
      const { data: { publicUrl } } = fileClient.storage
        .from('product-images')
        .getPublicUrl(newPath);
      
      newImages.push(publicUrl);
    }
    
    return {
      image_url: newImages[0] || undefined,
      image_urls: newImages.length > 0 ? newImages : undefined
    };
  } catch (error) {
    console.error('Error copying images:', error);
    // Return original URLs as fallback
    return {
      image_url: originalProduct.image_url || undefined,
      image_urls: originalProduct.image_urls || undefined
    };
  }
};

/**
 * Duplicate a product with all its related data
 */
export const duplicateProduct = async (
  options: DuplicateProductOptions
): Promise<DuplicateProductResult> => {
  const {
    productId,
    copyImages = true,
    copyUpsells = true,
    copyVariantPrices = true,
    nameSuffix = "Copie"
  } = options;
  
  try {
    // 1. Fetch original product
    const { data: originalProduct, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (fetchError || !originalProduct) {
      return {
        success: false,
        error: 'Produit introuvable',
        product: {} as Product
      };
    }
    
    // 2. Generate new unique identifiers
    const newId = crypto.randomUUID();
    const newSlug = await generateUniqueSlug(
      originalProduct.slug || originalProduct.name.toLowerCase().replace(/\s+/g, '-'),
      originalProduct.company_id
    );
    const newSku = originalProduct.sku 
      ? `${originalProduct.sku}-COPY-${Date.now()}`
      : undefined;
    
    // 3. Handle images
    let imageData: { image_url?: string; image_urls?: string[] } = {
      image_url: originalProduct.image_url,
      image_urls: originalProduct.image_urls
    };
    
    if (copyImages) {
      const copiedImages = await copyProductImages(originalProduct, newId, originalProduct.company_id);
      imageData = copiedImages;
    }
    
    // 4. Create new product data
    const newProductData = {
      ...originalProduct,
      id: newId,
      name: `${originalProduct.name} (${nameSuffix})`,
      slug: newSlug,
      sku: newSku,
      ...imageData,
      // Reset fields
      parent_id: null,
      is_variation: false,
      variants_ids: [],
      serial_number: null,
      assigned_to: null,
      status: 'available',
      woocommerce_id: null,
      warranty_expiration_date: null,
      maintenance_date: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // 5. Insert new product
    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert(newProductData)
      .select()
      .single();
    
    if (insertError || !insertedProduct) {
      console.error('Product insert error:', insertError);
      return {
        success: false,
        error: 'Erreur lors de la création du produit dupliqué',
        product: {} as Product
      };
    }
    
    // 6. Copy variant prices if requested
    if (copyVariantPrices) {
      const { data: variantPrices } = await supabase
        .from('product_variant_prices')
        .select('*')
        .eq('product_id', productId);
      
      if (variantPrices && variantPrices.length > 0) {
        const newVariantPrices = variantPrices.map(vp => ({
          ...vp,
          id: crypto.randomUUID(),
          product_id: newId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        await supabase
          .from('product_variant_prices')
          .insert(newVariantPrices);
      }
    }
    
    // 7. Copy upsells if requested
    if (copyUpsells) {
      const { data: upsells } = await supabase
        .from('product_upsells')
        .select('*')
        .eq('product_id', productId);
      
      if (upsells && upsells.length > 0) {
        const newUpsells = upsells.map(up => ({
          ...up,
          id: crypto.randomUUID(),
          product_id: newId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        await supabase
          .from('product_upsells')
          .insert(newUpsells);
      }
    }
    
    return {
      success: true,
      product: insertedProduct as Product
    };
  } catch (error) {
    console.error('Product duplication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      product: {} as Product
    };
  }
};
