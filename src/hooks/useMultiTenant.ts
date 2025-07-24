
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentUserCompanyId, hasCompanyAccess, multiTenantServices } from '@/services/multiTenantService';

/**
 * Hook pour faciliter l'utilisation de l'architecture multi-tenant
 */
export const useMultiTenant = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Éviter les re-exécutions inutiles
    if (fetchingRef.current || lastUserIdRef.current === user?.id) {
      return;
    }
    
    lastUserIdRef.current = user?.id || null;
    
    const fetchCompanyId = async () => {
      if (fetchingRef.current) return;
      
      fetchingRef.current = true;
      
      if (!user) {
        setCompanyId(null);
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      try {
        const id = await getCurrentUserCompanyId();
        setCompanyId(id);
      } catch (error) {
        console.error('🏢 MULTI TENANT - Erreur:', error);
        setCompanyId(null);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    };

    fetchCompanyId();
  }, [user?.id]); // Utiliser seulement user.id comme dépendance

  // Mémoriser les valeurs de retour pour éviter les re-rendus
  const returnValue = useMemo(() => ({
    companyId,
    loading,
    hasAccess: hasCompanyAccess,
    services: multiTenantServices,
    getCurrentCompanyId: getCurrentUserCompanyId
  }), [companyId, loading]);

  return returnValue;
};

/**
 * Hook spécialisé pour les services multi-tenant par entité
 */
export const useMultiTenantEntity = (entityType: keyof typeof multiTenantServices) => {
  const { services, companyId, loading } = useMultiTenant();
  
  return {
    companyId,
    loading,
    service: services[entityType],
    create: services[entityType].create,
    query: services[entityType].query
  };
};
