
import React from 'react';
import { Language, useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LanguageOption {
  code: Language;
  label: string;
  flagSrc: string;
}

const languages: LanguageOption[] = [
  {
    code: 'fr',
    label: 'Français',
    flagSrc: '/flags/fr-flag.png', // Drapeau français
  },
  {
    code: 'en',
    label: 'English',
    flagSrc: '/flags/en-flag.png', // Drapeau anglais
  },
  {
    code: 'nl',
    label: 'Nederlands',
    flagSrc: '/flags/nl-flag.png', // Drapeau néerlandais
  },
  {
    code: 'de',
    label: 'Deutsch',
    flagSrc: '/flags/de-flag.png', // Drapeau allemand
  },
];

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
  mode?: 'dropdown' | 'horizontal';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className,
  showLabel = false,
  mode = 'dropdown',
}) => {
  const { language, setLanguage } = useLanguage();
  
  // Trouve la langue active
  const activeLanguage = languages.find((lang) => lang.code === language) || languages[0];
  
  // Change la langue
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };
  
  // Mode horizontal (utilisé pour mobile)
  if (mode === 'horizontal') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "flex items-center p-2 rounded-full transition-all",
              language === lang.code 
                ? "ring-2 ring-offset-2 ring-[#48b5c3]" 
                : "hover:bg-gray-100"
            )}
            aria-label={`Switch to ${lang.label}`}
          >
            <img 
              src={lang.flagSrc} 
              alt={lang.label} 
              className="h-6 w-6 rounded-full object-cover"
              width="24"
              height="24"
            />
          </button>
        ))}
      </div>
    );
  }
  
  // Mode dropdown (par défaut)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn("flex items-center p-2 rounded-full hover:bg-gray-100 transition-colors", className)}>
        <img 
          src={activeLanguage.flagSrc} 
          alt={activeLanguage.label} 
          className="h-5 w-5 rounded-full object-cover"
          width="20"
          height="20"
        />
        {showLabel && (
          <span className="ml-2 text-sm font-medium">{activeLanguage.code.toUpperCase()}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-white rounded-xl p-1 shadow-lg border border-gray-100">
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "flex items-center py-2 px-3 text-sm rounded-lg cursor-pointer",
              language === lang.code 
                ? "bg-gray-100 font-medium" 
                : "hover:bg-gray-50"
            )}
          >
            <img 
              src={lang.flagSrc} 
              alt={lang.label}
              className="h-5 w-5 rounded-full mr-2 object-cover" 
              width="20"
              height="20"
            />
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
