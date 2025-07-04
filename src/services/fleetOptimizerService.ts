import { supabase } from "@/integrations/supabase/client";
import type { 
  FleetConfiguration,
  FleetOptimizationResult,
  FleetRecommendation,
  EquipmentSpec 
} from "@/types/fleetGenerator";

export class FleetOptimizerService {
  
  // Optimiser une configuration de parc
  static async optimizeFleetConfiguration(configurationId: string): Promise<FleetOptimizationResult> {
    const configuration = await this.getConfiguration(configurationId);
    if (!configuration) {
      throw new Error('Configuration non trouvée');
    }
    
    const originalCost = configuration.total_cost;
    const recommendations: FleetRecommendation[] = [];
    const alternativeConfigurations: FleetConfiguration[] = [];
    
    // 1. Analyser les possibilités d'optimisation
    const costOptimizations = await this.analyzeCostOptimizations(configuration);
    const performanceOptimizations = await this.analyzePerformanceOptimizations(configuration);
    const mixOptimizations = await this.analyzeNewRefurbishedMix(configuration);
    
    // 2. Générer les recommandations
    recommendations.push(...costOptimizations.recommendations);
    recommendations.push(...performanceOptimizations.recommendations);
    recommendations.push(...mixOptimizations.recommendations);
    
    // 3. Créer des configurations alternatives
    const budgetAlternative = await this.createBudgetOptimizedAlternative(configuration);
    const performanceAlternative = await this.createPerformanceOptimizedAlternative(configuration);
    const balancedAlternative = await this.createBalancedAlternative(configuration);
    
    if (budgetAlternative) alternativeConfigurations.push(budgetAlternative);
    if (performanceAlternative) alternativeConfigurations.push(performanceAlternative);
    if (balancedAlternative) alternativeConfigurations.push(balancedAlternative);
    
    // 4. Calculer les économies potentielles
    const bestAlternative = alternativeConfigurations.reduce((best, current) => 
      current.total_cost < best.total_cost ? current : best, 
      { total_cost: originalCost } as any
    );
    
    const optimizedCost = bestAlternative.total_cost;
    const savingsAmount = originalCost - optimizedCost;
    const savingsPercentage = originalCost > 0 ? (savingsAmount / originalCost) * 100 : 0;
    
    // 5. Sauvegarder les recommandations
    await this.saveRecommendations(configurationId, recommendations);
    
    return {
      original_cost: originalCost,
      optimized_cost: optimizedCost,
      savings_amount: savingsAmount,
      savings_percentage: savingsPercentage,
      recommendations,
      alternative_configurations: alternativeConfigurations
    };
  }
  
  // Analyser les optimisations de coûts
  private static async analyzeCostOptimizations(configuration: FleetConfiguration): Promise<{
    recommendations: FleetRecommendation[]
  }> {
    const recommendations: FleetRecommendation[] = [];
    
    // Analyser le ratio neuf/reconditionné
    const newCount = configuration.equipment_list.filter(e => e.condition === 'new').length;
    const totalCount = configuration.equipment_list.length;
    const newRatio = totalCount > 0 ? newCount / totalCount : 0;
    
    if (newRatio > 0.5) {
      const potentialSavings = configuration.total_cost * 0.25; // 25% d'économies potentielles
      recommendations.push({
        id: crypto.randomUUID(),
        configuration_id: configuration.id,
        recommendation_type: 'cost_optimization',
        title: 'Augmenter la part de matériel reconditionné',
        description: `En passant à 60% de matériel reconditionné, vous pourriez économiser environ ${potentialSavings.toFixed(0)}€`,
        impact_score: 0.8,
        cost_impact: -potentialSavings,
        data: {
          current_new_ratio: newRatio,
          recommended_new_ratio: 0.4,
          potential_savings: potentialSavings
        },
        is_applied: false,
        created_at: new Date().toISOString()
      });
    }
    
    // Analyser la sur-spécification
    const overSpecifiedItems = configuration.equipment_list.filter(item => 
      this.isOverSpecified(item, configuration.requirements)
    );
    
    if (overSpecifiedItems.length > 0) {
      const overSpecSavings = overSpecifiedItems.length * 200; // Estimation d'économies
      recommendations.push({
        id: crypto.randomUUID(),
        configuration_id: configuration.id,
        recommendation_type: 'spec_optimization',
        title: 'Ajuster les spécifications techniques',
        description: `${overSpecifiedItems.length} équipements semblent sur-dimensionnés pour vos besoins`,
        impact_score: 0.6,
        cost_impact: -overSpecSavings,
        data: {
          over_specified_count: overSpecifiedItems.length,
          over_specified_items: overSpecifiedItems
        },
        is_applied: false,
        created_at: new Date().toISOString()
      });
    }
    
    return { recommendations };
  }
  
  // Analyser les optimisations de performance
  private static async analyzePerformanceOptimizations(configuration: FleetConfiguration): Promise<{
    recommendations: FleetRecommendation[]
  }> {
    const recommendations: FleetRecommendation[] = [];
    
    // Vérifier si certains équipements sont sous-dimensionnés
    const underSpecifiedItems = configuration.equipment_list.filter(item => 
      this.isUnderSpecified(item, configuration.requirements)
    );
    
    if (underSpecifiedItems.length > 0) {
      recommendations.push({
        id: crypto.randomUUID(),
        configuration_id: configuration.id,
        recommendation_type: 'performance_optimization',
        title: 'Améliorer certaines spécifications',
        description: `${underSpecifiedItems.length} équipements pourraient bénéficier d'une mise à niveau`,
        impact_score: 0.7,
        cost_impact: underSpecifiedItems.length * 150,
        data: {
          under_specified_count: underSpecifiedItems.length,
          under_specified_items: underSpecifiedItems,
          recommended_upgrades: this.getRecommendedUpgrades(underSpecifiedItems)
        },
        is_applied: false,
        created_at: new Date().toISOString()
      });
    }
    
    return { recommendations };
  }
  
  // Analyser l'optimisation du mix neuf/reconditionné
  private static async analyzeNewRefurbishedMix(configuration: FleetConfiguration): Promise<{
    recommendations: FleetRecommendation[]
  }> {
    const recommendations: FleetRecommendation[] = [];
    
    // Calculer le mix optimal selon le budget et les besoins
    const optimalMix = this.calculateOptimalMix(configuration);
    const currentMix = this.getCurrentMix(configuration);
    
    if (Math.abs(optimalMix.new_ratio - currentMix.new_ratio) > 0.1) {
      const direction = optimalMix.new_ratio > currentMix.new_ratio ? 'augmenter' : 'réduire';
      const impactAmount = Math.abs(optimalMix.estimated_savings);
      
      recommendations.push({
        id: crypto.randomUUID(),
        configuration_id: configuration.id,
        recommendation_type: 'mix_optimization',
        title: `${direction === 'augmenter' ? 'Augmenter' : 'Réduire'} la part de matériel neuf`,
        description: `Mix optimal: ${(optimalMix.new_ratio * 100).toFixed(0)}% neuf, ${((1 - optimalMix.new_ratio) * 100).toFixed(0)}% reconditionné`,
        impact_score: 0.6,
        cost_impact: direction === 'réduire' ? -impactAmount : impactAmount,
        data: {
          current_mix: currentMix,
          optimal_mix: optimalMix,
          direction
        },
        is_applied: false,
        created_at: new Date().toISOString()
      });
    }
    
    return { recommendations };
  }
  
  // Créer une alternative optimisée pour le budget
  private static async createBudgetOptimizedAlternative(configuration: FleetConfiguration): Promise<FleetConfiguration | null> {
    const optimizedEquipment = configuration.equipment_list.map(item => ({
      ...item,
      condition: (item.type === 'workstation' ? 'new' : 'refurbished') as 'new' | 'refurbished',
      specs: this.optimizeSpecsForBudget(item.specs, configuration.requirements)
    }));
    
    const optimizedCost = await this.calculateEquipmentCost(optimizedEquipment);
    
    return {
      ...configuration,
      id: crypto.randomUUID(),
      name: `${configuration.name} - Optimisé Budget`,
      equipment_list: optimizedEquipment,
      total_cost: optimizedCost.total_cost,
      monthly_cost: optimizedCost.monthly_cost,
      optimization_score: 85,
      status: 'optimized',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  // Créer une alternative optimisée pour la performance
  private static async createPerformanceOptimizedAlternative(configuration: FleetConfiguration): Promise<FleetConfiguration | null> {
    const optimizedEquipment = configuration.equipment_list.map(item => ({
      ...item,
      condition: 'new' as const,
      specs: this.optimizeSpecsForPerformance(item.specs, configuration.requirements)
    }));
    
    const optimizedCost = await this.calculateEquipmentCost(optimizedEquipment);
    
    return {
      ...configuration,
      id: crypto.randomUUID(),
      name: `${configuration.name} - Optimisé Performance`,
      equipment_list: optimizedEquipment,
      total_cost: optimizedCost.total_cost,
      monthly_cost: optimizedCost.monthly_cost,
      optimization_score: 95,
      status: 'optimized',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  // Créer une alternative équilibrée
  private static async createBalancedAlternative(configuration: FleetConfiguration): Promise<FleetConfiguration | null> {
    const optimalMix = this.calculateOptimalMix(configuration);
    
    const optimizedEquipment = configuration.equipment_list.map((item, index) => ({
      ...item,
      condition: ((index / configuration.equipment_list.length) < optimalMix.new_ratio ? 'new' : 'refurbished') as 'new' | 'refurbished',
      specs: this.balanceSpecs(item.specs, configuration.requirements)
    }));
    
    const optimizedCost = await this.calculateEquipmentCost(optimizedEquipment);
    
    return {
      ...configuration,
      id: crypto.randomUUID(),
      name: `${configuration.name} - Équilibré`,
      equipment_list: optimizedEquipment,
      total_cost: optimizedCost.total_cost,
      monthly_cost: optimizedCost.monthly_cost,
      optimization_score: 90,
      status: 'optimized',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  // Utilitaires privés
  private static async getConfiguration(id: string): Promise<FleetConfiguration | null> {
    const { data, error } = await supabase
      .from('fleet_configurations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }
  
  private static isOverSpecified(item: EquipmentSpec, requirements: any): boolean {
    if (requirements.performance === 'low' && item.specs?.cpu?.includes('i7')) return true;
    if (requirements.performance === 'medium' && item.specs?.ram === '32GB') return true;
    if (requirements.graphics === 'low' && item.specs?.gpu) return true;
    return false;
  }
  
  private static isUnderSpecified(item: EquipmentSpec, requirements: any): boolean {
    if (requirements.performance === 'high' && item.specs?.cpu?.includes('i3')) return true;
    if (requirements.performance === 'high' && item.specs?.ram === '4GB') return true;
    if (requirements.graphics === 'high' && !item.specs?.gpu) return true;
    return false;
  }
  
  private static getRecommendedUpgrades(items: EquipmentSpec[]): any[] {
    return items.map(item => ({
      current: item.specs,
      recommended: {
        ...item.specs,
        ram: item.specs?.ram === '4GB' ? '8GB' : item.specs?.ram === '8GB' ? '16GB' : item.specs?.ram,
        cpu: item.specs?.cpu?.includes('i3') ? item.specs.cpu.replace('i3', 'i5') : item.specs?.cpu
      }
    }));
  }
  
  private static calculateOptimalMix(configuration: FleetConfiguration): any {
    const budget = configuration.budget || configuration.total_cost;
    const hasHighPerformanceNeeds = configuration.requirements.performance === 'high';
    
    let optimalNewRatio = 0.3; // Défaut
    
    if (budget > 50000) optimalNewRatio = 0.5;
    if (hasHighPerformanceNeeds) optimalNewRatio += 0.2;
    if (budget < 20000) optimalNewRatio = 0.2;
    
    optimalNewRatio = Math.min(0.8, Math.max(0.1, optimalNewRatio));
    
    return {
      new_ratio: optimalNewRatio,
      refurbished_ratio: 1 - optimalNewRatio,
      estimated_savings: configuration.total_cost * 0.15 // Estimation
    };
  }
  
  private static getCurrentMix(configuration: FleetConfiguration): any {
    const newCount = configuration.equipment_list.filter(e => e.condition === 'new').length;
    const totalCount = configuration.equipment_list.length;
    
    return {
      new_ratio: totalCount > 0 ? newCount / totalCount : 0,
      refurbished_ratio: totalCount > 0 ? (totalCount - newCount) / totalCount : 0
    };
  }
  
  private static optimizeSpecsForBudget(specs: any, requirements: any): any {
    const optimized = { ...specs };
    
    // Réduire les specs si possible sans impacter les besoins critiques
    if (requirements.performance !== 'high' && specs.ram === '16GB') {
      optimized.ram = '8GB';
    }
    if (requirements.graphics === 'low' && specs.gpu) {
      delete optimized.gpu;
    }
    
    return optimized;
  }
  
  private static optimizeSpecsForPerformance(specs: any, requirements: any): any {
    const optimized = { ...specs };
    
    // Améliorer les specs selon les besoins
    if (requirements.performance === 'high' && specs.ram === '8GB') {
      optimized.ram = '16GB';
    }
    if (requirements.graphics === 'high' && !specs.gpu) {
      optimized.gpu = 'GTX 1650';
    }
    
    return optimized;
  }
  
  private static balanceSpecs(specs: any, requirements: any): any {
    // Équilibrer entre budget et performance
    return specs; // Pour l'instant, retourne les specs existantes
  }
  
  private static async calculateEquipmentCost(equipment: EquipmentSpec[]): Promise<{total_cost: number, monthly_cost: number}> {
    // Réutiliser la logique de calcul du service principal
    const basePrices: Record<string, number> = {
      'laptop-standard': 800,
      'laptop-development': 1200,
      'desktop-office': 600,
      'workstation-creative': 2000,
      'monitor-standard': 200,
      'monitor-pro': 400
    };
    
    let total_cost = 0;
    
    for (const item of equipment) {
      const key = `${item.type}-${item.category}`;
      let basePrice = basePrices[key] || 800;
      
      // Réduction pour le reconditionné
      if (item.condition === 'refurbished') {
        basePrice *= 0.7;
      }
      
      // Ajustements selon les specs
      if (item.specs?.ram === '16GB') basePrice *= 1.3;
      if (item.specs?.ram === '32GB') basePrice *= 1.6;
      if (item.specs?.gpu) basePrice *= 1.5;
      
      total_cost += basePrice * item.quantity;
    }
    
    return {
      total_cost,
      monthly_cost: total_cost / 48 // 4 ans de leasing
    };
  }
  
  private static async saveRecommendations(configurationId: string, recommendations: FleetRecommendation[]): Promise<void> {
    if (recommendations.length === 0) return;
    
    const { error } = await supabase
      .from('fleet_recommendations')
      .insert(recommendations.map(rec => ({
        configuration_id: configurationId,
        recommendation_type: rec.recommendation_type,
        title: rec.title,
        description: rec.description,
        impact_score: rec.impact_score,
        cost_impact: rec.cost_impact,
        data: rec.data,
        is_applied: false
      })));
    
    if (error) {
      console.error('Erreur lors de la sauvegarde des recommandations:', error);
    }
  }
}