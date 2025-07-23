import React, { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
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

// Utility function to detect system routes
const isSystemRoute = (pathname: string): boolean => {
  const systemRoutes = ['/ambassador', '/admin', '/client', '/api'];
  return systemRoutes.some(route => pathname.startsWith(route));
};

export const SubdomainProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  
  // Default values for system routes
  const defaultDetectionData = {
    detection: {
      companyId: null,
      company: null,
      detectionMethod: 'default' as const
    },
    loading: false,
    error: null,
    isSubdomainDetected: false,
    isCompanyDetected: false,
    refetch: () => {}
  };

  // Skip subdomain detection for system routes
  const detectionData = isSystemRoute(location.pathname) 
    ? defaultDetectionData 
    : useSubdomainDetection();

  return (
    <SubdomainContext.Provider value={detectionData}>
      {children}
    </SubdomainContext.Provider>
  );
};