
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
    const supabase = getSupabaseClient();

    // Vérifier que le fichier est bien une image valide
    if (!file.type.startsWith('image/')) {
      console.warn(`Le fichier n'est pas une image valide, type détecté: ${file.type}`);
      // Déterminer le type en fonction de l'extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      let contentType = 'image/jpeg'; // Default type
      
      if (extension === 'png') contentType = 'image/png';
      else if (extension === 'gif') contentType = 'image/gif';
      else if (extension === 'webp') contentType = 'image/webp';
      
      // Créer un nouveau blob avec le type correct
      const fileArrayBuffer = await file.arrayBuffer();
      const correctedFile = new File([fileArrayBuffer], file.name, { type: contentType });
      
      // Utiliser ce nouveau fichier
      file = correctedFile;
      console.log(`Type de fichier corrigé: ${file.type}`);
    }

    const timestamp = new Date().getTime();
    const imageName = `${productId}_${timestamp}_${isMainImage ? 'main' : Date.now()}.${file.name.split('.').pop()}`;

    // Créer d'abord le bucket s'il n'existe pas
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets || !buckets.find(b => b.name === 'product-images')) {
      const { error: bucketError } = await supabase.storage.createBucket('product-images', {
        public: true
      });
      if (bucketError) {
        console.error("Erreur lors de la création du bucket:", bucketError);
      }
    }

    // Vérifier une dernière fois que le type est correct
    console.log(`Uploading image of type: ${file.type} for product: ${productId}`);
    
    // Uploader le fichier avec le type de contenu explicite
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
    // Get the current product
    const product = await getProductById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const uploadedUrls: string[] = [];
    
    // Upload main image first if provided
    if (files.length > 0) {
      const mainImage = files[0];
      const mainImageUrl = await uploadProductImage(mainImage, productId, true);
      uploadedUrls.push(mainImageUrl);
    }
    
    // Upload additional images (up to 4 more)
    const additionalImages = files.slice(1, 5); // Limit to 4 additional images
    
    for (const file of additionalImages) {
      const imageUrl = await uploadProductImage(file, productId, false);
      uploadedUrls.push(imageUrl);
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
