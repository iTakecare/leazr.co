/**
 * Utilitaires pour forcer l'invalidation des caches CRM 
 * afin de s'assurer de l'isolation par entreprise
 */

import { toast } from "sonner";

/**
 * Force l'invalidation complète des caches CRM pour l'isolation par entreprise
 */
export const forceRefreshCRMCache = () => {
  console.log("🔄 Forçage du rafraîchissement du cache CRM pour l'isolation par entreprise");
  
  // Invalider le localStorage si utilisé
  if (typeof window !== 'undefined') {
    // Supprimer les caches potentiels du localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('client') || 
      key.includes('ambassador') || 
      key.includes('partner') || 
      key.includes('offer') ||
      key.includes('contract')
    );
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Cache supprimé: ${key}`);
    });
  }
  
  // TEMPORAIREMENT DÉSACTIVÉ - Éviter la boucle infinie de rafraîchissement
  // setTimeout(() => {
  //   window.location.reload();
  // }, 100);
  
  toast.success("Cache CRM actualisé pour l'isolation par entreprise");
};

/**
 * Vérifie si l'utilisateur voit des données d'une autre entreprise
 */
export const checkDataIsolation = (companyId: string, dataItems: any[], dataType: string) => {
  const crossCompanyItems = dataItems.filter(item => 
    item.company_id && item.company_id !== companyId
  );
  
  if (crossCompanyItems.length > 0) {
    console.error(`❌ ISOLATION VIOLATION: ${crossCompanyItems.length} ${dataType} d'autres entreprises détectés`, {
      userCompanyId: companyId,
      violatingItems: crossCompanyItems.map(item => ({
        id: item.id,
        name: item.name,
        company_id: item.company_id
      }))
    });
    
    toast.error(`Problème d'isolation détecté pour ${dataType}. Cache en cours d'actualisation...`);
    forceRefreshCRMCache();
    return false;
  }
  
  console.log(`✅ Isolation confirmée pour ${dataItems.length} ${dataType}`);
  return true;
};