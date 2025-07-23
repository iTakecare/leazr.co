
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
  detectionMethod: 'subdomain' | 'param' | 'default';
}

/**
 * Hook pour détecter automatiquement l'entreprise basée sur le sous-domaine ou les paramètres
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

        // Vérifier si on est sur une route système qui ne nécessite pas de détection de company
        const pathname = window.location.pathname;
        const systemRoutes = ['/ambassador', '/admin', '/dashboard', '/login', '/register'];
        const isSystemRoute = systemRoutes.some(route => pathname.startsWith(route));
        
        if (isSystemRoute) {
          console.log('🔍 Route système détectée, pas de détection de company nécessaire:', pathname);
          setLoading(false);
          return;
        }

        // Obtenir l'origine de la requête actuelle
        const origin = window.location.origin;
        const hostname = window.location.hostname;

        console.log('🔍 Détection de sous-domaine:', { origin, hostname });

        // Extraire le sous-domaine depuis l'hostname
        let subdomain: string | null = null;
        const parts = hostname.split('.');
        
        // Vérifier si c'est un sous-domaine (pas www ou domaine principal)
        if (parts.length > 2 && parts[0] !== 'www' && hostname !== 'leazr.co') {
          subdomain = parts[0];
        }

        // Ignorer les sous-domaines de développement/preview
        const developmentPatterns = ['id-preview', 'preview', 'localhost', 'lovableproject', 'lovable'];
        const isDevelopmentSubdomain = subdomain && developmentPatterns.some(pattern => 
          subdomain.includes(pattern) || hostname.includes(pattern)
        );

        if (isDevelopmentSubdomain) {
          console.log('🔍 Sous-domaine de développement détecté, pas de détection de company nécessaire:', subdomain);
          setLoading(false);
          return;
        }

        // Récupérer le paramètre company depuis l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const companyParam = urlParams.get('company') || getCompanyParamFromPath();

        console.log('🔍 Paramètres détectés:', { subdomain, companyParam });

        // Appeler l'edge function pour détecter l'entreprise
        const { data, error } = await supabase.functions.invoke('detect-company', {
          body: {
            origin,
            companyParam: companyParam || subdomain
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
          if (data.company && (data.detectionMethod === 'subdomain' || data.detectionMethod === 'param')) {
            applyCompanyTheme(data.company);
          }

          console.log('✅ Entreprise détectée:', {
            name: data.company?.name,
            method: data.detectionMethod
          });
        } else {
          console.log('ℹ️ Aucune entreprise détectée, utilisation des paramètres par défaut');
        }

      } catch (err) {
        console.error('❌ Erreur lors de la détection d\'entreprise:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    detectCompany();
  }, []);

  const getCompanyParamFromPath = (): string | undefined => {
    const pathSegments = window.location.pathname.split('/');
    
    // Chercher dans l'URL des patterns comme /public/:companyId
    if (pathSegments[1] === 'public' && pathSegments[2]) {
      return pathSegments[2];
    }
    
    return undefined;
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
      // Pour le moment, retourner tel quel - à améliorer
      return color;
    }
    return color;
  };

  return {
    detection,
    loading,
    error,
    isSubdomainDetected: detection.detectionMethod === 'subdomain',
    isCompanyDetected: detection.detectionMethod !== 'default',
    refetch: () => window.location.reload()
  };
};
