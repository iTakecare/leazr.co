import { useNavigate } from 'react-router-dom';
import { useRef, useCallback } from 'react';

interface NavigationHistory {
  url: string;
  timestamp: number;
}

const NAVIGATION_THRESHOLD = 10; // Max navigations per 5 seconds
const TIME_WINDOW = 5000; // 5 seconds

/**
 * Hook sécurisé pour la navigation qui prévient les boucles infinies dans Safari
 */
export const useSafeNavigate = () => {
  const navigate = useNavigate();
  const navigationHistory = useRef<NavigationHistory[]>([]);
  
  const safeNavigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const now = Date.now();
    
    // Nettoyer l'historique des anciennes entrées
    navigationHistory.current = navigationHistory.current.filter(
      nav => now - nav.timestamp < TIME_WINDOW
    );
    
    // Vérifier si on dépasse le seuil
    const recentNavigations = navigationHistory.current.filter(
      nav => now - nav.timestamp < TIME_WINDOW
    );
    
    if (recentNavigations.length >= NAVIGATION_THRESHOLD) {
      console.warn('🛡️ SAFE NAVIGATE - Navigation throttled to prevent infinite loop');
      return;
    }
    
    // Vérifier si c'est la même URL que la dernière navigation
    const lastNavigation = navigationHistory.current[navigationHistory.current.length - 1];
    if (lastNavigation && lastNavigation.url === to && (now - lastNavigation.timestamp) < 1000) {
      console.warn('🛡️ SAFE NAVIGATE - Duplicate navigation prevented:', to);
      return;
    }
    
    // Ajouter à l'historique
    navigationHistory.current.push({ url: to, timestamp: now });
    
    console.log('🛡️ SAFE NAVIGATE - Navigating to:', to);
    navigate(to, options);
  }, [navigate]);
  
  return safeNavigate;
};