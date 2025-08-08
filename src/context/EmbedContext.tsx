import React, { createContext, useContext } from 'react';
import { getEmbedParams } from '@/lib/embedBridge';

interface EmbedContextType {
  isEmbed: boolean;
  parentOrigin: string;
}

const EmbedContext = createContext<EmbedContextType | undefined>(undefined);

export const EmbedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isEmbed, parentOrigin } = getEmbedParams();
  
  return (
    <EmbedContext.Provider value={{ isEmbed, parentOrigin }}>
      {children}
    </EmbedContext.Provider>
  );
};

export const useEmbed = (): EmbedContextType => {
  const context = useContext(EmbedContext);
  if (context === undefined) {
    throw new Error('useEmbed must be used within an EmbedProvider');
  }
  return context;
};