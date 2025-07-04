export interface BusinessProfile {
  id: string;
  name: string;
  sector: string;
  description?: string;
  typical_team_size_min: number;
  typical_team_size_max: number;
  typical_budget_min: number;
  typical_budget_max: number;
  requirements: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FleetTemplate {
  id: string;
  name: string;
  business_profile_id?: string;
  description?: string;
  team_size_min: number;
  team_size_max: number;
  estimated_budget: number;
  configuration: Record<string, any>;
  equipment_list: EquipmentSpec[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  business_profile?: BusinessProfile;
}

export interface FleetConfiguration {
  id: string;
  user_id?: string;
  company_id?: string;
  client_id?: string;
  template_id?: string;
  name: string;
  business_sector?: string;
  team_size: number;
  budget?: number;
  requirements: Record<string, any>;
  generated_configuration: Record<string, any>;
  equipment_list: EquipmentSpec[];
  total_cost: number;
  monthly_cost: number;
  optimization_score: number;
  status: 'draft' | 'optimized' | 'approved' | 'converted';
  created_at: string;
  updated_at: string;
  template?: FleetTemplate;
}

export interface FleetRecommendation {
  id: string;
  configuration_id: string;
  recommendation_type: string;
  title: string;
  description?: string;
  impact_score: number;
  cost_impact: number;
  data: Record<string, any>;
  is_applied: boolean;
  created_at: string;
}

export interface EquipmentSpec {
  type: string;
  category: string;
  quantity: number;
  specs: Record<string, any>;
  unit_price?: number;
  total_price?: number;
  leasing_monthly?: number;
  condition?: 'new' | 'refurbished';
}

export interface FleetGenerationRequest {
  business_sector: string;
  team_size: number;
  budget?: number;
  requirements: {
    performance: 'low' | 'medium' | 'high';
    mobility: 'low' | 'medium' | 'high';
    graphics: 'low' | 'medium' | 'high';
  };
  preferences?: {
    new_ratio?: number;
    refurbished_ratio?: number;
    include_accessories?: boolean;
    include_peripherals?: boolean;
  };
}

export interface FleetOptimizationResult {
  original_cost: number;
  optimized_cost: number;
  savings_amount: number;
  savings_percentage: number;
  recommendations: FleetRecommendation[];
  alternative_configurations: FleetConfiguration[];
}

export interface FleetGenerationLog {
  id: string;
  user_id?: string;
  configuration_id?: string;
  action: string;
  data: Record<string, any>;
  execution_time_ms?: number;
  created_at: string;
}