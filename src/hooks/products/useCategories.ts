
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCategoriesWithEnvironmentalData } from "@/services/catalogService";
import { CategoryWithEnvironmental } from "@/types/environmental";

interface UseCategoriesOptions {
  includeEnvironmentalData?: boolean;
  companySlug?: string;
}

export const useCategories = (
  options?: UseCategoriesOptions,
  queryOptions?: UseQueryOptions<any>
) => {
  const { includeEnvironmentalData = false, companySlug } = options || {};

  return useQuery({
    queryKey: ["categories", { includeEnvironmentalData, companySlug }],
    queryFn: async () => {
      // If environmental data is requested and companySlug is provided, use the Edge Function
      if (includeEnvironmentalData && companySlug) {
        console.log("📦 useCategories - Fetching categories with environmental data");
        return getCategoriesWithEnvironmentalData(companySlug);
      }
      
      // Default behavior: fetch from Supabase directly
      console.log("📦 useCategories - Fetching standard categories");
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: includeEnvironmentalData ? 10 * 60 * 1000 : 5 * 60 * 1000, // Longer cache for environmental data
    ...queryOptions,
  });
};
