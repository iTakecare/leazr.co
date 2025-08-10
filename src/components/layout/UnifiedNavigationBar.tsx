import React from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/layout/Logo";
import { useCart } from "@/context/CartContext";
import { SearchWithSuggestions } from "@/components/catalog/public/SearchWithSuggestions";
import PublicCatalogFilterBar from "@/components/catalog/public/PublicCatalogFilterBar";
import { type PublicSimplifiedFilterState } from "@/hooks/products/usePublicSimplifiedFilter";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface Category {
  name: string;
  label: string;
  icon: any;
  count: number;
}


interface UnifiedNavigationBarProps {
  // Company info
  company?: Company;
  
  // Filter functionality (optional - only show on catalog pages)
  showFilters?: boolean;
  filters?: PublicSimplifiedFilterState;
  updateFilter?: <K extends keyof PublicSimplifiedFilterState>(
    key: K, 
    value: PublicSimplifiedFilterState[K]
  ) => void;
  resetFilters?: () => void;
  categories?: Category[];
  hasActiveFilters?: boolean;
  resultsCount?: number;
  
  // Cart and actions
  showCartButton?: boolean;
  showQuoteButton?: boolean;
  onCartClick?: () => void;
  onRequestQuote?: () => void;
  quoteLink?: string;
  
  // Custom styling
  className?: string;
}

const UnifiedNavigationBar: React.FC<UnifiedNavigationBarProps> = ({
  company,
  showFilters = false,
  filters,
  updateFilter,
  resetFilters,
  categories,
  hasActiveFilters,
  resultsCount,
  showCartButton = true,
  showQuoteButton = true,
  onCartClick,
  onRequestQuote,
  quoteLink,
  className
}) => {
  const { cartCount } = useCart();
  const location = useLocation();
  const { companySlug } = useParams<{ companySlug: string }>();
  
  // Hide navigation in embed mode
  const params = new URLSearchParams(location.search);
  const isEmbed = params.get('embed') === '1';
  
  if (isEmbed) {
    return null;
  }
  
  // Determine the correct cart URL based on context
  const getCartUrl = () => {
    const isInClientSpace = location.pathname.includes('/client/');
    
    if (isInClientSpace && companySlug) {
      return `/${companySlug}/client/panier`;
    } else if (companySlug) {
      return `/${companySlug}/panier`;
    } else if (company?.id) {
      return `/public/${company.id}/panier`;
    }
    return "/panier";
  };

  const handleCartClick = () => {
    if (onCartClick) {
      onCartClick();
    } else {
      // Navigate to cart URL if no custom handler
      window.location.href = getCartUrl();
    }
  };

  const handleQuoteClick = () => {
    if (quoteLink) {
      window.location.href = quoteLink;
    } else {
      onRequestQuote?.();
    }
  };

  return (
    <div className={cn("bg-white border-b border-gray-200 sticky top-0 z-50", className)}>
      {/* Main navigation bar */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and company name */}
          <Link 
            to="/" 
            className="text-xl font-bold text-[#33638E] flex items-center group flex-shrink-0"
          >
            {company?.logo_url ? (
              <img 
                src={company.logo_url} 
                alt={company.name || "Logo entreprise"} 
                className="h-10 w-10 mr-3 rounded-lg object-cover transition-transform duration-300 group-hover:scale-110"
              />
            ) : (
              <Logo variant="avatar" logoSize="md" showText={false} className="mr-3 transition-transform duration-300 group-hover:scale-110" />
            )}
            <span className="bg-gradient-to-r from-[#33638E] to-[#48b5c3] bg-clip-text text-transparent hidden sm:block">
              {company?.name || "iTakecare"}
            </span>
          </Link>
          
          {/* Search bar - center on desktop, hidden on mobile when filters shown */}
          <div className={cn(
            "flex-1 max-w-2xl mx-6",
            showFilters ? "hidden lg:block" : "hidden sm:block"
          )}>
            <SearchWithSuggestions />
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {showQuoteButton && (
              <Button 
                variant="outline"
                size="sm"
                onClick={handleQuoteClick}
                className="text-sm whitespace-nowrap hidden md:flex"
              >
                Demander un devis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            
            {showCartButton && (
              <button
                onClick={handleCartClick}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Voir le panier"
              >
                <ShoppingCart className="h-6 w-6 text-gray-700" />
                {cartCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-medium rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]",
                    cartCount > 0 && "animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                  )}>
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Filters section - only shown when enabled */}
      {showFilters && filters && updateFilter && resetFilters && categories && (
        <div className="border-t border-gray-100">
          <div className="container mx-auto px-4">
            <PublicCatalogFilterBar
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              categories={categories}
              hasActiveFilters={hasActiveFilters}
              resultsCount={resultsCount}
            />
          </div>
        </div>
      )}
      
      {/* Mobile search - shown when filters are enabled */}
      {showFilters && (
        <div className="border-t border-gray-100 lg:hidden">
          <div className="container mx-auto px-4 py-3">
            <SearchWithSuggestions />
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedNavigationBar;