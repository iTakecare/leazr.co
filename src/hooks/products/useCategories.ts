
import { useQuery } from "@tanstack/react-query";
import { Category } from "@/types/catalog";

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { getCategories } = await import("@/services/catalogService");
      return getCategories();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
