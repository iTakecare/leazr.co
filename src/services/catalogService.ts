import { getSupabaseClient } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";
import { toast } from "sonner";
import { ensureStorageBucket } from "./storageService";

const supabase = getSupabaseClient();

/**
 * Fetch all products
 * @returns Array of products
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

/**
 * Fetch a single product by ID
 * @param id Product ID
 * @returns Product object or null
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
};

/**
 * Add a new product
 * @param productData Product data
 * @returns Product object
 */
export const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error("Error adding product:", error);
      throw error;
    }

    toast.success("Produit ajouté avec succès !");
    return data;
  } catch (error) {
    console.error("Error adding product:", error);
    toast.error("Erreur lors de l'ajout du produit.");
    throw error;
  }
};

/**
 * Update an existing product
 * @param id Product ID
 * @param updates Product data to update
 * @returns Product object
 */
export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error("Error updating product:", error);
    return null;
  }
};

/**
 * Delete a product
 * @param id Product ID
 * @returns True if successful, false otherwise
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error("Error deleting product:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    return false;
  }
};

/**
 * Upload a product image to storage
 * @param file The image file to upload
 * @param productId The product ID
 * @param isMainImage Whether this is the main product image
 * @returns URL of the uploaded image
 */
export const uploadProductImage = async (
  file: File,
  productId: string,
  isMainImage: boolean = false
): Promise<string | null> => {
  try {
    console.log(`Starting image upload for product ${productId}, isMainImage: ${isMainImage}`);
    
    // First ensure the product-images bucket exists
    const bucketExists = await ensureStorageBucket('product-images');
    
    if (!bucketExists) {
      console.error('Failed to ensure product-images bucket exists');
      toast.error('Erreur lors de la création du bucket de stockage');
      return null;
    }
    
    console.log('Bucket product-images confirmed to exist');
    
    // Create a unique file path
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const filePath = `${productId}/${isMainImage ? 'main' : `additional_${timestamp}`}.${fileExtension}`;
    
    // Upload the file
    console.log(`Uploading image to path: ${filePath}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });
    
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      toast.error(`Erreur lors de la mise à jour de l'image: ${uploadError.message}`);
      return null;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);
    
    console.log(`Image uploaded successfully: ${publicUrlData.publicUrl}`);
    
    // Update the product with the new image URL if this is the main image
    if (isMainImage) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrlData.publicUrl })
        .eq('id', productId);
      
      if (updateError) {
        console.error('Error updating product with image URL:', updateError);
        toast.error('Erreur lors de la mise à jour des informations du produit');
      }
    }
    
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    toast.error(`Erreur lors de l'upload de l'image: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    return null;
  }
};
