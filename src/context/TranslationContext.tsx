
import React, { createContext, useContext } from 'react';
import { useTranslation, SupportedLanguage } from '../hooks/useTranslation';

// Define context type
type TranslationContextType = {
  language: SupportedLanguage;
  changeLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, section?: string) => string;
  isLoading: boolean;
  SUPPORTED_LANGUAGES: {
    code: string;
    name: string;
    flag: string;
  }[];
};

// Create context
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// Provider component
export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const translation = useTranslation();
  
  return (
    <TranslationContext.Provider value={translation}>
      {children}
    </TranslationContext.Provider>
  );
};

// Hook to use the translation context
export const useTranslationContext = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslationContext must be used within a TranslationProvider');
  }
  return context;
};
