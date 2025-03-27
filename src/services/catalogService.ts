
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error(`Error fetching product with ID ${id}:`, error);
    throw error;
  }
};

export const addProduct = async (
  productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Product> => {
  try {
    const cleanedData: Record<string, any> = { ...productData };
    
    // Handle image_urls field naming inconsistency
    if (productData.image_urls) {
      cleanedData.image_urls = productData.image_urls;
    } else if ('imageurls' in productData) {
      cleanedData.image_urls = (productData as any).imageurls;
      delete cleanedData.imageurls;
    }
    
    // Remove fields that don't exist in the database
    const fieldsToRemove = ['meta', 'image_alt_texts', 'imageAltTexts'];
    fieldsToRemove.forEach(field => {
      if (field in cleanedData) {
        delete cleanedData[field];
      }
    });
    
    console.log("Creating new product with data:", cleanedData);
    
    const { data, error } = await supabase
      .from('products')
      .insert([cleanedData])
      .select()
      .single();
    
    if (error) {
      console.error("Error creating product:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in addProduct:", error);
    throw error;
  }
};

export const createProduct = addProduct;

export const updateProduct = async (
  id: string,
  productData: Partial<Product>
): Promise<Product> => {
  try {
    const cleanedData: Record<string, any> = { ...productData };
    
    cleanedData.updated_at = new Date().toISOString();
    
    // Handle image_urls field naming inconsistency
    if (productData.image_urls) {
      cleanedData.image_urls = productData.image_urls;
    } else if ('imageurls' in productData) {
      cleanedData.image_urls = (productData as any).imageurls;
      delete cleanedData.imageurls;
    }
    
    // Remove fields that don't exist in the database
    const fieldsToRemove = ['meta', 'image_alt_texts', 'imageAltTexts'];
    fieldsToRemove.forEach(field => {
      if (field in cleanedData) {
        delete cleanedData[field];
      }
    });
    
    console.log("Sending update data to Supabase:", cleanedData);
    
    const { data, error } = await supabase
      .from('products')
      .update(cleanedData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating product:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error in updateProduct:", error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
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
  isMainImage: boolean = false,
  altText?: string
): Promise<void> => {
  try {
    const filePath = `products/${productId}/${file.name}`;
    
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
    
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      throw new Error("Could not retrieve public URL for the image.");
    }
    
    const { data: productData, error: fetchError } = await supabase
      .from('products')
      .select('image_url, image_urls, image_alt_texts')
      .eq('id', productId)
      .single();
    
    if (fetchError) {
      console.error("Error fetching product for image update:", fetchError);
      throw fetchError;
    }
    
    let updateData: any = {};
    
    if (isMainImage) {
      updateData.image_url = urlData.publicUrl;
      
      if (altText) {
        let altTexts = productData.image_alt_texts || [];
        if (altTexts.length === 0) {
          altTexts = [altText];
        } else {
          altTexts[0] = altText;
        }
        updateData.image_alt_texts = altTexts;
      }
    } else {
      let imageUrls = productData.image_urls || [];
      imageUrls.push(urlData.publicUrl);
      updateData.image_urls = imageUrls;
      
      if (altText) {
        let altTexts = productData.image_alt_texts || [];
        altTexts.push(altText);
        updateData.image_alt_texts = altTexts;
      }
    }
    
    const { error: updateError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId);
    
    if (updateError) {
      console.error("Error updating product with image data:", updateError);
      throw updateError;
    }
    
    console.log(`Image uploaded successfully to ${urlData.publicUrl} and product updated.`);
  } catch (error) {
    console.error("Error uploading product image:", error);
    throw error;
  }
};

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

export const findVariantByAttributes = async (
  parentId: string, 
  attributes: Record<string, string>
): Promise<Product | null> => {
  try {
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
    
    const matchingVariant = variants.find((variant: any) => {
      if (!variant.attributes) return false;
      
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

export const convertProductToParent = async (
  productId: string, 
  variationAttributes: string | Record<string, string[]>
): Promise<Product> => {
  try {
    let processedAttributes: Record<string, string[]>;
    
    if (typeof variationAttributes === 'string') {
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
