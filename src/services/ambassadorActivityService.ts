import { supabase } from "@/integrations/supabase/client";

export interface AmbassadorActivityLog {
  id: string;
  ambassador_id: string;
  user_id?: string;
  action_type: string;
  description: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export const ActivityTypes = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  PROFILE_UPDATE: 'profile_update',
  OFFER_CREATED: 'offer_created',
  OFFER_UPDATED: 'offer_updated',
  CLIENT_ADDED: 'client_added',
  CLIENT_UPDATED: 'client_updated',
  COMMISSION_LEVEL_CHANGED: 'commission_level_changed',
  ACCOUNT_CREATED: 'account_created',
  PASSWORD_CHANGED: 'password_changed',
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

class AmbassadorActivityService {
  async logActivity(
    ambassadorId: string,
    actionType: ActivityType,
    description: string,
    metadata: Record<string, any> = {}
  ) {
    try {
      const { data, error } = await supabase.rpc('log_ambassador_activity', {
        p_ambassador_id: ambassadorId,
        p_action_type: actionType,
        p_description: description,
        p_metadata: metadata,
      });

      if (error) {
        console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de l\'activité:', error);
      return null;
    }
  }

  async getAmbassadorActivities(
    ambassadorId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AmbassadorActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('ambassador_activity_logs')
        .select('*')
        .eq('ambassador_id', ambassadorId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erreur lors de la récupération des activités:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des activités:', error);
      return [];
    }
  }

  async getActivityStats(ambassadorId: string) {
    try {
      const { data, error } = await supabase
        .from('ambassador_activity_logs')
        .select('action_type, created_at')
        .eq('ambassador_id', ambassadorId);

      if (error || !data) {
        return { totalActivities: 0, lastActivity: null, activityTypes: {} };
      }

      const activityTypes = data.reduce((acc: Record<string, number>, log) => {
        acc[log.action_type] = (acc[log.action_type] || 0) + 1;
        return acc;
      }, {});

      const lastActivity = data.length > 0 ? data[0].created_at : null;

      return {
        totalActivities: data.length,
        lastActivity,
        activityTypes,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return { totalActivities: 0, lastActivity: null, activityTypes: {} };
    }
  }
}

export const ambassadorActivityService = new AmbassadorActivityService();