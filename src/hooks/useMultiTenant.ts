
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
    console.log("🏢 MULTI TENANT - useEffect déclenché, user:", user?.id);
    
    const fetchCompanyId = async () => {
      if (!user) {
        console.log("🏢 MULTI TENANT - Pas d'utilisateur, setCompanyId(null)");
        setCompanyId(null);
        setLoading(false);
        return;
      }

      try {
        console.log("🏢 MULTI TENANT - Appel getCurrentUserCompanyId");
        const id = await getCurrentUserCompanyId();
        console.log("🏢 MULTI TENANT - CompanyId reçu:", id);
        setCompanyId(id);
      } catch (error) {
        console.error('🏢 MULTI TENANT - Erreur lors de la récupération du company ID:', error);
        setCompanyId(null);
      } finally {
        console.log("🏢 MULTI TENANT - Fin fetchCompanyId, setLoading(false)");
        setLoading(false);
      }
    };

    fetchCompanyId();
  }, [user]);

  console.log("🏢 MULTI TENANT - Rendu hook, companyId:", companyId, "loading:", loading);

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
