
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from 'react-router-dom';
import { getCurrentUserCompanyId, hasCompanyAccess, multiTenantServices } from '@/services/multiTenantService';
import { isSystemRoute } from '@/utils/routeDetection';

/**
 * Hook pour faciliter l'utilisation de l'architecture multi-tenant
 */
export const useMultiTenant = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  
  // Don't execute on system routes
  const shouldExecute = !isSystemRoute(location.pathname);

  useEffect(() => {
    // Don't execute on system routes like homepage
    if (!shouldExecute) {
      setLoading(false);
      return;
    }
    
    // Avoid unnecessary re-executions
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
  }, [user?.id, shouldExecute]);

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
