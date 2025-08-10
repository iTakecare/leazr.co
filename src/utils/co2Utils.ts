// CO2 calculation utilities and category mappings

import { EnvironmentalCategoryResponse, CategoryWithEnvironmental } from '@/types/environmental';

/**
 * Calculate CO2 equivalents for car distance and tree absorption
 */
export const calculateCO2Equivalents = (co2Kg: number) => {
  return {
    carKilometers: Math.round(co2Kg * 6), // ~6km per kg CO2
    treeMonths: Math.round(co2Kg / 20), // ~20kg CO2 absorbed per tree per month
  };
};

/**
 * Normalize category names to match database entries
 */
export const normalizeCategoryName = (category: string): string => {
  if (!category) return '';
  
  const categoryLower = category.toLowerCase().trim();
  
  // Standardized mappings
  const mappings: Record<string, string> = {
    // Laptops
    'laptop': 'laptop',
    'laptops': 'laptop', 
    'ordinateur portable': 'laptop',
    'pc portable': 'laptop',
    
    // Desktops
    'desktop': 'desktop',
    'desktops': 'desktop',
    'ordinateur fixe': 'desktop',
    'pc fixe': 'desktop',
    'ordinateur de bureau': 'desktop',
    
    // Smartphones
    'smartphone': 'smartphone',
    'smartphones': 'smartphone',
    'téléphone': 'smartphone',
    'mobile': 'smartphone',
    
    // Tablets
    'tablet': 'tablet',
    'tablets': 'tablet', 
    'tablette': 'tablet',
    'ipad': 'tablet',
    'ipad m4': 'tablet',
    
    // Monitors
    'monitor': 'monitor',
    'monitors': 'monitor',
    'écran': 'monitor',
    'moniteur': 'monitor',
    'display': 'monitor',
    
    // Printers
    'printer': 'printer',
    'printers': 'printer',
    'imprimante': 'printer',
    
    // Servers
    'server': 'server',
    'servers': 'server',
    'serveur': 'server',
    
    // Accessories
    'accessory': 'accessories',
    'accessories': 'accessories',
    'accessoire': 'accessories',
    'keyboard': 'accessories',
    'clavier': 'accessories', 
    'mouse': 'accessories',
    'souris': 'accessories',
    'bureautique': 'accessories',
    
    // Software
    'software': 'software',
    'logiciel': 'software',
    'licence': 'software',
    'license': 'software',
    
    // Other
    'other': 'other',
    'autre': 'other',
  };
  
  return mappings[categoryLower] || categoryLower;
};

/**
 * Get CO2 data for a category from environmental data
 */
export const getCO2DataForCategory = (
  category: string,
  environmentalData?: EnvironmentalCategoryResponse[] | CategoryWithEnvironmental[]
): { co2Kg: number; source: string; hasRealData: boolean } => {
  if (!environmentalData || !category) {
    return getFallbackCO2Data(category);
  }
  
  const normalizedCategory = normalizeCategoryName(category);
  
  // Search in environmental data
  const categoryData = environmentalData.find(data => {
    if ('category' in data) {
      // EnvironmentalCategoryResponse
      return normalizeCategoryName(data.category.name) === normalizedCategory;
    } else {
      // CategoryWithEnvironmental
      return normalizeCategoryName(data.name) === normalizedCategory;
    }
  });
  
  if (categoryData && categoryData.co2_savings_kg > 0) {
    let source = 'Database';
    
    if ('category' in categoryData && categoryData.source_url) {
      source = categoryData.source_url;
    } else if ('environmental_impact' in categoryData && categoryData.environmental_impact?.source_url) {
      source = categoryData.environmental_impact.source_url;
    }
    
    return {
      co2Kg: categoryData.co2_savings_kg,
      source,
      hasRealData: true
    };
  }
  
  return getFallbackCO2Data(category);
};

/**
 * Fallback CO2 data when real data is not available
 */
export const getFallbackCO2Data = (category: string): { co2Kg: number; source: string; hasRealData: boolean } => {
  const normalizedCategory = normalizeCategoryName(category);
  
  const fallbackValues: Record<string, number> = {
    'laptop': 170,
    'desktop': 170,
    'smartphone': 45,
    'tablet': 87,
    'monitor': 85,
    'printer': 65,
    'server': 300,
    'accessories': 15,
    'software': 0,
    'other': 25,
  };
  
  const co2Kg = fallbackValues[normalizedCategory] || 25;
  
  return {
    co2Kg,
    source: 'impactco2.fr',
    hasRealData: false
  };
};

/**
 * Count physical items (excludes software with 0 CO2 impact)
 */
export const countPhysicalItems = (
  items: Array<{
    quantity: number;
    product?: {
      category_name?: string;
      category?: { name: string };
    };
  }>,
  packQuantity: number = 1,
  environmentalData?: EnvironmentalCategoryResponse[] | CategoryWithEnvironmental[]
): number => {
  return items.reduce((sum, item) => {
    const standardizedCategory = item.product?.category?.name || '';
    const fallbackCategory = item.product?.category_name || '';
    const category = standardizedCategory || fallbackCategory;
    
    const { co2Kg } = getCO2DataForCategory(category, environmentalData);
    
    // Only count items that have CO2 impact (physical devices)
    if (co2Kg > 0) {
      return sum + item.quantity;
    }
    return sum;
  }, 0) * packQuantity;
};
