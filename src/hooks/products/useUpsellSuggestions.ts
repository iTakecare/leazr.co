import { useQuery } from "@tanstack/react-query";
import { getUpsellProducts } from "@/services/upsellService";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";

export const useUpsellSuggestions = (
  categoryId: string | undefined,
  currentProductId: string | undefined,
  limit: number = 12
) => {
  const { companyId } = useCompanyDetection();

  return useQuery({
    queryKey: ["upsell-suggestions", categoryId, currentProductId, limit],
    queryFn: async () => {
      if (!categoryId || !companyId) return [];
      
      const suggestions = await getUpsellProducts(
        categoryId,
        companyId,
        currentProductId,
        limit
      );

      return suggestions;
    },
    enabled: !!categoryId && !!companyId,
  });
};
