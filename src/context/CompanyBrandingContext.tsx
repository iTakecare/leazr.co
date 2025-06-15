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
    if (!companyId) return;
    
    try {
      setLoading(true);
      const brandingData = await CompanyCustomizationService.getCompanyBranding(companyId);
      setBranding(brandingData);
      
      // Appliquer automatiquement le branding si disponible
      if (brandingData) {
        CompanyCustomizationService.applyCompanyBranding(brandingData);
      }
    } catch (error) {
      console.error('Error fetching company branding:', error);
    } finally {
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
    if (!companyLoading && companyId) {
      fetchBranding();
    }
  }, [companyId, companyLoading]);

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