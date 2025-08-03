
export const clearAppCache = () => {
  try {
    console.log('🧹 Nettoyage du cache de l\'application...');
    
    // Clear localStorage
    if (typeof localStorage !== 'undefined') {
      const keysToKeep = ['supabase.auth.token', 'vite-ui-theme'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
          localStorage.removeItem(key);
        }
      });
      
      console.log('✅ localStorage nettoyé');
    }

    // Clear sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
      console.log('✅ sessionStorage nettoyé');
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
