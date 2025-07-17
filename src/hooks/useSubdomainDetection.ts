import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyInfo {
  id: string;
  name: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
}

interface DetectionResult {
  companyId: string | null;
  company: CompanyInfo | null;
  detectionMethod: 'subdomain' | 'default' | 'provided';
}

/**
 * Hook pour détecter automatiquement l'entreprise basée sur le sous-domaine
 */
export const useSubdomainDetection = () => {
  const [detection, setDetection] = useState<DetectionResult>({
    companyId: null,
    company: null,
    detectionMethod: 'default'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const detectCompany = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtenir l'origine de la requête actuelle
        const origin = window.location.origin;
        const hostname = window.location.hostname;

        console.log('🔍 Détection de sous-domaine:', { origin, hostname });

        // Appeler l'edge function pour détecter l'entreprise
        const { data, error } = await supabase.functions.invoke('detect-company', {
          body: {
            origin,
            companyParam: getCompanyParamFromUrl()
          }
        });

        if (error) {
          throw error;
        }

        if (data.success) {
          setDetection({
            companyId: data.companyId,
            company: data.company,
            detectionMethod: data.detectionMethod
          });

          // Appliquer les couleurs de l'entreprise si détectées
          if (data.company && data.detectionMethod === 'subdomain') {
            applyCompanyTheme(data.company);
          }
        } else {
          setError('Impossible de détecter l\'entreprise');
        }

      } catch (err) {
        console.error('Erreur lors de la détection d\'entreprise:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    detectCompany();
  }, []);

  const getCompanyParamFromUrl = (): string | undefined => {
    const pathSegments = window.location.pathname.split('/');
    
    // Chercher dans l'URL des patterns comme /public/:companyId
    if (pathSegments[1] === 'public' && pathSegments[2]) {
      return pathSegments[2];
    }
    
    // Chercher dans les paramètres de requête
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('company') || undefined;
  };

  const applyCompanyTheme = (company: CompanyInfo) => {
    const root = document.documentElement;
    
    if (company.primary_color) {
      root.style.setProperty('--primary', convertToHsl(company.primary_color));
    }
    if (company.secondary_color) {
      root.style.setProperty('--secondary', convertToHsl(company.secondary_color));
    }
    if (company.accent_color) {
      root.style.setProperty('--accent', convertToHsl(company.accent_color));
    }
  };

  const convertToHsl = (color: string): string => {
    // Conversion simple - en production, vous pourriez utiliser une bibliothèque
    // pour une conversion plus robuste entre formats de couleur
    if (color.startsWith('#')) {
      // Conversion hex vers HSL approximative
      return color; // Pour le moment, retourner tel quel
    }
    return color;
  };

  return {
    detection,
    loading,
    error,
    isSubdomainDetected: detection.detectionMethod === 'subdomain',
    refetch: () => window.location.reload()
  };
};