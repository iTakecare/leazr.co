import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

interface UpdateProductData {
  id: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  brandId?: string;
  price?: number;
  stock?: number;
  sku?: string;
  isRefurbished?: boolean;
  condition?: string;
  warranty?: string;
  images?: string[];
  active?: boolean;
}

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProductData) => {
      const { data: product, error } = await supabase
        .from("products")
        .update({
          name: data.name,
          description: data.description,
          short_description: data.shortDescription,
          category: data.categoryId,
          brand: data.brandId,
          price: data.price,
          stock: data.stock,
          sku: data.sku,
          is_refurbished: data.isRefurbished || false,
          condition: data.condition,
          warranty: data.warranty,
          images: data.images || [],
          active: data.active !== false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return product as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Produit mis à jour avec succès");
    },
    onError: (error: any) => {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour du produit");
    },
  });
};