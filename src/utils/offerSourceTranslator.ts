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
    color: "bg-slate-100 text-slate-700 border-slate-300",
    icon: "Globe"
  };
  
  const styles: Record<string, { color: string; icon: string }> = {
    'recommendation': { 
      color: "bg-slate-100 text-slate-700 border-slate-300", 
      icon: "UserCheck" 
    },
    'google': { 
      color: "bg-slate-100 text-slate-700 border-slate-300", 
      icon: "Search" 
    },
    'meta': { 
      color: "bg-blue-50 text-blue-700 border-blue-200", 
      icon: "Facebook" 
    },
    'linkedin': { 
      color: "bg-blue-50 text-blue-700 border-blue-200", 
      icon: "Linkedin" 
    },
    'existing_client': { 
      color: "bg-emerald-50 text-emerald-800 border-emerald-300", 
      icon: "Users" 
    },
    'website': { 
      color: "bg-slate-100 text-slate-700 border-slate-300", 
      icon: "Globe" 
    },
    'site_web': { 
      color: "bg-slate-100 text-slate-700 border-slate-300", 
      icon: "Globe" 
    },
    'event': { 
      color: "bg-slate-200 text-slate-700 border-slate-400", 
      icon: "Calendar" 
    },
    'other': { 
      color: "bg-slate-100 text-slate-700 border-slate-300", 
      icon: "HelpCircle" 
    }
  };
  
  return styles[source] || { 
    color: "bg-slate-100 text-slate-700 border-slate-300", 
    icon: "Globe" 
  };
};
