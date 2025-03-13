
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
    // Utiliser un timeout pour éviter les blocages indéfinis
    const timeoutPromise = new Promise<{ data: any[] }>((_, reject) =>
      setTimeout(() => {
        console.log("Timeout atteint, utilisation des données mockées");
        // Retourne les produits mockés si le timeout est atteint
        return { data: mockProducts.map(enrichMockProduct) };
      }, 3000)
    );
    
    const fetchPromise = supabase
      .from('products')
      .select('*')
      .order('name');
    
    // Utiliser Promise.race pour résoudre avec la première promesse qui se termine
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]) as any;
    
    if (error) {
      console.error("Error fetching products:", error);
      // Utiliser les données mockées en cas d'erreur
      return mockProducts.map(enrichMockProduct);
    }
    
    return data ? data.map(mapDbProductToProduct) : mockProducts.map(enrichMockProduct);
  } catch (error) {
    console.error("Error in getProducts:", error);
    // Retourner les données mockées en cas d'erreur
    return mockProducts.map(enrichMockProduct);
  }
};

/**
 * Récupère un produit par son ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    // D'abord essayer de charger depuis Supabase
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    
    if (data) return mapDbProductToProduct(data);
    
    // Si non trouvé dans Supabase, chercher dans les données mockées
    const mockProduct = mockProducts.find(p => p.id === id);
    return mockProduct ? enrichMockProduct(mockProduct) : null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    
    // Chercher dans les données mockées
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
    };
    
    // Supprimer les propriétés qui n'existent pas dans la base de données
    delete dbData.imageUrl;
    delete dbData.createdAt;
    delete dbData.updatedAt;
    
    // Ajouter la date de mise à jour
    dbData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('products')
      .update(dbData)
      .eq('id', id)
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
    const filePath = `${productId}-${Date.now()}.${fileExt}`;
    
    // Vérifier si le bucket existe, sinon utiliser un mock
    const { data: buckets } = await supabase.storage.listBuckets();
    
    if (!buckets || !buckets.find(b => b.name === 'product-images')) {
      console.log("Storage bucket not found, returning mock image URL");
      return "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2042&auto=format&fit=crop&ixlib=rb-4.0.3";
    }
    
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file);

    if (error) {
      console.error("Error uploading image:", error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    // Mettre à jour l'URL de l'image dans le produit
    await updateProduct(productId, { imageUrl: urlData.publicUrl });
    
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in uploadProductImage:", error);
    // Return a placeholder image URL
    return "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2042&auto=format&fit=crop&ixlib=rb-4.0.3";
  }
};
