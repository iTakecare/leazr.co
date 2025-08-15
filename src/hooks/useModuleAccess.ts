import { useAuth } from "@/context/AuthContext";
import { useCompanyContext } from "@/context/CompanyContext";
import { useMemo } from "react";

// Safe wrapper to use CompanyContext that doesn't throw when provider is missing
const useSafeCompanyContext = () => {
  try {
    return useCompanyContext();
  } catch (error) {
    // Return null when CompanyProvider is not available (e.g., in SaaS admin routes)
    return { company: null, companyId: null, companySlug: null };
  }
};

export interface ModuleAccessConfig {
  dashboard: boolean;
  crm: boolean;
  contracts: boolean;
  offers: boolean;
  invoicing: boolean;
  catalog: boolean;
  chat: boolean;
  equipment: boolean;
  settings: boolean;
  public_catalog: boolean;
  calculator: boolean;
  ai_assistant: boolean;
  fleet_generator: boolean;
  support: boolean;
}

export const useModuleAccess = () => {
  const { user } = useAuth();
  const { company } = useSafeCompanyContext();

  const moduleAccess = useMemo((): ModuleAccessConfig => {
    // If no user, deny access to everything
    if (!user) {
      return {
        dashboard: false,
        crm: false,
        contracts: false,
        offers: false,
        invoicing: false,
        catalog: false,
        chat: false,
        equipment: false,
        settings: false,
        public_catalog: false,
        calculator: false,
        ai_assistant: false,
        fleet_generator: false,
        support: false,
      };
    }

    // If no company context (e.g., in SaaS admin), allow all modules for authenticated users
    const enabledModules = company?.modules_enabled || [];
    const hasCompanyContext = !!company;
    
    // Dashboard et Settings sont toujours accessibles
    const baseAccess = {
      dashboard: true,
      settings: true,
    };

    // Vérifier l'accès à chaque module
    const moduleAccess = {
      crm: hasCompanyContext ? enabledModules.includes('crm') : true,
      contracts: hasCompanyContext ? enabledModules.includes('contracts') : true,
      offers: hasCompanyContext ? enabledModules.includes('offers') : true,
      invoicing: hasCompanyContext ? enabledModules.includes('invoicing') : true,
      catalog: hasCompanyContext ? enabledModules.includes('catalog') : true,
      chat: hasCompanyContext ? enabledModules.includes('chat') : true,
      equipment: hasCompanyContext ? enabledModules.includes('equipment') : true,
      public_catalog: hasCompanyContext ? enabledModules.includes('public_catalog') : true,
      calculator: hasCompanyContext ? enabledModules.includes('calculator') : true,
      ai_assistant: hasCompanyContext ? enabledModules.includes('ai_assistant') : true,
      fleet_generator: hasCompanyContext ? enabledModules.includes('fleet_generator') : true,
      support: hasCompanyContext ? enabledModules.includes('support') : true,
    };

    return {
      ...baseAccess,
      ...moduleAccess,
    } as ModuleAccessConfig;
  }, [user, company]);

  const hasModuleAccess = (moduleSlug: string): boolean => {
    return moduleAccess[moduleSlug as keyof ModuleAccessConfig] || false;
  };

  return {
    moduleAccess,
    hasModuleAccess,
  };
};