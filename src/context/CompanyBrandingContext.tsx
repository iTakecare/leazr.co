
import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useMultiTenant } from '@/hooks/useMultiTenant';
import CompanyCustomizationService, { CompanyBranding } from '@/services/companyCustomizationService';
import { isSystemRoute } from '@/utils/routeDetection';

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
  const location = useLocation();
  const { companyId, loading: companyLoading } = useMultiTenant();
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastCompanyIdRef = useRef<string | null>(null);
  
  // Don't load branding on system routes
  const shouldLoadBranding = !isSystemRoute(location.pathname);

  const fetchBranding = useCallback(async () => {
    if (!companyId || fetchingRef.current || lastCompanyIdRef.current === companyId) {
      setLoading(false);
      return;
    }
    
    fetchingRef.current = true;
    lastCompanyIdRef.current = companyId;
    
    try {
      setLoading(true);
      const brandingData = await CompanyCustomizationService.getCompanyBranding(companyId);
      setBranding(brandingData);
      
      if (brandingData) {
        CompanyCustomizationService.applyCompanyBranding(brandingData);
      }
    } catch (error) {
      console.error('🏢 COMPANY BRANDING - Erreur:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [companyId]);

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
    // Don't fetch branding on system routes like homepage
    if (!shouldLoadBranding) {
      setLoading(false);
      return;
    }
    
    if (!companyLoading) {
      fetchBranding();
    }
  }, [companyLoading, fetchBranding, shouldLoadBranding]);

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
