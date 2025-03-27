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

// Brand Management Functions
export const getBrands = async () => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Error fetching brands:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getBrands:", error);
    return [];
  }
};

export const addBrand = async ({ name, translation }: { name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .insert([{ name, translation }])
      .select();
    
    if (error) {
      console.error("Error adding brand:", error);
      throw error;
    }
    
    return data?.[0];
  } catch (error) {
    console.error("Error in addBrand:", error);
    throw error;
  }
};

export const updateBrand = async ({ 
  originalName, 
  name, 
  translation 
}: { 
  originalName: string; 
  name: string; 
  translation: string 
}) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .update({ name, translation })
      .eq('name', originalName)
      .select();
    
    if (error) {
      console.error("Error updating brand:", error);
      throw error;
    }
    
    return data?.[0];
  } catch (error) {
    console.error("Error in updateBrand:", error);
    throw error;
  }
};

export const deleteBrand = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('name', name);
    
    if (error) {
      console.error("Error deleting brand:", error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteBrand:", error);
    throw error;
  }
};

// Category Management Functions
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in getCategories:", error);
    return [];
  }
};

export const addCategory = async ({ name, translation }: { name: string; translation: string }) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name, translation }])
      .select();
    
    if (error) {
      console.error("Error adding category:", error);
      throw error;
    }
    
    return data?.[0];
  } catch (error) {
    console.error("Error in addCategory:", error);
    throw error;
  }
};

export const updateCategory = async ({ 
  originalName, 
  name, 
  translation 
}: { 
  originalName: string; 
  name: string; 
  translation: string 
}) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ name, translation })
      .eq('name', originalName)
      .select();
    
    if (error) {
      console.error("Error updating category:", error);
      throw error;
    }
    
    return data?.[0];
  } catch (error) {
    console.error("Error in updateCategory:", error);
    throw error;
  }
};

export const deleteCategory = async ({ name }: { name: string }) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('name', name);
    
    if (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    throw error;
  }
};

// Product Variant Functions
export const findVariantByAttributes = async (
  parentId: string, 
  attributes: Record<string, string>
): Promise<Product | null> => {
  try {
    // Get all variants for the parent product
    const { data: variants, error } = await supabase
      .from('products')
      .select('*')
      .eq('parent_id', parentId);
    
    if (error) {
      console.error("Error fetching variants:", error);
      throw error;
    }
    
    if (!variants || variants.length === 0) {
      return null;
    }
    
    // Find the variant that matches all the attributes
    const matchingVariant = variants.find((variant: any) => {
      if (!variant.attributes) return false;
      
      // Check if all selected attributes match this variant
      for (const [key, value] of Object.entries(attributes)) {
        if (variant.attributes[key] !== value) {
          return false;
        }
      }
      
      return true;
    });
    
    return matchingVariant ? matchingVariant as Product : null;
  } catch (error) {
    console.error("Error finding variant by attributes:", error);
    return null;
  }
};

// Convert product to parent function
export const convertProductToParent = async (
  productId: string, 
  variationAttributes: string | Record<string, string[]>
): Promise<Product> => {
  try {
    let processedAttributes: Record<string, string[]>;
    
    // Handle if a model name string is passed instead of attributes
    if (typeof variationAttributes === 'string') {
      // Create a basic variation attribute with model name as key
      processedAttributes = {
        'model': [variationAttributes]
      };
    } else {
      processedAttributes = variationAttributes;
    }
    
    const updates = {
      is_parent: true,
      variation_attributes: processedAttributes
    };
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();
    
    if (error) {
      console.error("Error converting product to parent:", error);
      throw error;
    }
    
    return data as Product;
  } catch (error) {
    console.error("Error in convertProductToParent:", error);
    throw error;
  }
};
