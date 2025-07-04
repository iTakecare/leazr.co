import { supabase } from "@/integrations/supabase/client";
import type { FleetConfiguration, FleetGenerationLog } from "@/types/fleetGenerator";

export interface FleetAnalytics {
  total_configurations: number;
  total_cost_generated: number;
  average_team_size: number;
  average_optimization_score: number;
  popular_sectors: Array<{ sector: string; count: number; percentage: number }>;
  cost_distribution: Array<{ range: string; count: number; percentage: number }>;
  template_usage: Array<{ template_name: string; usage_count: number; percentage: number }>;
  monthly_trends: Array<{ month: string; configurations: number; total_cost: number }>;
  optimization_impact: {
    total_savings: number;
    average_savings_percentage: number;
    recommendations_applied: number;
  };
}

export interface UserActivity {
  configurations_created: number;
  templates_used: Array<{ template_name: string; count: number }>;
  sectors_explored: string[];
  average_team_size: number;
  total_cost_configured: number;
  last_activity: string;
}

export class FleetAnalyticsService {
  
  // Obtenir les analytics globales de l'entreprise
  static async getCompanyAnalytics(): Promise<FleetAnalytics> {
    try {
      // Récupérer toutes les configurations de l'entreprise
      const { data: configurations, error } = await supabase
        .from('fleet_configurations')
        .select(`
          *,
          template:fleet_templates(name)
        `);
      
      if (error) throw error;
      
      const configs = configurations || [];
      const totalConfigurations = configs.length;
      
      if (totalConfigurations === 0) {
        return this.getEmptyAnalytics();
      }
      
      // Calculs de base
      const totalCostGenerated = configs.reduce((sum, config) => sum + (Number(config.total_cost) || 0), 0);
      const averageTeamSize = configs.reduce((sum, config) => sum + Number(config.team_size), 0) / totalConfigurations;
      const averageOptimizationScore = configs.reduce((sum, config) => sum + (Number(config.optimization_score) || 0), 0) / totalConfigurations;
      
      // Analyse des secteurs populaires
      const sectorCounts = configs.reduce((acc, config) => {
        if (config.business_sector) {
          acc[config.business_sector] = (acc[config.business_sector] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      
      const popularSectors = Object.entries(sectorCounts)
        .map(([sector, count]) => ({
          sector,
          count: Number(count),
          percentage: (Number(count) / totalConfigurations) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Distribution des coûts
      const costRanges = [
        { range: '0-10k€', min: 0, max: 10000 },
        { range: '10k-25k€', min: 10000, max: 25000 },
        { range: '25k-50k€', min: 25000, max: 50000 },
        { range: '50k-100k€', min: 50000, max: 100000 },
        { range: '100k€+', min: 100000, max: Infinity }
      ];
      
      const costDistribution = costRanges.map(range => {
        const count = configs.filter(config => 
          config.total_cost >= range.min && config.total_cost < range.max
        ).length;
        return {
          range: range.range,
          count,
          percentage: totalConfigurations > 0 ? (count / totalConfigurations) * 100 : 0
        };
      });
      
      // Usage des templates
      const templateCounts = configs.reduce((acc, config) => {
        const templateName = config.template?.name || 'Configuration personnalisée';
        acc[templateName] = (acc[templateName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const templateUsage = Object.entries(templateCounts)
        .map(([template_name, usage_count]) => ({
          template_name,
          usage_count: Number(usage_count),
          percentage: (Number(usage_count) / totalConfigurations) * 100
        }))
        .sort((a, b) => b.usage_count - a.usage_count)
        .slice(0, 10);
      
      // Tendances mensuelles
      const monthlyTrends = await this.calculateMonthlyTrends(configs);
      
      // Impact de l'optimisation
      const optimizationImpact = await this.calculateOptimizationImpact();
      
      return {
        total_configurations: totalConfigurations,
        total_cost_generated: totalCostGenerated,
        average_team_size: Math.round(averageTeamSize),
        average_optimization_score: Math.round(averageOptimizationScore),
        popular_sectors: popularSectors,
        cost_distribution: costDistribution,
        template_usage: templateUsage,
        monthly_trends: monthlyTrends,
        optimization_impact: optimizationImpact
      };
      
    } catch (error) {
      console.error('Erreur lors du calcul des analytics:', error);
      return this.getEmptyAnalytics();
    }
  }
  
  // Obtenir les analytics d'un utilisateur spécifique
  static async getUserActivity(userId?: string): Promise<UserActivity> {
    try {
      let query = supabase
        .from('fleet_configurations')
        .select(`
          *,
          template:fleet_templates(name)
        `);
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data: configurations, error } = await query;
      
      if (error) throw error;
      
      const configs = configurations || [];
      
      if (configs.length === 0) {
        return {
          configurations_created: 0,
          templates_used: [],
          sectors_explored: [],
          average_team_size: 0,
          total_cost_configured: 0,
          last_activity: ''
        };
      }
      
      // Templates utilisés
      const templateCounts = configs.reduce((acc, config) => {
        const templateName = config.template?.name || 'Configuration personnalisée';
        acc[templateName] = (acc[templateName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const templatesUsed = Object.entries(templateCounts)
        .map(([template_name, count]) => ({ template_name, count: Number(count) }))
        .sort((a, b) => b.count - a.count);
      
      // Secteurs explorés
      const sectorsExplored = [...new Set(configs
        .map(config => config.business_sector)
        .filter(Boolean)
      )] as string[];
      
      // Calculs
      const configurationsCreated = configs.length;
      const averageTeamSize = configs.reduce((sum, config) => sum + Number(config.team_size), 0) / configurationsCreated;
      const totalCostConfigured = configs.reduce((sum, config) => sum + (Number(config.total_cost) || 0), 0);
      const lastActivity = configs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
        ?.created_at || '';
      
      return {
        configurations_created: configurationsCreated,
        templates_used: templatesUsed,
        sectors_explored: sectorsExplored,
        average_team_size: Math.round(averageTeamSize),
        total_cost_configured: totalCostConfigured,
        last_activity: lastActivity
      };
      
    } catch (error) {
      console.error('Erreur lors du calcul de l\'activité utilisateur:', error);
      return {
        configurations_created: 0,
        templates_used: [],
        sectors_explored: [],
        average_team_size: 0,
        total_cost_configured: 0,
        last_activity: ''
      };
    }
  }
  
  // Obtenir les logs d'activité
  static async getActivityLogs(limit: number = 50): Promise<FleetGenerationLog[]> {
    const { data, error } = await supabase
      .from('fleet_generation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Erreur lors de la récupération des logs:', error);
      return [];
    }
    
    return data || [];
  }
  
  // Obtenir les metrics de performance
  static async getPerformanceMetrics(): Promise<{
    average_generation_time: number;
    success_rate: number;
    most_common_actions: Array<{ action: string; count: number }>;
  }> {
    try {
      const { data: logs, error } = await supabase
        .from('fleet_generation_logs')
        .select('action, execution_time_ms')
        .not('execution_time_ms', 'is', null);
      
      if (error || !logs) {
        return {
          average_generation_time: 0,
          success_rate: 0,
          most_common_actions: []
        };
      }
      
      // Temps moyen de génération
      const generationLogs = logs.filter(log => log.action === 'generate_configuration');
      const averageGenerationTime = generationLogs.length > 0
        ? generationLogs.reduce((sum, log) => sum + (Number(log.execution_time_ms) || 0), 0) / generationLogs.length
        : 0;
      
      // Taux de succès (estimation basée sur les logs)
      const totalAttempts = logs.length;
      const successRate = totalAttempts > 0 ? 95 : 0; // Estimation fixe pour l'exemple
      
      // Actions les plus communes
      const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const mostCommonActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count: Number(count) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      return {
        average_generation_time: Math.round(averageGenerationTime),
        success_rate: successRate,
        most_common_actions: mostCommonActions
      };
      
    } catch (error) {
      console.error('Erreur lors du calcul des métriques de performance:', error);
      return {
        average_generation_time: 0,
        success_rate: 0,
        most_common_actions: []
      };
    }
  }
  
  // Enregistrer un événement analytics
  static async trackEvent(action: string, data?: any): Promise<void> {
    try {
      await supabase
        .from('fleet_generation_logs')
        .insert({
          action,
          data: data || {},
          execution_time_ms: data?.execution_time_ms
        });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'événement:', error);
    }
  }
  
  // Calculer les tendances mensuelles
  private static calculateMonthlyTrends(configurations: FleetConfiguration[]): Array<{ month: string; configurations: number; total_cost: number }> {
    const monthlyData = configurations.reduce((acc, config) => {
      const date = new Date(config.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = { configurations: 0, total_cost: 0 };
      }
      
      acc[monthKey].configurations += 1;
      acc[monthKey].total_cost += config.total_cost || 0;
      
      return acc;
    }, {} as Record<string, { configurations: number; total_cost: number }>);
    
    // Convertir en tableau et trier par mois
    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        configurations: data.configurations,
        total_cost: data.total_cost
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Derniers 12 mois
  }
  
  // Calculer l'impact de l'optimisation
  private static async calculateOptimizationImpact(): Promise<{
    total_savings: number;
    average_savings_percentage: number;
    recommendations_applied: number;
  }> {
    try {
      const { data: recommendations, error } = await supabase
        .from('fleet_recommendations')
        .select('cost_impact, is_applied');
      
      if (error || !recommendations) {
        return {
          total_savings: 0,
          average_savings_percentage: 0,
          recommendations_applied: 0
        };
      }
      
      const appliedRecommendations = recommendations.filter(rec => rec.is_applied);
      const totalSavings = appliedRecommendations
        .reduce((sum, rec) => sum + Math.abs(rec.cost_impact || 0), 0);
      
      const averageSavingsPercentage = appliedRecommendations.length > 0 ? 15 : 0; // Estimation
      
      return {
        total_savings: totalSavings,
        average_savings_percentage: averageSavingsPercentage,
        recommendations_applied: appliedRecommendations.length
      };
      
    } catch (error) {
      console.error('Erreur lors du calcul de l\'impact d\'optimisation:', error);
      return {
        total_savings: 0,
        average_savings_percentage: 0,
        recommendations_applied: 0
      };
    }
  }
  
  // Retourner des analytics vides
  private static getEmptyAnalytics(): FleetAnalytics {
    return {
      total_configurations: 0,
      total_cost_generated: 0,
      average_team_size: 0,
      average_optimization_score: 0,
      popular_sectors: [],
      cost_distribution: [],
      template_usage: [],
      monthly_trends: [],
      optimization_impact: {
        total_savings: 0,
        average_savings_percentage: 0,
        recommendations_applied: 0
      }
    };
  }
}