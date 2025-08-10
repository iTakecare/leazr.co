import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { getEnvironmentalData, getCategoriesWithEnvironmentalData, getProductCO2Data } from "@/services/catalogService";
import { 
  EnvironmentalApiResponse, 
  CategoryWithEnvironmental, 
  ProductCO2Response 
} from "@/types/environmental";

/**
 * Hook to fetch environmental data for all categories
 */
export const useEnvironmentalData = (
  companySlug: string | undefined,
  options?: UseQueryOptions<EnvironmentalApiResponse>
) => {
  return useQuery({
    queryKey: ["environmental-data", companySlug],
    queryFn: () => {
      if (!companySlug) {
        throw new Error("Company slug is required");
      }
      return getEnvironmentalData(companySlug);
    },
    enabled: !!companySlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch categories with environmental data
 */
export const useCategoriesWithEnvironmentalData = (
  companySlug: string | undefined,
  options?: UseQueryOptions<CategoryWithEnvironmental[]>
) => {
  return useQuery({
    queryKey: ["categories-environmental", companySlug],
    queryFn: () => {
      if (!companySlug) {
        throw new Error("Company slug is required");
      }
      return getCategoriesWithEnvironmentalData(companySlug);
    },
    enabled: !!companySlug,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
};

/**
 * Hook to fetch CO2 data for a specific product
 */
export const useProductCO2Data = (
  companySlug: string | undefined,
  productId: string | undefined,
  options?: UseQueryOptions<ProductCO2Response>
) => {
  return useQuery({
    queryKey: ["product-co2", companySlug, productId],
    queryFn: () => {
      if (!companySlug || !productId) {
        throw new Error("Company slug and product ID are required");
      }
      return getProductCO2Data(companySlug, productId);
    },
    enabled: !!companySlug && !!productId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
};