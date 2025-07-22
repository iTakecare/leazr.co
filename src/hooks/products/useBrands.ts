
import { useQuery } from "@tanstack/react-query";
import { Brand } from "@/types/catalog";

export const useBrands = () => {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async (): Promise<Brand[]> => {
      const { getBrands } = await import("@/services/catalogService");
      return getBrands();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
