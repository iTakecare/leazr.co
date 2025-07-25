import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PlatformSettings {
  id?: string;
  company_name: string;
  company_description?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  website_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
}

// Cache simple pour éviter les requêtes répétées
let platformSettingsCache: PlatformSettings | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      // Vérifier le cache
      const now = Date.now();
      if (platformSettingsCache && (now - lastFetchTime) < CACHE_DURATION) {
        setSettings(platformSettingsCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .single();

      if (error) {
        console.error('Erreur lors du chargement des paramètres de la plateforme:', error);
        setError(error.message);
      } else if (data) {
        platformSettingsCache = data;
        lastFetchTime = now;
        setSettings(data);
        setError(null);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des paramètres de la plateforme:', err);
      setError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<PlatformSettings>) => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .update(updates)
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la mise à jour des paramètres:', error);
        toast({
          title: "Erreur",
          description: "Impossible de sauvegarder les paramètres",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        platformSettingsCache = data;
        lastFetchTime = Date.now();
        setSettings(data);
        toast({
          title: "Succès",
          description: "Paramètres sauvegardés avec succès",
        });
        return true;
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
      return false;
    }
    return false;
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings: loadSettings
  };
};

// Fonction pour invalider le cache
export const invalidatePlatformSettingsCache = () => {
  platformSettingsCache = null;
  lastFetchTime = 0;
};