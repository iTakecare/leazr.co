/**
 * Traduit les codes de source en libellés français pour l'affichage
 */
export const translateOfferSource = (source: string | null | undefined): string => {
  if (!source) return "Non définie";
  
  const translations: Record<string, string> = {
    'recommendation': 'Recommandation',
    'google': 'Google',
    'meta': 'Meta (Facebook)',
    'linkedin': 'LinkedIn',
    'existing_client': 'Client existant',
    'website': 'Site web',
    'site_web': 'Site web',
    'event': 'Salon/Événement',
    'other': 'Autre'
  };
  
  return translations[source] || source;
};

/**
 * Retourne les styles et icône pour chaque type de source
 */
export const getSourceStyle = (source: string | null | undefined) => {
  if (!source) return {
    color: "bg-gray-50 text-gray-700 border-gray-200",
    icon: "Globe"
  };
  
  const styles: Record<string, { color: string; icon: string }> = {
    'recommendation': { 
      color: "bg-purple-50 text-purple-700 border-purple-200", 
      icon: "UserCheck" 
    },
    'google': { 
      color: "bg-red-50 text-red-700 border-red-200", 
      icon: "Search" 
    },
    'meta': { 
      color: "bg-blue-50 text-blue-700 border-blue-200", 
      icon: "Facebook" 
    },
    'linkedin': { 
      color: "bg-sky-50 text-sky-700 border-sky-200", 
      icon: "Linkedin" 
    },
    'existing_client': { 
      color: "bg-emerald-50 text-emerald-700 border-emerald-200", 
      icon: "Users" 
    },
    'website': { 
      color: "bg-cyan-50 text-cyan-700 border-cyan-200", 
      icon: "Globe" 
    },
    'site_web': { 
      color: "bg-cyan-50 text-cyan-700 border-cyan-200", 
      icon: "Globe" 
    },
    'event': { 
      color: "bg-orange-50 text-orange-700 border-orange-200", 
      icon: "Calendar" 
    },
    'other': { 
      color: "bg-gray-50 text-gray-700 border-gray-200", 
      icon: "HelpCircle" 
    }
  };
  
  return styles[source] || { 
    color: "bg-gray-50 text-gray-700 border-gray-200", 
    icon: "Globe" 
  };
};
