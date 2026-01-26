import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface DashboardLayout {
  visible_cards?: string[];
  card_order?: string[];
}

export interface UserPreferences {
  id?: string;
  user_id?: string;
  default_dashboard: 'financial' | 'commercial';
  dashboard_layout: {
    financial?: DashboardLayout;
    commercial?: DashboardLayout;
  };
  sidebar_collapsed: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  default_dashboard: 'financial',
  dashboard_layout: {
    commercial: {
      visible_cards: ['stats', 'recent_activity', 'pending_tasks', 'recent_notes'],
      card_order: ['stats', 'recent_activity', 'pending_tasks', 'recent_notes']
    }
  },
  sidebar_collapsed: true
};

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences(DEFAULT_PREFERENCES);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching preferences:', fetchError);
        setError(fetchError.message);
        setPreferences(DEFAULT_PREFERENCES);
      } else if (data) {
        setPreferences({
          ...data,
          dashboard_layout: data.dashboard_layout as UserPreferences['dashboard_layout'] || DEFAULT_PREFERENCES.dashboard_layout
        });
      } else {
        // No preferences found, create default ones
        const { data: newPrefs, error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            ...DEFAULT_PREFERENCES
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating preferences:', insertError);
          setPreferences(DEFAULT_PREFERENCES);
        } else {
          setPreferences({
            ...newPrefs,
            dashboard_layout: newPrefs.dashboard_layout as UserPreferences['dashboard_layout'] || DEFAULT_PREFERENCES.dashboard_layout
          });
        }
      }
    } catch (err) {
      console.error('Error in fetchPreferences:', err);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user?.id) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating preferences:', updateError);
        return false;
      }

      setPreferences(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error in updatePreferences:', err);
      return false;
    }
  }, [user?.id]);

  const updateDashboardLayout = useCallback(async (
    dashboard: 'financial' | 'commercial',
    layout: DashboardLayout
  ) => {
    if (!preferences) return false;

    const newLayout = {
      ...preferences.dashboard_layout,
      [dashboard]: layout
    };

    return updatePreferences({ dashboard_layout: newLayout });
  }, [preferences, updatePreferences]);

  const updateSidebarCollapsed = useCallback(async (collapsed: boolean) => {
    return updatePreferences({ sidebar_collapsed: collapsed });
  }, [updatePreferences]);

  const updateDefaultDashboard = useCallback(async (dashboard: 'financial' | 'commercial') => {
    return updatePreferences({ default_dashboard: dashboard });
  }, [updatePreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    updateDashboardLayout,
    updateSidebarCollapsed,
    updateDefaultDashboard,
    refetch: fetchPreferences
  };
};
