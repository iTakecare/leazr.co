import React, { createContext, useContext } from 'react';
import { getEmbedParams } from '@/lib/embedBridge';
import { useSiteSettings } from '@/hooks/useSiteSettings';

interface EmbedContextType {
  isEmbed: boolean;
  parentOrigin: string;
}

const EmbedContext = createContext<EmbedContextType | undefined>(undefined);

export const EmbedProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isEmbed, parentOrigin } = getEmbedParams();
  const { settings } = useSiteSettings();
  
  // Override embed mode based on settings
  const finalIsEmbed = isEmbed || (settings?.public_catalog_embed_mode && !isEmbed);
  const finalParentOrigin = parentOrigin || settings?.public_catalog_parent_origin || '*';
  
  return (
    <EmbedContext.Provider value={{ isEmbed: finalIsEmbed, parentOrigin: finalParentOrigin }}>
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