
import { useQuery } from "@tanstack/react-query";
import { getProductVariantPrices } from "@/services/variantPriceService";

export const useProductVariants = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product-variants", productId],
    queryFn: () => getProductVariantPrices(productId!),
    enabled: !!productId,
  });
};
