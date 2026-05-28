import { useQuery } from "@tanstack/react-query";
import { getCategoriesWithProductCount } from "@/services/simplifiedCategoryService";
import { buildAbsorbingCategorySet } from "@/utils/giftedVentilation";

/**
 * Renvoie l'ensemble des IDs de catégories marquées "absorbe le coût des produits
 * offerts" (PC / laptop / tablette) pour l'entreprise courante (filtré par RLS).
 * Utilisé par les calculateurs pour ventiler le prix d'achat des offerts.
 */
export const useAbsorbingCategories = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["absorbing-categories"],
    queryFn: getCategoriesWithProductCount,
    staleTime: 5 * 60 * 1000,
  });

  return {
    absorbingCategoryIds: buildAbsorbingCategorySet(data || []),
    isLoading,
  };
};
