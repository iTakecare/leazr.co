
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import CompanyCustomizationService, { CompanyBranding } from '@/services/companyCustomizationService';

interface CompanyBrandingContextType {
  branding: CompanyBranding | null;
  loading: boolean;
  updateBranding: (newBranding: Partial<CompanyBranding>) => Promise<void>;
  applyBranding: () => void;
}

const CompanyBrandingContext = createContext<CompanyBrandingContextType | undefined>(undefined);

export const useCompanyBranding = () => {
  const context = useContext(CompanyBrandingContext);
  if (context === undefined) {
    throw new Error('useCompanyBranding must be used within a CompanyBrandingProvider');
  }
  return context;
};

interface CompanyBrandingProviderProps {
  children: ReactNode;
}

export const CompanyBrandingProvider = ({ children }: CompanyBrandingProviderProps) => {
  const { companyId, loading: companyLoading } = useMultiTenant();
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    console.log("🏢 COMPANY BRANDING - Début fetchBranding, companyId:", companyId);
    
    if (!companyId) {
      console.log("🏢 COMPANY BRANDING - Pas de companyId, arrêt");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log("🏢 COMPANY BRANDING - Appel getCompanyBranding pour:", companyId);
      
      const brandingData = await CompanyCustomizationService.getCompanyBranding(companyId);
      console.log("🏢 COMPANY BRANDING - Données reçues:", brandingData);
      
      setBranding(brandingData);
      
      // Appliquer automatiquement le branding si disponible
      if (brandingData) {
        console.log("🏢 COMPANY BRANDING - Application du branding");
        CompanyCustomizationService.applyCompanyBranding(brandingData);
      }
    } catch (error) {
      console.error('🏢 COMPANY BRANDING - Erreur lors de la récupération:', error);
    } finally {
      console.log("🏢 COMPANY BRANDING - Fin de fetchBranding, setLoading(false)");
      setLoading(false);
    }
  };

  const updateBranding = async (newBranding: Partial<CompanyBranding>) => {
    if (!companyId) return;
    
    try {
      await CompanyCustomizationService.updateCompanyBranding(companyId, newBranding);
      
      // Mettre à jour l'état local
      setBranding(prev => prev ? { ...prev, ...newBranding } : null);
      
      // Appliquer les nouveaux styles
      if (branding) {
        CompanyCustomizationService.applyCompanyBranding({ ...branding, ...newBranding });
      }
    } catch (error) {
      console.error('Error updating company branding:', error);
      throw error;
    }
  };

  const applyBranding = () => {
    if (branding) {
      CompanyCustomizationService.applyCompanyBranding(branding);
    }
  };

  useEffect(() => {
    console.log("🏢 COMPANY BRANDING - useEffect déclenché, companyLoading:", companyLoading, "companyId:", companyId);
    
    if (!companyLoading && companyId) {
      fetchBranding();
    } else if (!companyLoading && !companyId) {
      console.log("🏢 COMPANY BRANDING - Pas de companyId après chargement, setLoading(false)");
      setLoading(false);
    }
  }, [companyId, companyLoading]);

  console.log("🏢 COMPANY BRANDING - Rendu du provider, loading:", loading, "branding:", !!branding);

  const value = {
    branding,
    loading: loading || companyLoading,
    updateBranding,
    applyBranding
  };

  return (
    <CompanyBrandingContext.Provider value={value}>
      {children}
    </CompanyBrandingContext.Provider>
  );
};
