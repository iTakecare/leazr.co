import React, { createContext, useContext } from 'react';
import { Financeur, FinanceurContextType } from '@/types/financeur';

const FinanceurContext = createContext<FinanceurContextType | undefined>(undefined);

export { FinanceurContext };

interface FinanceurProviderProps {
  children: React.ReactNode;
  financeur: Financeur | null;
  loading: boolean;
  refresh: () => void;
}

export const FinanceurProvider: React.FC<FinanceurProviderProps> = ({
  children,
  financeur,
  loading,
  refresh
}) => {
  const value: FinanceurContextType = {
    financeur,
    financeurId: financeur?.id || null,
    financeurSlug: financeur?.slug || null,
    loading,
    refresh,
  };

  return (
    <FinanceurContext.Provider value={value}>
      {children}
    </FinanceurContext.Provider>
  );
};

export const useFinanceurContext = () => {
  const context = useContext(FinanceurContext);
  if (context === undefined) {
    throw new Error('useFinanceurContext must be used within a FinanceurProvider');
  }
  return context;
};
