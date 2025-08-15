import { useAuth } from "@/context/AuthContext";
import { useContext } from "react";
import { useMemo } from "react";
import { CompanyContext } from "@/context/CompanyContext";
import { useRefreshableCompanyData } from "./useRefreshableCompanyData";

// Safe wrapper that doesn't throw when provider is missing
const useSafeCompanyContext = () => {
  const context = useContext(CompanyContext);
  // If context is undefined, return safe defaults
  if (context === undefined) {
    return { company: null, companyId: null, companySlug: null };
  }
  return context;
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
  const { company: contextCompany } = useSafeCompanyContext();
  const { company: freshCompany, refresh: refreshCompanyData } = useRefreshableCompanyData();
  
  // Use fresh company data when available, fallback to context
  const company = freshCompany || contextCompany;

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

    // Always check enabled modules from the company data
    const enabledModules = company?.modules_enabled || [];
    const hasCompanyContext = !!company;
    
    // If no company context, check if user is super admin
    // Super admins get access to all modules, regular users get none
    if (!hasCompanyContext) {
      const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
      if (isAdmin) {
        // Super admins in SaaS interface have access to all modules
        return {
          dashboard: true,
          crm: true,
          contracts: true,
          offers: true,
          invoicing: true,
          catalog: true,
          chat: true,
          equipment: true,
          settings: true,
          public_catalog: true,
          calculator: true,
          ai_assistant: true,
          fleet_generator: true,
          support: true,
        };
      }
      // Regular users without company context get no access
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

    // Check each module against the enabled modules list
    // No module is automatically granted - all must be explicitly enabled
    const moduleAccess = {
      dashboard: enabledModules.includes('dashboard'),
      crm: enabledModules.includes('clients'), // 'clients' maps to CRM functionality
      contracts: enabledModules.includes('contracts'),
      offers: enabledModules.includes('offers'),
      invoicing: enabledModules.includes('invoicing'),
      catalog: enabledModules.includes('catalog'),
      chat: enabledModules.includes('chat'),
      equipment: enabledModules.includes('equipment'),
      settings: enabledModules.includes('settings'),
      public_catalog: enabledModules.includes('public_catalog'),
      calculator: enabledModules.includes('calculator'),
      ai_assistant: enabledModules.includes('ai_assistant'),
      fleet_generator: enabledModules.includes('fleet_generator'),
      support: enabledModules.includes('support'),
    };

    return moduleAccess;
  }, [user, company]);

  const hasModuleAccess = (moduleSlug: string): boolean => {
    return moduleAccess[moduleSlug as keyof ModuleAccessConfig] || false;
  };

  return {
    moduleAccess,
    hasModuleAccess,
    refresh: refreshCompanyData,
  };
};