
import { useState, useEffect } from 'react';
import { getSiteSettings, SiteSettings } from '@/services/settingsService';

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getSiteSettings();
        setSettings(data);
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres:", err);
        setError("Impossible de charger les paramètres");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  return { settings, loading, error };
};
