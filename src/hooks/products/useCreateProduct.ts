import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

interface CreateProductData {
  name: string;
  description?: string;
  shortDescription?: string;
  categoryId: string;
  brandId: string;
  price: number;
  stock?: number;
  sku?: string;
  isRefurbished?: boolean;
  condition?: string;
  purchasePrice?: number;
  images?: string[];
  active?: boolean;
}

export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductData) => {
      const { data: product, error } = await supabase
        .from("products")
        .insert([
          {
            name: data.name,
            description: data.description,
            short_description: data.shortDescription,
            category_id: data.categoryId,
            brand_id: data.brandId,
            price: data.price,
            stock: data.stock,
            sku: data.sku,
            is_refurbished: data.isRefurbished || false,
            condition: data.condition,
            purchase_price: data.purchasePrice,
            images: data.images || [],
            active: data.active !== false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return product as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit créé avec succès");
    },
    onError: (error: any) => {
      console.error("Erreur lors de la création:", error);
      toast.error("Erreur lors de la création du produit");
    },
  });
};