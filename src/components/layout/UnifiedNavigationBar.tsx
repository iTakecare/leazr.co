import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
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
      {/* Single integrated navigation bar */}
      {showFilters && filters && updateFilter && resetFilters && categories && (
        <div className="container mx-auto px-4">
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
      )}
    </div>
  );
};

export default UnifiedNavigationBar;