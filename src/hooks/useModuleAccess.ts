import { useAuth } from "@/context/AuthContext";
import { useCompanyContext } from "@/context/CompanyContext";
import { useMemo } from "react";

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
  const { company } = useCompanyContext();

  const moduleAccess = useMemo((): ModuleAccessConfig => {
    if (!user || !company) {
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

    const enabledModules = company.modules_enabled || [];
    
    // Dashboard et Settings sont toujours accessibles
    const baseAccess = {
      dashboard: true,
      settings: true,
    };

    // Vérifier l'accès à chaque module
    const moduleAccess = {
      crm: enabledModules.includes('crm'),
      contracts: enabledModules.includes('contracts'),
      offers: enabledModules.includes('offers'),
      invoicing: enabledModules.includes('invoicing'),
      catalog: enabledModules.includes('catalog'),
      chat: enabledModules.includes('chat'),
      equipment: enabledModules.includes('equipment'),
      public_catalog: enabledModules.includes('public_catalog'),
      calculator: enabledModules.includes('calculator'),
      ai_assistant: enabledModules.includes('ai_assistant'),
      fleet_generator: enabledModules.includes('fleet_generator'),
      support: enabledModules.includes('support'),
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