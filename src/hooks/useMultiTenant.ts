import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCurrentUserCompanyId, hasCompanyAccess, multiTenantServices } from '@/services/multiTenantService';

/**
 * Hook pour faciliter l'utilisation de l'architecture multi-tenant
 */
export const useMultiTenant = () => {
  const { user } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user) {
        setCompanyId(null);
        setLoading(false);
        return;
      }

      try {
        const id = await getCurrentUserCompanyId();
        setCompanyId(id);
      } catch (error) {
        console.error('Error fetching company ID:', error);
        setCompanyId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyId();
  }, [user]);

  return {
    companyId,
    loading,
    hasAccess: hasCompanyAccess,
    services: multiTenantServices,
    getCurrentCompanyId: getCurrentUserCompanyId
  };
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