import { supabase } from "@/integrations/supabase/client";
import { TemplateUsageStats, TemplatePerformanceMetric } from "@/types/customPdfTemplate";

// Service de gestion des analytics et métriques de templates
export class TemplateAnalyticsService {

  // === USAGE TRACKING ===

  // Enregistrer une action sur un template
  async trackUsage(
    templateId: string,
    actionType: TemplateUsageStats['action_type'],
    metadata: Record<string, any> = {},
    sessionId?: string,
    durationSeconds?: number
  ): Promise<void> {
    try {
      await supabase
        .from('template_usage_stats')
        .insert({
          template_id: templateId,
          action_type: actionType,
          session_id: sessionId,
          metadata,
          duration_seconds: durationSeconds
        });
    } catch (error) {
      console.error('Error tracking usage:', error);
      // Ne pas faire échouer l'opération principale pour un problème de tracking
    }
  }

  // Récupérer les statistiques d'usage d'un template
  async getUsageStats(
    templateId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalViews: number;
    totalEdits: number;
    totalGenerations: number;
    totalShares: number;
    uniqueUsers: number;
    averageEditDuration: number;
    usageByDay: Array<{ date: string; count: number; action_type: string }>;
  }> {
    let query = supabase
      .from('template_usage_stats')
      .select('*')
      .eq('template_id', templateId);

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching usage stats:', error);
      throw error;
    }

    const stats = data || [];

    // Calculer les métriques
    const totalViews = stats.filter(s => s.action_type === 'view').length;
    const totalEdits = stats.filter(s => s.action_type === 'edit').length;
    const totalGenerations = stats.filter(s => s.action_type === 'generate').length;
    const totalShares = stats.filter(s => s.action_type === 'share').length;
    
    const uniqueUsers = new Set(stats.map(s => s.user_id).filter(Boolean)).size;
    
    const editDurations = stats
      .filter(s => s.action_type === 'edit' && s.duration_seconds)
      .map(s => s.duration_seconds);
    const averageEditDuration = editDurations.length > 0 
      ? editDurations.reduce((a, b) => a + b, 0) / editDurations.length 
      : 0;

    // Grouper par jour
    const usageByDay = stats.reduce((acc, stat) => {
      const date = new Date(stat.created_at).toISOString().split('T')[0];
      const existing = acc.find(item => item.date === date && item.action_type === stat.action_type);
      
      if (existing) {
        existing.count++;
      } else {
        acc.push({ date, count: 1, action_type: stat.action_type });
      }
      
      return acc;
    }, [] as Array<{ date: string; count: number; action_type: string }>);

    return {
      totalViews,
      totalEdits,
      totalGenerations,
      totalShares,
      uniqueUsers,
      averageEditDuration,
      usageByDay
    };
  }

  // Récupérer les templates les plus utilisés de l'entreprise
  async getMostUsedTemplates(
    limit: number = 10,
    timeRange: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<Array<{
    template_id: string;
    template_name: string;
    usage_count: number;
    last_used: string;
  }>> {
    const startDate = new Date();
    switch (timeRange) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const { data, error } = await supabase
      .rpc('get_most_used_templates', {
        start_date: startDate.toISOString(),
        limit_count: limit
      });

    if (error) {
      console.error('Error fetching most used templates:', error);
      throw error;
    }

    return data || [];
  }

  // === PERFORMANCE METRICS ===

  // Enregistrer une métrique de performance
  async recordPerformanceMetric(
    templateId: string,
    metricType: TemplatePerformanceMetric['metric_type'],
    value: number,
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    try {
      await supabase
        .from('template_performance_metrics')
        .upsert({
          template_id: templateId,
          metric_type: metricType,
          metric_value: value,
          measurement_date: new Date().toISOString().split('T')[0],
          additional_data: additionalData
        }, {
          onConflict: 'template_id,metric_type,measurement_date'
        });
    } catch (error) {
      console.error('Error recording performance metric:', error);
    }
  }

  // Récupérer les métriques de performance
  async getPerformanceMetrics(
    templateId: string,
    metricType?: TemplatePerformanceMetric['metric_type'],
    days: number = 30
  ): Promise<TemplatePerformanceMetric[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabase
      .from('template_performance_metrics')
      .select('*')
      .eq('template_id', templateId)
      .gte('measurement_date', startDate.toISOString().split('T')[0])
      .order('measurement_date', { ascending: true });

    if (metricType) {
      query = query.eq('metric_type', metricType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching performance metrics:', error);
      throw error;
    }

    return data || [];
  }

  // Calculer le score de performance global d'un template
  async getTemplatePerformanceScore(templateId: string): Promise<{
    score: number; // 0-100
    breakdown: {
      usage: number;
      performance: number;
      reliability: number;
      userSatisfaction: number;
    };
  }> {
    const [usageStats, performanceMetrics] = await Promise.all([
      this.getUsageStats(templateId),
      this.getPerformanceMetrics(templateId)
    ]);

    // Score d'usage (0-25 points)
    const usageScore = Math.min(25, (usageStats.totalViews + usageStats.totalEdits) / 10);

    // Score de performance (0-25 points) - basé sur le temps de génération
    const generationTimes = performanceMetrics
      .filter(m => m.metric_type === 'generation_time')
      .map(m => m.metric_value);
    
    const avgGenerationTime = generationTimes.length > 0 
      ? generationTimes.reduce((a, b) => a + b, 0) / generationTimes.length 
      : 0;
    
    const performanceScore = avgGenerationTime > 0 
      ? Math.max(0, 25 - (avgGenerationTime / 1000)) // Pénalité pour temps > 1s
      : 0;

    // Score de fiabilité (0-25 points) - basé sur le taux d'erreur
    const errorRates = performanceMetrics
      .filter(m => m.metric_type === 'error_rate')
      .map(m => m.metric_value);
    
    const avgErrorRate = errorRates.length > 0 
      ? errorRates.reduce((a, b) => a + b, 0) / errorRates.length 
      : 0;
    
    const reliabilityScore = Math.max(0, 25 - (avgErrorRate * 25));

    // Score de satisfaction utilisateur (0-25 points) - basé sur la fréquence d'usage
    const usageFrequency = performanceMetrics
      .filter(m => m.metric_type === 'usage_frequency')
      .map(m => m.metric_value);
    
    const avgUsageFrequency = usageFrequency.length > 0 
      ? usageFrequency.reduce((a, b) => a + b, 0) / usageFrequency.length 
      : 0;
    
    const satisfactionScore = Math.min(25, avgUsageFrequency * 5);

    const totalScore = usageScore + performanceScore + reliabilityScore + satisfactionScore;

    return {
      score: Math.round(totalScore),
      breakdown: {
        usage: Math.round(usageScore),
        performance: Math.round(performanceScore),
        reliability: Math.round(reliabilityScore),
        userSatisfaction: Math.round(satisfactionScore)
      }
    };
  }

  // === DASHBOARD ANALYTICS ===

  // Récupérer les analytics pour le dashboard de l'entreprise
  async getCompanyAnalytics(): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    totalUsage: number;
    averagePerformanceScore: number;
    topTemplates: Array<{ id: string; name: string; usage_count: number }>;
    usageTrends: Array<{ date: string; views: number; edits: number; generations: number }>;
  }> {
    // Récupérer les templates de l'entreprise
    const { data: templates, error: templatesError } = await supabase
      .from('custom_pdf_templates')
      .select('id, name, is_active')
      .eq('is_active', true);

    if (templatesError) {
      console.error('Error fetching company templates:', templatesError);
      throw templatesError;
    }

    const templateIds = templates?.map(t => t.id) || [];

    if (templateIds.length === 0) {
      return {
        totalTemplates: 0,
        activeTemplates: 0,
        totalUsage: 0,
        averagePerformanceScore: 0,
        topTemplates: [],
        usageTrends: []
      };
    }

    // Récupérer les statistiques d'usage pour tous les templates
    const { data: usageStats, error: usageError } = await supabase
      .from('template_usage_stats')
      .select('*')
      .in('template_id', templateIds)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (usageError) {
      console.error('Error fetching usage stats:', usageError);
      throw usageError;
    }

    // Calculer les métriques
    const totalTemplates = templates?.length || 0;
    const activeTemplates = templates?.filter(t => t.is_active).length || 0;
    const totalUsage = usageStats?.length || 0;

    // Top templates par usage
    const templateUsage = templateIds.map(id => {
      const template = templates?.find(t => t.id === id);
      const usage = usageStats?.filter(s => s.template_id === id).length || 0;
      return {
        id,
        name: template?.name || 'Unknown',
        usage_count: usage
      };
    }).sort((a, b) => b.usage_count - a.usage_count).slice(0, 5);

    // Tendances d'usage (30 derniers jours)
    const usageTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayStats = usageStats?.filter(s => 
        s.created_at.startsWith(dateStr)
      ) || [];

      usageTrends.push({
        date: dateStr,
        views: dayStats.filter(s => s.action_type === 'view').length,
        edits: dayStats.filter(s => s.action_type === 'edit').length,
        generations: dayStats.filter(s => s.action_type === 'generate').length
      });
    }

    // Score de performance moyen (simulation)
    const averagePerformanceScore = templateIds.length > 0 ? 75 : 0; // À calculer réellement

    return {
      totalTemplates,
      activeTemplates,
      totalUsage,
      averagePerformanceScore,
      topTemplates: templateUsage,
      usageTrends
    };
  }

  // === HEATMAP DATA ===

  // Générer des données de heatmap pour un template
  async getTemplateHeatmapData(templateId: string): Promise<Array<{
    fieldId: string;
    interactions: number;
    lastInteraction: string;
    interactionTypes: Record<string, number>;
  }>> {
    const { data, error } = await supabase
      .from('template_usage_stats')
      .select('metadata, created_at')
      .eq('template_id', templateId)
      .not('metadata', 'is', null);

    if (error) {
      console.error('Error fetching heatmap data:', error);
      throw error;
    }

    const fieldInteractions: Record<string, {
      count: number;
      lastInteraction: string;
      types: Record<string, number>;
    }> = {};

    data?.forEach(stat => {
      const fieldId = stat.metadata?.field_id;
      const interactionType = stat.metadata?.interaction_type || 'unknown';
      
      if (fieldId) {
        if (!fieldInteractions[fieldId]) {
          fieldInteractions[fieldId] = {
            count: 0,
            lastInteraction: stat.created_at,
            types: {}
          };
        }
        
        fieldInteractions[fieldId].count++;
        fieldInteractions[fieldId].types[interactionType] = 
          (fieldInteractions[fieldId].types[interactionType] || 0) + 1;
        
        if (new Date(stat.created_at) > new Date(fieldInteractions[fieldId].lastInteraction)) {
          fieldInteractions[fieldId].lastInteraction = stat.created_at;
        }
      }
    });

    return Object.entries(fieldInteractions).map(([fieldId, data]) => ({
      fieldId,
      interactions: data.count,
      lastInteraction: data.lastInteraction,
      interactionTypes: data.types
    }));
  }
}

// Instance singleton
export const templateAnalyticsService = new TemplateAnalyticsService();

// Export des fonctions individuelles
export const trackUsage = templateAnalyticsService.trackUsage.bind(templateAnalyticsService);
export const getUsageStats = templateAnalyticsService.getUsageStats.bind(templateAnalyticsService);
export const getMostUsedTemplates = templateAnalyticsService.getMostUsedTemplates.bind(templateAnalyticsService);
export const recordPerformanceMetric = templateAnalyticsService.recordPerformanceMetric.bind(templateAnalyticsService);
export const getPerformanceMetrics = templateAnalyticsService.getPerformanceMetrics.bind(templateAnalyticsService);
export const getTemplatePerformanceScore = templateAnalyticsService.getTemplatePerformanceScore.bind(templateAnalyticsService);
export const getCompanyAnalytics = templateAnalyticsService.getCompanyAnalytics.bind(templateAnalyticsService);
export const getTemplateHeatmapData = templateAnalyticsService.getTemplateHeatmapData.bind(templateAnalyticsService);

export default templateAnalyticsService;