import { useNavigate } from "react-router";
import { useRef, useCallback } from 'react';

interface NavigationHistory {
  url: string;
  timestamp: number;
}

const NAVIGATION_THRESHOLD = 5; // Reduced threshold for Safari
const TIME_WINDOW = 10000; // Increased window to 10 seconds

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
      console.warn('🛡️ SAFE NAVIGATE - Navigation throttled to prevent Safari infinite loop');
      // Force a longer delay on Safari to break the loop
      setTimeout(() => {
        navigate(to, options);
      }, 2000);
      return;
    }
    
    // Check for duplicate navigation with stricter timing
    const lastNavigation = navigationHistory.current[navigationHistory.current.length - 1];
    if (lastNavigation && lastNavigation.url === to && (now - lastNavigation.timestamp) < 2000) {
      console.warn('🛡️ SAFE NAVIGATE - Duplicate navigation prevented:', to);
      return;
    }
    
    // Ajouter à l'historique
    navigationHistory.current.push({ url: to, timestamp: now });
    
    // Reduced logging for homepage
    if (to !== '/') {
      console.log('🛡️ SAFE NAVIGATE - Navigating to:', to);
    }
    navigate(to, options);
  }, [navigate]);
  
  return safeNavigate;
};