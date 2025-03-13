
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductVariant } from "@/types/catalog";
import { toast } from "sonner";

export const addProduct = async (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: product.name,
        category: product.category,
        price: product.price,
        description: product.description,
        image_url: product.imageUrl,
        specifications: product.specifications,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    toast.error(`Erreur lors de l'ajout du produit: ${error.message}`);
    throw error;
  }
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  try {
    const updateData: any = {};
    
    if (product.name) updateData.name = product.name;
    if (product.category) updateData.category = product.category;
    if (product.price !== undefined) updateData.price = product.price;
    if (product.description) updateData.description = product.description;
    if (product.imageUrl) updateData.image_url = product.imageUrl;
    if (product.specifications) updateData.specifications = product.specifications;

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    toast.error(`Erreur lors de la mise à jour du produit: ${error.message}`);
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
    toast.success("Produit supprimé avec succès");
  } catch (error: any) {
    toast.error(`Erreur lors de la suppression du produit: ${error.message}`);
    throw error;
  }
};

export const getProducts = async () => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) throw error;
    
    // Conversion des dates
    return data.map(product => ({
      ...product,
      imageUrl: product.image_url,
      createdAt: new Date(product.created_at),
      updatedAt: new Date(product.updated_at)
    })) as Product[];
  } catch (error: any) {
    toast.error(`Erreur lors de la récupération des produits: ${error.message}`);
    throw error;
  }
};

export const getProductById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    
    return {
      ...data,
      imageUrl: data.image_url,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    } as Product;
  } catch (error: any) {
    toast.error(`Erreur lors de la récupération du produit: ${error.message}`);
    throw error;
  }
};

export const uploadProductImage = async (file: File, productId: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    // Upload de l'image
    const { error: uploadError } = await supabase
      .storage
      .from('product-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Récupération de l'URL publique
    const { data } = supabase
      .storage
      .from('product-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (error: any) {
    toast.error(`Erreur lors de l'upload de l'image: ${error.message}`);
    throw error;
  }
};
