import { supabase } from "@/integrations/supabase/client";
import type { FleetTemplate, BusinessProfile } from "@/types/fleetGenerator";

export class FleetTemplateService {
  
  // Récupérer tous les templates actifs
  static async getActiveTemplates(): Promise<FleetTemplate[]> {
    const { data, error } = await supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }
  
  // Récupérer les templates par profil métier
  static async getTemplatesByProfile(profileId: string): Promise<FleetTemplate[]> {
    const { data, error } = await supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .eq('business_profile_id', profileId)
      .eq('is_active', true)
      .order('estimated_budget');
    
    if (error) throw error;
    return data || [];
  }
  
  // Récupérer les templates adaptés à une taille d'équipe
  static async getTemplatesForTeamSize(teamSize: number): Promise<FleetTemplate[]> {
    const { data, error } = await supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .lte('team_size_min', teamSize)
      .gte('team_size_max', teamSize)
      .eq('is_active', true)
      .order('estimated_budget');
    
    if (error) throw error;
    return data || [];
  }
  
  // Récupérer les templates dans une fourchette de budget
  static async getTemplatesInBudgetRange(minBudget: number, maxBudget: number): Promise<FleetTemplate[]> {
    const { data, error } = await supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .gte('estimated_budget', minBudget)
      .lte('estimated_budget', maxBudget)
      .eq('is_active', true)
      .order('estimated_budget');
    
    if (error) throw error;
    return data || [];
  }
  
  // Rechercher des templates avec des critères multiples
  static async searchTemplates(criteria: {
    sector?: string;
    teamSizeMin?: number;
    teamSizeMax?: number;
    budgetMax?: number;
    searchText?: string;
  }): Promise<FleetTemplate[]> {
    let query = supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .eq('is_active', true);
    
    // Filtres par secteur via le profil métier
    if (criteria.sector) {
      const { data: profiles } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('sector', criteria.sector);
      
      if (profiles && profiles.length > 0) {
        const profileIds = profiles.map(p => p.id);
        query = query.in('business_profile_id', profileIds);
      }
    }
    
    // Filtre par taille d'équipe
    if (criteria.teamSizeMin) {
      query = query.gte('team_size_max', criteria.teamSizeMin);
    }
    if (criteria.teamSizeMax) {
      query = query.lte('team_size_min', criteria.teamSizeMax);
    }
    
    // Filtre par budget maximum
    if (criteria.budgetMax) {
      query = query.lte('estimated_budget', criteria.budgetMax);
    }
    
    // Recherche textuelle
    if (criteria.searchText) {
      query = query.or(`name.ilike.%${criteria.searchText}%,description.ilike.%${criteria.searchText}%`);
    }
    
    const { data, error } = await query.order('estimated_budget');
    
    if (error) throw error;
    return data || [];
  }
  
  // Récupérer un template spécifique
  static async getTemplate(id: string): Promise<FleetTemplate | null> {
    const { data, error } = await supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }
  
  // Récupérer tous les profils métier
  static async getBusinessProfiles(): Promise<BusinessProfile[]> {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }
  
  // Récupérer un profil métier spécifique
  static async getBusinessProfile(id: string): Promise<BusinessProfile | null> {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return data;
  }
  
  // Récupérer les profils métier par secteur
  static async getBusinessProfilesBySector(sector: string): Promise<BusinessProfile[]> {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('sector', sector)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }
  
  // Récupérer les templates les plus populaires (basé sur l'utilisation)
  static async getPopularTemplates(limit: number = 5): Promise<FleetTemplate[]> {
    // Récupérer les templates les plus utilisés
    const { data: usageStats } = await supabase
      .from('fleet_configurations')
      .select('template_id')
      .not('template_id', 'is', null);
    
    if (!usageStats) return this.getActiveTemplates();
    
    // Compter les utilisations par template
    const usageCounts = usageStats.reduce((acc, config) => {
      if (config.template_id) {
        acc[config.template_id] = (acc[config.template_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    // Récupérer les templates les plus utilisés
    const popularTemplateIds = Object.entries(usageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);
    
    if (popularTemplateIds.length === 0) {
      return this.getActiveTemplates();
    }
    
    const { data, error } = await supabase
      .from('fleet_templates')
      .select(`
        *,
        business_profile:business_profiles(*)
      `)
      .in('id', popularTemplateIds)
      .eq('is_active', true);
    
    if (error) throw error;
    
    // Réorganiser selon l'ordre de popularité
    const orderedTemplates = popularTemplateIds
      .map(id => data?.find(t => t.id === id))
      .filter(Boolean) as FleetTemplate[];
    
    return orderedTemplates;
  }
  
  // Obtenir des recommandations de templates basées sur les critères
  static async getRecommendedTemplates(criteria: {
    business_sector: string;
    team_size: number;
    budget?: number;
  }): Promise<FleetTemplate[]> {
    const templates = await this.getActiveTemplates();
    
    // Scoring des templates
    const scoredTemplates = templates.map(template => {
      let score = 0;
      
      // Score basé sur le secteur d'activité
      if (template.business_profile?.sector === criteria.business_sector) {
        score += 40;
      }
      
      // Score basé sur la taille d'équipe
      const isInRange = criteria.team_size >= template.team_size_min && 
                       criteria.team_size <= template.team_size_max;
      if (isInRange) {
        score += 30;
        // Bonus si proche du centre de la fourchette
        const centerDistance = Math.abs(
          (template.team_size_min + template.team_size_max) / 2 - criteria.team_size
        );
        score += Math.max(0, 15 - centerDistance);
      }
      
      // Score basé sur le budget
      if (criteria.budget && template.estimated_budget) {
        if (template.estimated_budget <= criteria.budget) {
          score += 20;
          // Bonus si utilise bien le budget (80-100% du budget)
          const budgetUsage = template.estimated_budget / criteria.budget;
          if (budgetUsage >= 0.8) {
            score += 10;
          }
        } else {
          // Pénalité si dépasse le budget
          const overbudget = (template.estimated_budget - criteria.budget) / criteria.budget;
          score -= Math.min(20, overbudget * 50);
        }
      }
      
      return { template, score };
    });
    
    // Retourner les templates triés par score (meilleurs en premier)
    return scoredTemplates
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6) // Top 6 recommandations
      .map(item => item.template);
  }
}