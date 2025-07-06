
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";
import { SearchWithSuggestions } from "./SearchWithSuggestions";
import CompanyLogo from "@/components/layout/CompanyLogo";

interface CatalogHeaderProps {
  companyName?: string;
  companyLogo?: string;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({ companyName, companyLogo }) => {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#275D8C] via-[#4196b4] to-[#48B5C3] shadow-xl overflow-visible">
      <div className="relative flex flex-col md:flex-row max-h-[460px] md:max-h-[380px]">
        <div className="z-10 p-6 md:p-8 md:w-3/5">
          {companyLogo && (
            <div className="mb-4">
              <CompanyLogo 
                logoSize="lg" 
                className="filter brightness-0 invert"
              />
            </div>
          )}
          
          <h1 className="font-bold text-2xl md:text-3xl lg:text-4xl text-white leading-tight mb-3">
            {companyName ? 
              `Équipement premium ${companyName}` : 
              "Équipement premium reconditionné pour des équipes performantes"
            }
          </h1>
          
          <p className="text-white/90 text-sm md:text-base mb-6 max-w-xl">
            {companyName ? 
              `Découvrez la sélection d'équipements professionnels de ${companyName} - matériel Apple et PC haute qualité, à l'impact environnemental réduit.` :
              "Donnez à vos collaborateurs les outils dont ils ont besoin avec notre sélection de matériel Apple et PC haute qualité, à l'impact environnemental réduit."
            }
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              size="sm"
              variant="outline" 
              className="bg-white text-[#275D8C] hover:bg-white/90 border-white text-xs md:text-sm group"
            >
              <MessageCircle className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
              Parler à un conseiller
            </Button>
            <Button 
              size="sm" 
              className="bg-[#d13157] hover:bg-[#b82a4d] border-0 text-xs md:text-sm group"
            >
              Demander un devis <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-3 border-t border-gray-100 relative z-20">
        <SearchWithSuggestions />
      </div>
    </div>
  );
};

export default CatalogHeader;
