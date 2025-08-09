import React from "react";
import { SearchWithSuggestions } from "./SearchWithSuggestions";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { useNavigate, useLocation } from "react-router-dom";

interface CatalogSearchSectionProps {
  companyId?: string;
  companySlug?: string;
  onCartClick?: () => void;
  showQuoteButton?: boolean;
  onRequestQuote?: () => void;
}

const CatalogSearchSection: React.FC<CatalogSearchSectionProps> = ({ 
  companyId, 
  companySlug, 
  onCartClick,
  showQuoteButton = false,
  onRequestQuote
}) => {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const getCartUrl = () => {
    // Si on est sur une route avec slug d'entreprise
    if (companySlug) {
      return `/${companySlug}/cart`;
    }
    
    // Si on est sur une route public avec ID
    if (companyId && location.pathname.includes('/public/')) {
      return `/public/${companyId}/cart`;
    }
    
    // Route par défaut
    return '/cart';
  };

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      navigate(getCartUrl());
    }
  };

  return (
    <div className="bg-white p-4 border-t border-gray-100 relative z-20 rounded-b-2xl">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Barre de recherche à gauche */}
        <div className="flex-1">
          <SearchWithSuggestions />
        </div>
        
        {/* Boutons à droite */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showQuoteButton && (
            <Button 
              variant="outline"
              size="sm"
              onClick={onRequestQuote}
              className="text-xs md:text-sm"
            >
              Demander un devis
            </Button>
          )}
          
          <button
            onClick={handleCartClick}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#275D8C]/30"
            aria-label="Voir le panier"
          >
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#275D8C] text-white text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CatalogSearchSection;