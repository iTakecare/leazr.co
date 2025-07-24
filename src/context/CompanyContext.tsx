import React, { createContext, useContext } from 'react';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface CompanyContextType {
  company: Company | null;
  companyId: string | null;
  companySlug: string | null;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

interface CompanyProviderProps {
  children: React.ReactNode;
  company: Company | null;
}

export const CompanyProvider: React.FC<CompanyProviderProps> = ({ children, company }) => {
  const value: CompanyContextType = {
    company,
    companyId: company?.id || null,
    companySlug: company?.slug || null,
  };

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompanyContext = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompanyContext must be used within a CompanyProvider');
  }
  return context;
};