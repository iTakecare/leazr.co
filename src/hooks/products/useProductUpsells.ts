import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductUpsell {
  id: string;
  product_id: string;
  upsell_product_id: string;
  priority: number;
  source: 'manual' | 'auto';
  created_at: string;
  updated_at: string;
}

// Récupérer les upsells d'un produit
export const useProductUpsells = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product-upsells", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_upsells")
        .select("*")
        .eq("product_id", productId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ProductUpsell[];
    },
    enabled: !!productId,
  });
};

// Ajouter un upsell
export const useAddProductUpsell = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      upsellProductId, 
      priority = 0 
    }: { 
      productId: string; 
      upsellProductId: string; 
      priority?: number;
    }) => {
      const { data, error } = await supabase
        .from("product_upsells")
        .insert({
          product_id: productId,
          upsell_product_id: upsellProductId,
          priority,
          source: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-upsells", variables.productId] });
      toast.success("Upsell ajouté avec succès");
    },
    onError: (error: any) => {
      console.error("Erreur lors de l'ajout de l'upsell:", error);
      if (error.code === '23505') {
        toast.error("Cet upsell existe déjà");
      } else {
        toast.error("Erreur lors de l'ajout de l'upsell");
      }
    },
  });
};

// Supprimer un upsell
export const useRemoveProductUpsell = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      upsellId 
    }: { 
      productId: string; 
      upsellId: string;
    }) => {
      const { error } = await supabase
        .from("product_upsells")
        .delete()
        .eq("id", upsellId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-upsells", variables.productId] });
      toast.success("Upsell supprimé avec succès");
    },
    onError: (error: any) => {
      console.error("Erreur lors de la suppression de l'upsell:", error);
      toast.error("Erreur lors de la suppression de l'upsell");
    },
  });
};

// Mettre à jour les priorités (drag & drop)
export const useUpdateUpsellPriorities = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      productId, 
      updates 
    }: { 
      productId: string; 
      updates: { id: string; priority: number }[];
    }) => {
      const promises = updates.map(({ id, priority }) =>
        supabase
          .from("product_upsells")
          .update({ priority })
          .eq("id", id)
      );

      await Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-upsells", variables.productId] });
      toast.success("Ordre des upsells mis à jour");
    },
    onError: (error: any) => {
      console.error("Erreur lors de la mise à jour des priorités:", error);
      toast.error("Erreur lors de la mise à jour de l'ordre");
    },
  });
};
