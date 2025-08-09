
import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";
import CatalogSearchSection from "./CatalogSearchSection";
import { useParams } from "react-router-dom";

interface CatalogHeaderProps {
  companyName?: string;
  companyLogo?: string;
  companyId?: string;
  onCartClick?: () => void;
  headerEnabled?: boolean;
  headerTitle?: string;
  headerDescription?: string;
  headerBackgroundType?: 'solid' | 'gradient' | 'image';
  headerBackgroundConfig?: any;
  onRequestQuote?: () => void;
  quoteLink?: string;
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({ 
  companyName, 
  companyLogo, 
  companyId, 
  onCartClick,
  headerEnabled = true,
  headerTitle,
  headerDescription,
  headerBackgroundType = 'gradient',
  headerBackgroundConfig,
  onRequestQuote,
  quoteLink
}) => {
  const { companySlug } = useParams<{ companySlug: string }>();

  // Generate background styles based on configuration
  const getBackgroundStyle = () => {
    if (!headerBackgroundConfig || !headerEnabled) {
      return "bg-gradient-to-br from-[#275D8C] via-[#4196b4] to-[#48B5C3]";
    }

    switch (headerBackgroundType) {
      case 'solid':
        return `bg-[${headerBackgroundConfig.solid}]`;
      case 'gradient':
        const { from, to, direction } = headerBackgroundConfig.gradient || {};
        return `bg-gradient-to-br from-[${from || '#275D8C'}] to-[${to || '#48B5C3'}]`;
      case 'image':
        const { url, position, repeat } = headerBackgroundConfig.image || {};
        return `bg-[url('${url}')] bg-${position || 'center'} bg-${repeat || 'no-repeat'} bg-cover`;
      default:
        return "bg-gradient-to-br from-[#275D8C] via-[#4196b4] to-[#48B5C3]";
    }
  };

  // If header is disabled, return null (no header at all)
  if (!headerEnabled) {
    return null;
  }

  return (
    <div className={`rounded-2xl ${getBackgroundStyle()} shadow-xl overflow-visible`}>
      <div className="relative flex flex-col md:flex-row max-h-[460px] md:max-h-[380px]">
        <div className="z-10 p-6 md:p-8 md:w-3/5">
          
          <h1 className="font-bold text-2xl md:text-3xl lg:text-4xl text-white leading-tight mb-3">
            {headerTitle && headerTitle.trim() ? headerTitle : (companyName ? 
              `Équipement premium ${companyName}` : 
              "Équipement premium reconditionné pour des équipes performantes"
            )}
          </h1>
          
          <p className="text-white/90 text-sm md:text-base mb-6 max-w-xl">
            {headerDescription && headerDescription.trim() ? headerDescription : (companyName ? 
              `Découvrez la sélection d'équipements professionnels de ${companyName} - matériel Apple et PC haute qualité, à l'impact environnemental réduit.` :
              "Donnez à vos collaborateurs les outils dont ils ont besoin avec notre sélection de matériel Apple et PC haute qualité, à l'impact environnemental réduit."
            )}
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              size="sm" 
              className="bg-[#d13157] hover:bg-[#b82a4d] border-0 text-xs md:text-sm group"
              onClick={() => {
                if (quoteLink) {
                  window.location.href = quoteLink;
                } else {
                  onRequestQuote?.();
                }
              }}
            >
              Demander un devis <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
      </div>
      
      <CatalogSearchSection 
        companyId={companyId} 
        companySlug={companySlug}
        onCartClick={onCartClick}
      />
    </div>
  );
};

export default CatalogHeader;
