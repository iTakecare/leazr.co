import React from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
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
  contact_phone?: string;
  contact_email?: string;
}

interface Category {
  name: string;
  label: string;
  icon: any;
  count: number;
}


type NavigationMode = 'catalog' | 'minimal' | 'cart';

interface UnifiedNavigationBarProps {
  // Company info
  company?: Company;
  
  // Navigation mode
  mode?: NavigationMode;
  
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
  
  // Page-specific content
  title?: string;
  backButton?: {
    label: string;
    url: string;
  };
  
  // Custom styling
  className?: string;
}

const UnifiedNavigationBar: React.FC<UnifiedNavigationBarProps> = ({
  company,
  mode = 'catalog',
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
  title,
  backButton,
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

  // Render company header for minimal and cart modes
  const renderCompanyHeader = () => (
    <div className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {company?.logo_url && (
              <img 
                src={company.logo_url} 
                alt={company.name}
                className="h-10 w-auto"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{company?.name || "iTakecare"}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {company?.contact_phone && (
                  <div className="flex items-center gap-1">
                    <span>📞</span>
                    <span>{company.contact_phone}</span>
                  </div>
                )}
                {company?.contact_email && (
                  <div className="flex items-center gap-1">
                    <span>✉️</span>
                    <span>{company.contact_email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {backButton && (
              <Button 
                variant="outline" 
                asChild
                className="flex items-center gap-2"
              >
                <Link to={backButton.url}>
                  <span>←</span>
                  {backButton.label}
                </Link>
              </Button>
            )}
            {showCartButton && (
              <Button
                variant="outline"
                onClick={handleCartClick}
                className="flex items-center gap-2"
              >
                🛒 Panier {cartCount > 0 && `(${cartCount})`}
              </Button>
            )}
            {showQuoteButton && (
              <Button
                onClick={handleQuoteClick}
                className="flex items-center gap-2"
              >
                📋 Demander un devis
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={cn("sticky top-0 z-50 py-2", className)}>
      {/* Company header for minimal/cart modes */}
      {(mode === 'minimal' || mode === 'cart') && renderCompanyHeader()}
      
      {/* Filter bar for catalog mode or when explicitly shown */}
      {(mode === 'catalog' || showFilters) && filters && updateFilter && resetFilters && categories && (
        <div className="container mx-auto px-4">
          <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
            <PublicCatalogFilterBar
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              categories={categories}
              hasActiveFilters={hasActiveFilters}
              resultsCount={resultsCount}
              showCartButton={showCartButton}
              showQuoteButton={showQuoteButton}
              cartCount={cartCount}
              onCartClick={handleCartClick}
              onRequestQuote={handleQuoteClick}
            />
          </div>
        </div>
      )}
      
      {/* Page title for non-catalog modes */}
      {title && mode !== 'catalog' && (
        <div className="container mx-auto px-4 mt-4">
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
      )}
    </div>
  );
};

export default UnifiedNavigationBar;