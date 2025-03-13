
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

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  try {
    const supabase = getSupabaseClient();

    // Vérifier que le fichier est bien une image valide
    if (!file.type.startsWith('image/')) {
      throw new Error('Le fichier doit être une image');
    }

    const timestamp = new Date().getTime();
    const imageName = `${productId}_${timestamp}.${file.name.split('.').pop()}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(imageName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type // Ajouter explicitement le type de contenu
      });

    if (error) {
      throw new Error(`Error uploading image: ${error.message}`);
    }

    // Construire l'URL correctement
    const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${data.path}`;
    
    // Update the product with the image URL
    await updateProduct(productId, { imageUrl });

    return imageUrl;
  } catch (error) {
    console.error("Error in uploadProductImage:", error);
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
