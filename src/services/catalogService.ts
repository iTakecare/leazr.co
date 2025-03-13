import { getSupabaseClient } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

export async function getProducts(): Promise<Product[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching products: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error in getProducts:", error);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Error fetching product by ID: ${error.message}`);
    }

    return data || null;
  } catch (error) {
    console.error("Error in getProductById:", error);
    return null;
  }
}

export async function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ id: string }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Error adding product: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error("Product ID not found after insertion.");
    }

    return { id: data.id };
  } catch (error) {
    console.error("Error in addProduct:", error);
    throw error;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }

    return data || null;
  } catch (error) {
    console.error("Error in updateProduct:", error);
    return null;
  }
}

export async function uploadProductImage(file: File, productId: string, isMainImage: boolean = true): Promise<string> {
  try {
    // Utiliser notre nouveau service d'image
    const { uploadImage } = await import("@/services/imageService");
    
    // Générer un chemin unique pour l'image
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${productId}/${isMainImage ? 'main' : `additional_${timestamp}`}_${timestamp}.${extension}`;
    
    // Uploader l'image
    const imageUrl = await uploadImage(file, path, 'product-images');
    
    if (!imageUrl) {
      throw new Error("Failed to upload image");
    }
    
    // Update the product with the image URL
    const product = await getProductById(productId);
    if (product) {
      if (isMainImage) {
        await updateProduct(productId, { imageUrl });
      } else {
        // Get existing additional images or initialize an empty array
        const imageUrls = product.imageUrls || [];
        
        // Limit to 4 additional images (5 total with main image)
        if (imageUrls.length >= 4) {
          imageUrls.pop(); // Remove the oldest additional image
        }
        
        // Add the new image at the beginning
        imageUrls.unshift(imageUrl);
        
        await updateProduct(productId, { imageUrls });
      }
    }

    return imageUrl;
  } catch (error) {
    console.error("Error in uploadProductImage:", error);
    throw error;
  }
}

export async function uploadMultipleProductImages(files: File[], productId: string): Promise<string[]> {
  try {
    // Utiliser notre nouveau service d'image
    const { uploadProductImages } = await import("@/services/imageService");
    
    // Upload all images
    const uploadedUrls = await uploadProductImages(files, productId);
    
    if (uploadedUrls.length === 0) {
      throw new Error("No images were uploaded successfully");
    }
    
    // Get the current product
    const product = await getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Update the product with the first image as main image
    if (uploadedUrls.length > 0) {
      await updateProduct(productId, { 
        imageUrl: uploadedUrls[0],
        imageUrls: uploadedUrls.slice(1, 5) // Max 4 additional images
      });
    }
    
    return uploadedUrls;
  } catch (error) {
    console.error("Error in uploadMultipleProductImages:", error);
    throw error;
  }
}

export async function deleteAllProducts(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .neq('id', 'null');

    if (error) {
      throw new Error(`Error deleting all products: ${error.message}`);
    }

    return Promise.resolve();
  } catch (error) {
    console.error("Error in deleteAllProducts:", error);
    return Promise.reject(error);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    // Delete the product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      throw new Error(`Error deleting product: ${error.message}`);
    }
    
    // Check if it's a parent product and delete children if necessary
    const { data: children, error: childrenError } = await supabase
      .from('products')
      .delete()
      .eq('parent_id', productId);
    
    if (childrenError) {
      console.error(`Error deleting child products: ${childrenError.message}`);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    return Promise.reject(error);
  }
}
