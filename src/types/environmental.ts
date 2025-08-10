// Environmental data types for iTakecare Catalog Integration

export interface EnvironmentalData {
  id: string;
  category_id: string;
  co2_savings_kg: number;
  carbon_footprint_reduction_percentage?: number;
  energy_savings_kwh?: number;
  water_savings_liters?: number;
  waste_reduction_kg?: number;
  source_url?: string;
  last_updated?: string;
  created_at: string;
  updated_at: string;
  company_id: string;
}

export interface CategoryWithEnvironmental {
  id: string;
  name: string;
  translation: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  co2_savings_kg?: number;
  environmental_impact?: EnvironmentalData;
}

export interface EnvironmentalCategoryResponse {
  id: string;
  category: {
    id: string;
    name: string;
    translation: string;
  };
  co2_savings_kg: number;
  carbon_footprint_reduction_percentage?: number;
  energy_savings_kwh?: number;
  water_savings_liters?: number;
  waste_reduction_kg?: number;
  source_url?: string;
  last_updated?: string;
}

export interface ProductCO2Response {
  product_id: string;
  category_name: string;
  co2_savings_kg: number;
  environmental_data?: EnvironmentalData;
  calculation_method?: string;
}

export interface EnvironmentalApiResponse {
  environmental_categories?: EnvironmentalCategoryResponse[];
  categories?: CategoryWithEnvironmental[];
  product?: ProductCO2Response;
}