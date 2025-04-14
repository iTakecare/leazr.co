
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types de langues disponibles
export type Language = 'fr' | 'en' | 'nl' | 'de';

// Interface pour le contexte
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

// Valeur par défaut du contexte
const defaultValue: LanguageContextType = {
  language: 'fr',
  setLanguage: () => {},
  t: (key: string) => key,
};

// Création du contexte
const LanguageContext = createContext<LanguageContextType>(defaultValue);

// Hook pour utiliser le contexte de langue
export const useLanguage = () => useContext(LanguageContext);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Récupération de la langue stockée ou utilisation de la langue par défaut
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || navigator.language.split('-')[0] as Language || 'fr';
  });
  
  // Translations disponibles
  const [translations, setTranslations] = useState<Record<string, Record<string, string>>>({});

  // Chargement des traductions
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Importation dynamique des fichiers de traduction
        const frTranslations = await import('../translations/fr.json');
        const enTranslations = await import('../translations/en.json');
        const nlTranslations = await import('../translations/nl.json');
        const deTranslations = await import('../translations/de.json');
        
        setTranslations({
          fr: frTranslations,
          en: enTranslations,
          nl: nlTranslations,
          de: deTranslations,
        });
      } catch (error) {
        console.error('Failed to load translations:', error);
      }
    };
    
    loadTranslations();
  }, []);
  
  // Mise à jour de la langue stockée lorsqu'elle change
  useEffect(() => {
    localStorage.setItem('language', language);
    // Mise à jour de l'attribut lang du document
    document.documentElement.lang = language;
  }, [language]);
  
  // Fonction de traduction
  const t = (key: string): string => {
    if (!translations[language]) return key;
    return translations[language][key] || translations['fr'][key] || key;
  };
  
  // Changement de langue
  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage);
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
