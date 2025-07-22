
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/catalog";

interface UpdateProductData {
  id: string;
  name?: string;
  description?: string;
  short_description?: string;
  category_id?: string;
  brand_id?: string;
  price?: number;
  stock?: number;
  sku?: string;
  is_refurbished?: boolean;
  condition?: string | null;
  purchase_price?: number;
  active?: boolean;
  admin_only?: boolean;
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
          short_description: data.short_description,
          category_id: data.category_id,
          brand_id: data.brand_id,
          price: data.price,
          stock: data.stock,
          sku: data.sku,
          is_refurbished: data.is_refurbished || false,
          condition: data.condition,
          purchase_price: data.purchase_price,
          active: data.active !== false,
          admin_only: data.admin_only || false,
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
