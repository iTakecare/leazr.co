import { useMemo } from 'react';
import { useEnvironmentalData } from './useEnvironmentalData';
import { useCompanyDetection } from '@/hooks/useCompanyDetection';
import { getCO2DataForCategory, calculateCO2Equivalents } from '@/utils/co2Utils';
import { CO2CalculationResult } from '@/types/environmental';

interface Product {
  id: string;
  category?: string;
  category_name?: string;
}

interface PackItem {
  quantity: number;
  product?: {
    category_name?: string;
    category?: { name: string };
  };
}

interface Pack {
  id: string;
  items?: PackItem[];
}

interface BulkCO2CalculatorProps {
  products?: Product[];
  packs?: Pack[];
  companySlug?: string;
}

interface BulkCO2Results {
  products: Record<string, CO2CalculationResult>;
  packs: Record<string, CO2CalculationResult>;
  isLoading: boolean;
}

export const useBulkCO2Calculator = ({
  products = [],
  packs = [],
  companySlug
}: BulkCO2CalculatorProps): BulkCO2Results => {
  const { companySlug: detectedSlug } = useCompanyDetection();
  const finalCompanySlug = companySlug || detectedSlug;

  // Get environmental data (cached by React Query)
  const { data: environmentalData, isLoading } = useEnvironmentalData(
    finalCompanySlug
  );

  const results = useMemo(() => {
    const productResults: Record<string, CO2CalculationResult> = {};
    const packResults: Record<string, CO2CalculationResult> = {};

    const environmentalCategories = environmentalData?.environmental_categories || environmentalData?.categories;
    
    // Calculate CO2 for individual products
    products.forEach(product => {
      const category = product.category || product.category_name || '';
      const categoryData = getCO2DataForCategory(category, environmentalCategories);
      const equivalents = calculateCO2Equivalents(categoryData.co2Kg);

      productResults[product.id] = {
        co2Kg: categoryData.co2Kg,
        carKilometers: equivalents.carKilometers,
        treeMonths: equivalents.treeMonths,
        source: categoryData.source,
        hasRealData: categoryData.hasRealData && !isLoading
      };
    });

    // Calculate CO2 for packs
    packs.forEach(pack => {
      let totalCO2 = 0;
      let hasRealData = false;
      let source = 'impactco2.fr';

      if (pack.items && pack.items.length > 0) {
        totalCO2 = pack.items.reduce((total, item) => {
          const standardizedCategory = item.product?.category?.name || '';
          const fallbackCategory = item.product?.category_name || '';
          const itemCategory = standardizedCategory || fallbackCategory;
          const itemQuantity = item.quantity || 1;

          const categoryData = getCO2DataForCategory(itemCategory, environmentalCategories);
          
          if (categoryData.hasRealData) {
            hasRealData = true;
            source = categoryData.source;
          }

          return total + (categoryData.co2Kg * itemQuantity);
        }, 0);
      }

      const equivalents = calculateCO2Equivalents(totalCO2);

      packResults[pack.id] = {
        co2Kg: totalCO2,
        carKilometers: equivalents.carKilometers,
        treeMonths: equivalents.treeMonths,
        source: hasRealData && environmentalData?.environmental_categories?.[0]?.source_url 
          ? environmentalData.environmental_categories[0].source_url 
          : source,
        hasRealData: hasRealData && !isLoading
      };
    });

    return { productResults, packResults };
  }, [products, packs, environmentalData, isLoading]);

  return {
    products: results.productResults,
    packs: results.packResults,
    isLoading
  };
};