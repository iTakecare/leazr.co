import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
    
    return data as Product[];
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

export const getProductById = async (productId: string): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (error) throw error;
    
    return data as Product;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

export const updateProduct = async (productId: string, product: Partial<Product>): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', productId)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as Product;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();
    
    if (error) {
      console.error("Error adding product:", error);
      throw error;
    }
    
    return data as Product;
  } catch (error) {
    console.error("Error adding product:", error);
    throw error;
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

export const uploadProductImage = async (
  file: File, 
  productId: string,
  isMainImage: boolean = false
): Promise<void> => {
  try {
    const filePath = `products/${productId}/${file.name}`;
    
    // Upload the image to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      throw uploadError;
    }
    
    // Get the public URL of the uploaded image
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      throw new Error("Could not retrieve public URL for the image.");
    }
    
    // Update the product record with the image URL
    const { error: updateError } = await supabase
      .from('products')
      .update({ image_url: urlData.publicUrl })
      .eq('id', productId);
    
    if (updateError) {
      console.error("Error updating product with image URL:", updateError);
      throw updateError;
    }
    
    console.log(`Image uploaded successfully to ${urlData.publicUrl} and product updated.`);
  } catch (error) {
    console.error("Error uploading product image:", error);
    throw error;
  }
};
