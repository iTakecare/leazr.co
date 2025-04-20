
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useTranslationContext } from "@/context/TranslationContext";
import { ChevronDown } from "lucide-react";
import React from "react";
import { SupportedLanguage } from "@/hooks/useTranslation";

export const LanguageSelector = () => {
  const { language, changeLanguage, SUPPORTED_LANGUAGES, t } = useTranslationContext();
  
  // Obtenir les informations sur la langue actuelle
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === language);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center">
        <img 
          src={currentLanguage?.flag} 
          alt={currentLanguage?.name} 
          className="h-6 w-6 rounded-full"
        />
        <ChevronDown className="ml-1 h-3 w-3 text-gray-700" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 bg-white rounded-xl p-2 shadow-lg">
        {SUPPORTED_LANGUAGES.map((lang, index) => (
          <React.Fragment key={lang.code}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem 
              className={`py-2 px-3 text-sm rounded-lg hover:bg-[#f8f8f6] cursor-pointer ${
                language === lang.code ? "bg-[#f8f8f6] font-semibold" : ""
              }`}
              onClick={() => changeLanguage(lang.code as SupportedLanguage)}
            >
              <div className="flex items-center">
                <img src={lang.flag} alt={lang.name} className="h-4 w-4 rounded-full mr-2" />
                {lang.name}
              </div>
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
