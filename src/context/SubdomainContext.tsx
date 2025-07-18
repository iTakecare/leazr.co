import React, { createContext, useContext, ReactNode } from 'react';
import { useSubdomainDetection } from '@/hooks/useSubdomainDetection';

interface CompanyInfo {
  id: string;
  name: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string;
}

interface DetectionResult {
  companyId: string | null;
  company: CompanyInfo | null;
  detectionMethod: 'subdomain' | 'param' | 'default';
}

interface SubdomainContextType {
  detection: DetectionResult;
  loading: boolean;
  error: string | null;
  isSubdomainDetected: boolean;
  isCompanyDetected: boolean;
  refetch: () => void;
}

const SubdomainContext = createContext<SubdomainContextType | undefined>(undefined);

export const useSubdomain = () => {
  const context = useContext(SubdomainContext);
  if (context === undefined) {
    throw new Error('useSubdomain must be used within a SubdomainProvider');
  }
  return context;
};

export const SubdomainProvider = ({ children }: { children: ReactNode }) => {
  const detectionData = useSubdomainDetection();

  // Provide a fallback value in case the hook fails
  const contextValue: SubdomainContextType = {
    detection: detectionData?.detection || {
      companyId: null,
      company: null,
      detectionMethod: 'default'
    },
    loading: detectionData?.loading || false,
    error: detectionData?.error || null,
    isSubdomainDetected: detectionData?.isSubdomainDetected || false,
    isCompanyDetected: detectionData?.isCompanyDetected || false,
    refetch: detectionData?.refetch || (() => {})
  };

  return (
    <SubdomainContext.Provider value={contextValue}>
      {children}
    </SubdomainContext.Provider>
  );
};