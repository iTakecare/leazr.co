
/**
 * Nettoie le cache local pour éviter les données persistantes
 */
export const clearAppCache = () => {
  try {
    // Nettoyer localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('cart') ||
        key.includes('product') ||
        key.includes('catalog') ||
        key.includes('company') ||
        key.includes('supabase')
      )) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      console.log('🧹 Nettoyage localStorage:', key);
      localStorage.removeItem(key);
    });

    // Nettoyer sessionStorage
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.includes('cart') ||
        key.includes('product') ||
        key.includes('catalog') ||
        key.includes('company')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      console.log('🧹 Nettoyage sessionStorage:', key);
      sessionStorage.removeItem(key);
    });

    console.log('✅ Cache nettoyé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage du cache:', error);
  }
};

// Auto-nettoyage au démarrage de l'app
if (typeof window !== 'undefined') {
  clearAppCache();
}
