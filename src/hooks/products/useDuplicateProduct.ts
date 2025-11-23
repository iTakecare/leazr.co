import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { duplicateProduct, DuplicateProductOptions } from "@/services/productDuplicationService";

export const useDuplicateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: duplicateProduct,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success(`Produit "${result.product.name}" dupliqué avec succès`);
      } else {
        toast.error(result.error || "Erreur lors de la duplication");
      }
    },
    onError: (error: Error) => {
      console.error("Duplication error:", error);
      toast.error("Erreur lors de la duplication du produit");
    }
  });
};
