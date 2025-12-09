
export const clearAppCache = () => {
  try {
    console.log('🧹 Nettoyage du cache de l\'application...');
    
    // Patterns à préserver (tokens d'auth Supabase)
    const keysToKeep = ['sb-', 'supabase', 'vite-ui-theme', 'auth'];
    
    // Clear localStorage sélectivement
    if (typeof localStorage !== 'undefined') {
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        // Garder si la clé contient un des patterns à préserver
        const shouldKeep = keysToKeep.some(keepKey => key.includes(keepKey));
        if (!shouldKeep) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ localStorage nettoyé (tokens préservés)');
    }

    // Clear sessionStorage sélectivement (ne plus tout effacer)
    if (typeof sessionStorage !== 'undefined') {
      const allKeys = Object.keys(sessionStorage);
      
      allKeys.forEach(key => {
        const shouldKeep = keysToKeep.some(keepKey => key.includes(keepKey));
        if (!shouldKeep) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('✅ sessionStorage nettoyé (tokens préservés)');
    }

    // Clear any cached modules in development
    if (import.meta.hot) {
      import.meta.hot.invalidate();
      console.log('✅ Module cache invalidé');
    }

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage du cache:', error);
  }
};
