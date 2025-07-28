import { useState, useEffect } from 'react';
import { getPlatformSettings, PlatformSettings } from '@/services/platformSettingsService';

export const usePlatformSettings = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getPlatformSettings();
        setSettings(data);
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres de plateforme:", err);
        setError("Impossible de charger les paramètres de plateforme");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { settings, loading, error };
};