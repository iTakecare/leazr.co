import { useMemo } from 'react';
import { useEnvironmentalData } from './useEnvironmentalData';
import { useCompanyDetection } from '@/hooks/useCompanyDetection';
import { 
  calculateCO2Equivalents, 
  getCO2DataForCategory, 
  countPhysicalItems 
} from '@/utils/co2Utils';
import { CO2CalculationResult } from '@/types/environmental';

interface UseCO2CalculatorProps {
  category?: string;
  quantity?: number;
  items?: Array<{
    quantity: number;
    product?: {
      category_name?: string;
      category?: { name: string };
    };
  }>;
  packQuantity?: number;
  companySlug?: string;
}

export const useCO2Calculator = ({
  category,
  quantity = 1,
  items = [],
  packQuantity = 1,
  companySlug
}: UseCO2CalculatorProps): CO2CalculationResult => {
  const { companySlug: detectedSlug } = useCompanyDetection();
  const finalCompanySlug = companySlug || detectedSlug;
  
  // Get environmental data (will be cached by React Query)
  const { data: environmentalData, isLoading } = useEnvironmentalData(
    finalCompanySlug
  );

  const result = useMemo((): CO2CalculationResult => {
    let totalCO2 = 0;
    let source = 'impactco2.fr';
    let hasRealData = false;

    // Single category calculation (for individual products)
    if (category) {
      const categoryData = getCO2DataForCategory(
        category,
        environmentalData?.environmental_categories || environmentalData?.categories
      );
      
      totalCO2 = categoryData.co2Kg * quantity;
      source = categoryData.source;
      hasRealData = categoryData.hasRealData;
    }
    
    // Multiple items calculation (for packs)
    else if (items.length > 0) {
      const environmentalCategories = environmentalData?.environmental_categories || environmentalData?.categories;
      
      totalCO2 = items.reduce((total, item) => {
        const standardizedCategory = item.product?.category?.name || '';
        const fallbackCategory = item.product?.category_name || '';
        const itemCategory = standardizedCategory || fallbackCategory;
        const itemQuantity = item.quantity || 1;
        
        const categoryData = getCO2DataForCategory(itemCategory, environmentalCategories);
        
        if (categoryData.hasRealData) {
          hasRealData = true;
        }
        
        return total + (categoryData.co2Kg * itemQuantity * packQuantity);
      }, 0);
      
      // Use database source if we have real data
      if (hasRealData && environmentalData?.environmental_categories?.[0]?.source_url) {
        source = environmentalData.environmental_categories[0].source_url;
      }
    }

    const equivalents = calculateCO2Equivalents(totalCO2);

    return {
      co2Kg: totalCO2,
      carKilometers: equivalents.carKilometers,
      treeMonths: equivalents.treeMonths,
      source,
      hasRealData: hasRealData && !isLoading
    };
  }, [category, quantity, items, packQuantity, environmentalData, isLoading]);

  return result;
};

// Helper hook for pack calculations
export const usePackCO2Calculator = (
  items: Array<{
    quantity: number;
    product?: {
      category_name?: string;
      category?: { name: string };
    };
  }>,
  packQuantity: number = 1,
  companySlug?: string
) => {
  const calculation = useCO2Calculator({
    items,
    packQuantity,
    companySlug
  });

  const { companySlug: detectedSlug } = useCompanyDetection();
  const finalCompanySlug = companySlug || detectedSlug;
  
  const { data: environmentalData } = useEnvironmentalData(
    finalCompanySlug
  );

  const physicalItemsCount = useMemo(() => {
    return countPhysicalItems(
      items, 
      packQuantity,
      environmentalData?.environmental_categories || environmentalData?.categories
    );
  }, [items, packQuantity, environmentalData]);

  return {
    ...calculation,
    physicalItemsCount
  };
};