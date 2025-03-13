
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductVariant } from "@/types/catalog";
import { products as mockProducts } from "@/data/products";
import { v4 as uuidv4 } from 'uuid';

// Helper function to convert database records to Product type
const mapDbProductToProduct = (record: any): Product => {
  return {
    id: record.id,
    name: record.name,
    brand: record.brand || "",
    category: record.category || "other",
    price: Number(record.price),
    description: record.description || "",
    imageUrl: record.image_url || "",
    specifications: record.specifications || {},
    active: record.active !== false,
    parent_id: record.parent_id,
    is_variation: record.is_variation || false,
    variation_attributes: record.variation_attributes || {},
    is_parent: record.is_parent || false,
    variants_ids: record.variants_ids || [],
    monthly_price: record.monthly_price,
    createdAt: record.created_at ? new Date(record.created_at) : new Date(),
    updatedAt: record.updated_at ? new Date(record.updated_at) : new Date()
  };
};

// Helper function to convert mock products to Product type with all required fields
const enrichMockProduct = (mockProduct: any): Product => {
  return {
    ...mockProduct,
    brand: mockProduct.brand || "",
    specifications: mockProduct.specifications || {},
    active: mockProduct.active !== false,
    is_variation: mockProduct.is_variation || false,
    variation_attributes: mockProduct.variation_attributes || {},
    is_parent: mockProduct.is_parent || false,
    variants_ids: mockProduct.variants_ids || [],
    createdAt: mockProduct.createdAt || new Date(),
    updatedAt: mockProduct.updatedAt || new Date()
  };
};

/**
 * Récupère tous les produits du catalogue depuis Supabase
 * Utilise les données mockées en cas de problème de connexion à Supabase
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    // Only fetch products that are not variations, or are parent products
    const { data, error } = await supabase
      .from('products')
      .select('*, variants:products(id, name, price, variation_attributes, image_url)')
      .or('is_variation.is.null,is_variation.eq.false,is_parent.eq.true')
      .order('name');
    
    if (error) {
      console.error("Error fetching products:", error);
      // Use mock data if there's an error
      return mockProducts.map(enrichMockProduct);
    }
    
    // Process the data to include variations properly
    const products = data.map(product => {
      const mappedProduct = mapDbProductToProduct(product);
      
      // If the product has variations, map them properly
      if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
        mappedProduct.variants = product.variants.map((variant: any) => ({
          id: variant.id,
          name: variant.name,
          price: Number(variant.price),
          attributes: variant.variation_attributes || {},
          imageUrl: variant.image_url
        }));
      }
      
      return mappedProduct;
    });
    
    return products;
  } catch (error) {
    console.error("Error in getProducts:", error);
    // Return mock data in case of error
    return mockProducts.map(enrichMockProduct);
  }
};

/**
 * Récupère un produit par son ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    // First try to load from Supabase with variations if it's a parent product
    const { data: mainProduct, error: mainError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (mainError) throw mainError;
    
    if (!mainProduct) {
      // Product not found in database, try mock data
      const mockProduct = mockProducts.find(p => p.id === id);
      return mockProduct ? enrichMockProduct(mockProduct) : null;
    }
    
    const product = mapDbProductToProduct(mainProduct);
    
    // If this is a parent product or possibly has variations, fetch them
    if (mainProduct.is_parent) {
      // Fetch variations for this parent
      const { data: variations, error: varError } = await supabase
        .from('products')
        .select('*')
        .eq('parent_id', id);
      
      if (!varError && variations && variations.length > 0) {
        product.variants = variations.map(v => ({
          id: v.id,
          name: v.name,
          price: Number(v.price),
          attributes: v.variation_attributes || {},
          imageUrl: v.image_url
        }));
      }
    }
    
    return product;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    
    // Try to find in mock data
    const mockProduct = mockProducts.find(p => p.id === id);
    return mockProduct ? enrichMockProduct(mockProduct) : null;
  }
};

/**
 * Ajoute un nouveau produit
 */
export const addProduct = async (productData: Partial<Product>): Promise<Product> => {
  try {
    const newProduct = {
      id: uuidv4(),
      name: productData.name || "Nouveau produit",
      brand: productData.brand || "Generic",
      category: productData.category || "other",
      price: productData.price || 0,
      description: productData.description || "",
      image_url: productData.imageUrl || "",
      specifications: productData.specifications || {},
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (error) {
      console.error("Error adding product:", error);
      throw error;
    }

    return mapDbProductToProduct(data);
  } catch (error) {
    console.error("Error in addProduct:", error);
    
    // Return a mock product with the provided data
    const product: Product = {
      id: uuidv4(),
      name: productData.name || "Nouveau produit",
      brand: productData.brand || "Generic",
      category: productData.category || "other",
      price: productData.price || 0,
      description: productData.description || "",
      imageUrl: productData.imageUrl || "",
      specifications: productData.specifications || {},
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return product;
  }
};

/**
 * Met à jour un produit existant
 */
export const updateProduct = async (id: string, productData: Partial<Product>): Promise<Product> => {
  try {
    // Convertir les noms de clés pour correspondre à la structure de la base de données
    const dbData: any = {
      ...productData,
      image_url: productData.imageUrl,
      variants_ids: productData.variants_ids,
      is_parent: productData.is_parent,
      variation_attributes: productData.variation_attributes,
      is_variation: productData.is_variation
    };
    
    // Supprimer les propriétés qui n'existent pas dans la base de données
    delete dbData.imageUrl;
    delete dbData.createdAt;
    delete dbData.updatedAt;
    delete dbData.variants;
    
    // Ajouter la date de mise à jour
    dbData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("products")
      .update(dbData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      throw error;
    }

    return mapDbProductToProduct(data);
  } catch (error) {
    console.error("Error in updateProduct:", error);
    
    // Return a mock updated product
    const mockProduct = mockProducts.find(p => p.id === id);
    if (!mockProduct) throw new Error("Product not found");
    
    const updatedProduct: Product = {
      ...enrichMockProduct(mockProduct),
      ...productData,
      updatedAt: new Date()
    };
    
    return updatedProduct;
  }
};

/**
 * Supprime un produit
 */
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
    console.error("Error in deleteProduct:", error);
    // Just log the error in mock mode
  }
};

/**
 * Upload une image pour un produit
 */
export const uploadProductImage = async (file: File, productId: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    
    // Ensure the bucket exists
    await ensureStorageBucketExists();
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    // Update product with new image URL
    await updateProduct(productId, { imageUrl: urlData.publicUrl });
    
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadProductImage:", error);
    // Return a placeholder image URL
    return "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2042&auto=format&fit=crop&ixlib=rb-4.0.3";
  }
};

// Helper function to ensure the storage bucket exists
async function ensureStorageBucketExists() {
  try {
    // Check if the bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    
    if (!buckets || !buckets.find(b => b.name === 'product-images')) {
      console.log("Product images bucket doesn't exist, creating it");
      
      // Create the bucket via Supabase API
      const { error } = await supabase.storage.createBucket('product-images', {
        public: true
      });
      
      if (error) {
        console.error("Error creating storage bucket:", error);
      } else {
        console.log("Created product-images bucket successfully");
      }
    }
  } catch (error) {
    console.error("Error checking/creating storage bucket:", error);
  }
}
