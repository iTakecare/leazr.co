
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface CompanyBranding {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

interface CompanyBrandingContextType {
  branding: CompanyBranding;
  isLoading: boolean;
}

const CompanyBrandingContext = createContext<CompanyBrandingContextType | undefined>(undefined);

interface CompanyBrandingProviderProps {
  children: React.ReactNode;
}

export const CompanyBrandingProvider: React.FC<CompanyBrandingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [branding, setBranding] = useState<CompanyBranding>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.company) {
      fetchCompanyBranding(user.company);
    }
  }, [user?.company]);

  const fetchCompanyBranding = async (companyId: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('primary_color, secondary_color, accent_color, logo_url')
        .eq('id', companyId)
        .single();

      if (error) throw error;

      if (data) {
        setBranding({
          primaryColor: data.primary_color,
          secondaryColor: data.secondary_color,
          accentColor: data.accent_color,
          logoUrl: data.logo_url,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du branding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: CompanyBrandingContextType = {
    branding,
    isLoading,
  };

  return (
    <CompanyBrandingContext.Provider value={value}>
      {children}
    </CompanyBrandingContext.Provider>
  );
};

export const useCompanyBranding = () => {
  const context = useContext(CompanyBrandingContext);
  if (context === undefined) {
    throw new Error('useCompanyBranding must be used within a CompanyBrandingProvider');
  }
  return context;
};
