
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SupportedLanguage = 'fr' | 'en' | 'nl' | 'de';

export type TranslationRecord = {
  [key: string]: {
    [key: string]: string;
  };
};

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '/lovable-uploads/fd238acc-acf0-4045-8257-a57d72209f2c.png' },
  { code: 'en', name: 'English', flag: '/lovable-uploads/19b5ad2f-7c7e-4443-9b68-35b5df3f0af9.png' },
  { code: 'nl', name: 'Nederlands', flag: '/lovable-uploads/8b1a1d6f-6b04-466c-8daa-5e5f4b6ff3ef.png' },
  { code: 'de', name: 'Deutsch', flag: '/lovable-uploads/1a2c73b1-a23a-47a8-a5f1-a95dc330e92a.png' },
];

// Default translations as fallback when the table doesn't exist
const DEFAULT_TRANSLATIONS: any[] = [
  { section: 'common', key: 'save', fr: 'Enregistrer', en: 'Save', nl: 'Opslaan', de: 'Speichern' },
  { section: 'common', key: 'cancel', fr: 'Annuler', en: 'Cancel', nl: 'Annuleren', de: 'Abbrechen' },
  { section: 'common', key: 'edit', fr: 'Modifier', en: 'Edit', nl: 'Bewerken', de: 'Bearbeiten' },
  { section: 'common', key: 'delete', fr: 'Supprimer', en: 'Delete', nl: 'Verwijderen', de: 'Löschen' },
  { section: 'common', key: 'confirm', fr: 'Confirmer', en: 'Confirm', nl: 'Bevestigen', de: 'Bestätigen' },
  { section: 'common', key: 'back', fr: 'Retour', en: 'Back', nl: 'Terug', de: 'Zurück' },
  { section: 'common', key: 'next', fr: 'Suivant', en: 'Next', nl: 'Volgende', de: 'Weiter' },
  { section: 'common', key: 'loading', fr: 'Chargement...', en: 'Loading...', nl: 'Laden...', de: 'Wird geladen...' },
  { section: 'common', key: 'search', fr: 'Rechercher', en: 'Search', nl: 'Zoeken', de: 'Suchen' },
  { section: 'common', key: 'settings', fr: 'Paramètres', en: 'Settings', nl: 'Instellingen', de: 'Einstellungen' },
  { section: 'common', key: 'dashboard', fr: 'Tableau de bord', en: 'Dashboard', nl: 'Dashboard', de: 'Dashboard' }
];

/**
 * Hook pour gérer les traductions multilingues
 */
export const useTranslation = () => {
  // Récupérer la langue depuis le localStorage ou utiliser le français par défaut
  const [language, setLanguage] = useState<SupportedLanguage>(
    () => (localStorage.getItem('language') as SupportedLanguage) || 'fr'
  );
  
  // Récupérer toutes les traductions depuis la base de données
  const { data: translations = [], isLoading } = useQuery({
    queryKey: ['translations'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('translations')
          .select('*');
        
        if (error) {
          console.error('Erreur lors de la récupération des traductions:', error);
          // Return default translations if there's an error (likely table doesn't exist)
          return DEFAULT_TRANSLATIONS;
        }
        
        return data;
      } catch (e) {
        console.error('Exception lors de la récupération des traductions:', e);
        // Return default translations on exception
        return DEFAULT_TRANSLATIONS;
      }
    },
    // Garder les données en cache pendant 5 minutes
    staleTime: 1000 * 60 * 5,
  });
  
  // Transformer les données en un format plus facile à utiliser
  const translationsMap = translations.reduce((acc, item) => {
    if (!acc[item.section]) {
      acc[item.section] = {};
    }
    
    acc[item.section][item.key] = item[language];
    return acc;
  }, {} as TranslationRecord);
  
  // Fonction pour changer la langue
  const changeLanguage = useCallback((newLanguage: SupportedLanguage) => {
    localStorage.setItem('language', newLanguage);
    setLanguage(newLanguage);
  }, []);
  
  // Fonction pour traduire une clé
  const t = useCallback((key: string, section: string = 'common') => {
    // Si la clé n'existe pas dans la section spécifiée, chercher dans 'common'
    if (translationsMap[section]?.[key]) {
      return translationsMap[section][key];
    } else if (translationsMap['common']?.[key]) {
      return translationsMap['common'][key];
    }
    
    // Si aucune traduction n'est trouvée, retourner la clé
    return key;
  }, [translationsMap, language]);
  
  // Mettre à jour la langue lorsque localStorage change (par exemple, dans un autre onglet)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedLanguage = localStorage.getItem('language') as SupportedLanguage;
      if (storedLanguage && storedLanguage !== language) {
        setLanguage(storedLanguage);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [language]);
  
  return {
    language,
    changeLanguage,
    t,
    isLoading,
    SUPPORTED_LANGUAGES,
  };
};
