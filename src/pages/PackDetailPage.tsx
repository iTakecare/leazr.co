import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/ui/page-transition";
import { useCompanyDetection } from "@/hooks/useCompanyDetection";
import { usePackDetails } from "@/hooks/packs/usePackDetails";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductLoadingState from "@/components/product-detail/ProductLoadingState";
import ProductErrorState from "@/components/product-detail/ProductErrorState";
import SimpleHeader from "@/components/catalog/public/SimpleHeader";
import PackMainContent from "@/components/pack-detail/PackMainContent";
import PackConfigurationSection from "@/components/pack-detail/PackConfigurationSection";
import PackRequestForm from "@/components/pack-detail/PackRequestForm";

const PackDetailPage: React.FC = () => {
  const { packId } = useParams<{ packId: string }>();
  const navigate = useNavigate();
  const { companyId, companySlug } = useCompanyDetection();

  // Fetch company details for header
  const { data: companyDetails } = useQuery({
    queryKey: ['company-details', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', companyId)
        .single();
      return data;
    },
    enabled: !!companyId
  });

  // Use pack details hook
  const {
    pack,
    isLoading,
    error,
    quantity,
    handleQuantityChange,
    isRequestFormOpen,
    setIsRequestFormOpen,
    currentPrice,
    totalPrice,
    hasActivePromo,
    promoSavingsPercentage
  } = usePackDetails(packId);

  // Navigation handlers
  const handleBackToCatalog = () => {
    if (companySlug) {
      navigate(`/${companySlug}/catalog`);
    } else {
      navigate('/catalog');
    }
  };

  // Handle request quote
  const handleRequestQuote = () => {
    setIsRequestFormOpen(true);
  };

  // Loading state
  if (isLoading) {
    return <ProductLoadingState />;
  }

  // Error state
  if (error || !pack) {
    return (
      <ProductErrorState 
        onBackToCatalog={handleBackToCatalog}
        companyId={companyId}
        companyLogo={companyDetails?.logo_url}
        companyName={companyDetails?.name}
      />
    );
  }

  const catalogBaseUrl = companySlug ? `/${companySlug}` : '';

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <SimpleHeader 
          companyId={companyId}
          companyLogo={companyDetails?.logo_url}
          companyName={companyDetails?.name}
        />

        {/* Back button */}
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={handleBackToCatalog}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au catalogue
          </Button>

          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
            <button
              onClick={handleBackToCatalog}
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Catalogue
            </button>
            <span>/</span>
            <span>Packs</span>
            <span>/</span>
            <span className="text-foreground font-medium truncate">
              {pack.name}
            </span>
          </nav>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column - Pack content */}
            <div>
              <PackMainContent pack={pack} />
            </div>

            {/* Right column - Configuration */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <PackConfigurationSection
                pack={pack}
                quantity={quantity}
                onQuantityChange={handleQuantityChange}
                currentPrice={currentPrice}
                totalPrice={totalPrice}
                hasActivePromo={hasActivePromo}
                promoSavingsPercentage={promoSavingsPercentage}
                onRequestQuote={handleRequestQuote}
              />
            </div>
          </div>
        </div>

        {/* Request Form Modal */}
        {isRequestFormOpen && pack && (
          <PackRequestForm
            isOpen={isRequestFormOpen}
            onClose={() => setIsRequestFormOpen(false)}
            pack={pack}
            quantity={quantity}
            monthlyPrice={totalPrice}
            companySlug={companySlug}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default PackDetailPage;