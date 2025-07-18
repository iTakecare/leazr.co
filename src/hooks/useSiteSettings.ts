
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSiteSettings, SiteSettings } from '@/services/settingsService';

// Cache global simple pour éviter les appels répétés
let settingsCache: {
  data: SiteSettings | null;
  timestamp: number;
  loading: boolean;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    // Vérifier le cache en premier
    const now = Date.now();
    if (settingsCache && 
        settingsCache.timestamp + CACHE_DURATION > now && 
        !settingsCache.loading) {
      setSettings(settingsCache.data);
      setLoading(false);
      return;
    }

    // Si déjà en cours de chargement, attendre
    if (settingsCache?.loading) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Marquer comme en cours de chargement
      settingsCache = { data: null, timestamp: now, loading: true };
      
      const data = await getSiteSettings();
      
      // Mettre à jour le cache
      settingsCache = { data, timestamp: now, loading: false };
      
      setSettings(data);
    } catch (err) {
      console.error("Erreur lors du chargement des paramètres:", err);
      setError("Impossible de charger les paramètres");
      
      // Réinitialiser le cache en cas d'erreur
      settingsCache = null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Mémoriser les valeurs de retour pour éviter les re-renders
  const memoizedReturn = useMemo(() => ({
    settings,
    loading,
    error
  }), [settings, loading, error]);

  return memoizedReturn;
};

// Fonction pour invalider le cache manuellement si nécessaire
export const invalidateSettingsCache = () => {
  settingsCache = null;
};
