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
  detectionMethod: 'subdomain' | 'default' | 'provided';
}

interface SubdomainContextType {
  detection: DetectionResult;
  loading: boolean;
  error: string | null;
  isSubdomainDetected: boolean;
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

  return (
    <SubdomainContext.Provider value={detectionData}>
      {children}
    </SubdomainContext.Provider>
  );
};