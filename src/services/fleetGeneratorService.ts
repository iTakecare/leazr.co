import { supabase } from "@/integrations/supabase/client";
import type { 
  FleetConfiguration, 
  FleetGenerationRequest, 
  FleetTemplate,
  BusinessProfile,
  EquipmentSpec,
  FleetRecommendation,
  FleetGenerationLog 
} from "@/types/fleetGenerator";

export class FleetGeneratorService {
  
  // Générer une configuration de parc basée sur les besoins
  static async generateFleetConfiguration(request: FleetGenerationRequest): Promise<FleetConfiguration> {
    const startTime = Date.now();
    
    try {
      // 1. Trouver le template le plus adapté
      const template = await this.findBestTemplate(request);
      
      // 2. Adapter la configuration aux besoins spécifiques
      const adaptedConfiguration = await this.adaptConfigurationToNeeds(template, request);
      
      // 3. Calculer les coûts
      const costCalculation = await this.calculateCosts(adaptedConfiguration);
      
      // 4. Générer un score d'optimisation
      const optimizationScore = this.calculateOptimizationScore(adaptedConfiguration, request);
      
      // 5. Créer la configuration en base
      const { data: configuration, error } = await supabase
        .from('fleet_configurations')
        .insert({
          name: `Configuration ${request.business_sector} - ${request.team_size} postes`,
          business_sector: request.business_sector,
          team_size: request.team_size,
          budget: request.budget,
          requirements: request.requirements,
          template_id: template?.id,
          generated_configuration: adaptedConfiguration,
          equipment_list: adaptedConfiguration.equipment_list,
          total_cost: costCalculation.total_cost,
          monthly_cost: costCalculation.monthly_cost,
          optimization_score: optimizationScore,
          status: 'draft'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // 6. Logger l'action
      await this.logAction('generate_configuration', configuration.id, {
        request,
        execution_time_ms: Date.now() - startTime
      });
      
      return configuration;
      
    } catch (error) {
      console.error('Erreur lors de la génération:', error);
      throw new Error('Impossible de générer la configuration de parc');
    }
  }
  
  // Trouver le meilleur template selon les critères
  private static async findBestTemplate(request: FleetGenerationRequest): Promise<FleetTemplate | null> {
    const { data: templates, error } = await supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .eq('is_active', true)
      .gte('team_size_max', request.team_size)
      .lte('team_size_min', request.team_size);
    
    if (error || !templates) return null;
    
    // Scoring des templates selon les critères
    const scoredTemplates = templates.map(template => {
      let score = 0;
      
      // Score basé sur le secteur
      if (template.business_profile?.sector === this.mapSectorToProfile(request.business_sector)) {
        score += 50;
      }
      
      // Score basé sur la taille d'équipe (plus proche = meilleur)
      const sizeDistance = Math.abs(
        (template.team_size_min + template.team_size_max) / 2 - request.team_size
      );
      score += Math.max(0, 30 - sizeDistance);
      
      // Score basé sur le budget si spécifié
      if (request.budget && template.estimated_budget) {
        const budgetRatio = Math.min(request.budget, template.estimated_budget) / 
                           Math.max(request.budget, template.estimated_budget);
        score += budgetRatio * 20;
      }
      
      return { template, score };
    });
    
    // Retourner le template avec le meilleur score
    const bestTemplate = scoredTemplates.sort((a, b) => b.score - a.score)[0];
    return bestTemplate?.template || null;
  }
  
  // Adapter la configuration aux besoins spécifiques
  private static async adaptConfigurationToNeeds(
    template: FleetTemplate | null, 
    request: FleetGenerationRequest
  ): Promise<any> {
    if (!template) {
      // Générer une configuration de base si pas de template
      return this.generateBasicConfiguration(request);
    }
    
    const baseConfig = { ...template.configuration };
    const baseEquipment = [...template.equipment_list];
    
    // Adapter selon les exigences de performance
    const adaptedEquipment = this.adaptEquipmentSpecs(baseEquipment, request.requirements);
    
    // Ajuster les quantités selon la taille d'équipe
    const scaledEquipment = this.scaleEquipmentQuantities(adaptedEquipment, request.team_size);
    
    // Ajuster le mix neuf/reconditionné selon le budget
    const optimizedEquipment = await this.optimizeNewRefurbishedMix(scaledEquipment, request.budget);
    
    return {
      ...baseConfig,
      equipment_list: optimizedEquipment,
      adapted_from_template: template.id,
      adaptation_reason: 'Adapté aux besoins spécifiques'
    };
  }
  
  // Générer une configuration de base sans template
  private static generateBasicConfiguration(request: FleetGenerationRequest): any {
    const equipment: EquipmentSpec[] = [];
    
    // Configuration de base selon le secteur
    switch (request.business_sector) {
      case 'technology':
        equipment.push({
          type: 'laptop',
          category: 'development',
          quantity: request.team_size,
          specs: {
            ram: request.requirements.performance === 'high' ? '16GB' : '8GB',
            storage: '512GB SSD',
            cpu: request.requirements.performance === 'high' ? 'Intel i7' : 'Intel i5'
          }
        });
        break;
        
      case 'office':
        equipment.push({
          type: 'desktop',
          category: 'office',
          quantity: Math.floor(request.team_size * 0.8),
          specs: { ram: '8GB', storage: '256GB SSD', cpu: 'Intel i5' }
        });
        equipment.push({
          type: 'laptop',
          category: 'mobile',
          quantity: Math.ceil(request.team_size * 0.2),
          specs: { ram: '8GB', storage: '256GB SSD', cpu: 'Intel i5' }
        });
        break;
        
      default:
        equipment.push({
          type: 'laptop',
          category: 'standard',
          quantity: request.team_size,
          specs: { ram: '8GB', storage: '256GB SSD', cpu: 'Intel i5' }
        });
    }
    
    // Ajouter des moniteurs si nécessaire
    if (request.requirements.graphics !== 'low') {
      equipment.push({
        type: 'monitor',
        category: 'standard',
        quantity: request.team_size,
        specs: { 
          size: request.requirements.graphics === 'high' ? '27"' : '24"',
          resolution: request.requirements.graphics === 'high' ? '2560x1440' : '1920x1080'
        }
      });
    }
    
    return {
      equipment_list: equipment,
      mix_ratio: { new: 0.3, refurbished: 0.7 },
      generated_automatically: true
    };
  }
  
  // Calculer les coûts d'une configuration
  private static async calculateCosts(configuration: any): Promise<{total_cost: number, monthly_cost: number}> {
    let total_cost = 0;
    let monthly_cost = 0;
    
    // Prix de base par type d'équipement (simulation)
    const basePrices: Record<string, number> = {
      'laptop-standard': 800,
      'laptop-development': 1200,
      'laptop-mobile': 900,
      'desktop-office': 600,
      'workstation-creative': 2000,
      'monitor-standard': 200,
      'monitor-pro': 400
    };
    
    for (const equipment of configuration.equipment_list) {
      const key = `${equipment.type}-${equipment.category}`;
      const basePrice = basePrices[key] || 800;
      
      // Ajustement selon les specs
      let adjustedPrice = basePrice;
      if (equipment.specs?.ram === '16GB') adjustedPrice *= 1.3;
      if (equipment.specs?.ram === '32GB') adjustedPrice *= 1.6;
      if (equipment.specs?.gpu) adjustedPrice *= 1.5;
      
      const equipmentTotal = adjustedPrice * equipment.quantity;
      total_cost += equipmentTotal;
      
      // Calcul mensuel approximatif (4 ans de leasing)
      monthly_cost += equipmentTotal / 48;
    }
    
    return { total_cost, monthly_cost };
  }
  
  // Calculer un score d'optimisation
  private static calculateOptimizationScore(configuration: any, request: FleetGenerationRequest): number {
    let score = 50; // Score de base
    
    // Bonus si respect du budget
    if (request.budget && configuration.total_cost <= request.budget) {
      score += 30;
    }
    
    // Bonus pour le bon mix neuf/reconditionné
    const hasGoodMix = configuration.mix_ratio?.new >= 0.2 && configuration.mix_ratio?.new <= 0.4;
    if (hasGoodMix) score += 20;
    
    return Math.min(100, Math.max(0, score));
  }
  
  // Utilitaires
  private static mapSectorToProfile(sector: string): string {
    const mapping: Record<string, string> = {
      'technology': 'technology',
      'startup': 'technology',
      'office': 'office',
      'creative': 'creative',
      'design': 'creative',
      'sales': 'sales',
      'customer_service': 'customer_service'
    };
    return mapping[sector] || 'office';
  }
  
  private static adaptEquipmentSpecs(equipment: EquipmentSpec[], requirements: any): EquipmentSpec[] {
    return equipment.map(item => {
      const adaptedItem = { ...item };
      
      if (requirements.performance === 'high') {
        if (item.specs?.cpu?.includes('i5')) {
          adaptedItem.specs = { ...item.specs, cpu: item.specs.cpu.replace('i5', 'i7') };
        }
        if (item.specs?.ram === '8GB') {
          adaptedItem.specs = { ...item.specs, ram: '16GB' };
        }
      }
      
      return adaptedItem;
    });
  }
  
  private static scaleEquipmentQuantities(equipment: EquipmentSpec[], targetSize: number): EquipmentSpec[] {
    return equipment.map(item => ({
      ...item,
      quantity: Math.ceil((item.quantity / 10) * targetSize) // Ratio basé sur 10 postes de référence
    }));
  }
  
  private static async optimizeNewRefurbishedMix(equipment: EquipmentSpec[], budget?: number): Promise<EquipmentSpec[]> {
    // Logique d'optimisation du mix neuf/reconditionné selon le budget
    const newRatio = budget && budget < 20000 ? 0.2 : 0.4;
    
    return equipment.map(item => ({
      ...item,
      condition: Math.random() < newRatio ? 'new' : 'refurbished'
    }));
  }
  
  // Logger une action
  private static async logAction(action: string, configurationId?: string, data?: any): Promise<void> {
    try {
      await supabase
        .from('fleet_generation_logs')
        .insert({
          action,
          configuration_id: configurationId,
          data: data || {},
          execution_time_ms: data?.execution_time_ms
        });
    } catch (error) {
      console.error('Erreur lors du logging:', error);
    }
  }
  
  // Récupérer les configurations d'une entreprise
  static async getFleetConfigurations(): Promise<FleetConfiguration[]> {
    const { data, error } = await supabase
      .from('fleet_configurations')
      .select(`
        *,
        template:fleet_templates(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
  
  // Récupérer une configuration spécifique
  static async getFleetConfiguration(id: string): Promise<FleetConfiguration | null> {
    const { data, error } = await supabase
      .from('fleet_configurations')
      .select(`
        *,
        template:fleet_templates(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }
  
  // Mettre à jour le statut d'une configuration
  static async updateConfigurationStatus(id: string, status: FleetConfiguration['status']): Promise<void> {
    const { error } = await supabase
      .from('fleet_configurations')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
    
    await this.logAction('status_change', id, { new_status: status });
  }
}