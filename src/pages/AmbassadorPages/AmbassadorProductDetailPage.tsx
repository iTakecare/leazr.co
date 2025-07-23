import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useProductDetails } from "@/hooks/products/useProductDetails";
import { useAttributeHelpers } from "@/components/product-detail/ProductAttributeHelpers";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import ProductMainContent from "@/components/product-detail/ProductMainContent";
import ProductConfigurationSection from "@/components/product-detail/ProductConfigurationSection";


const AmbassadorProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { companyId } = useMultiTenant();

  // Extract product ID from the slug format (id-name)
  const productId = id?.split('-')[0];

  const {
    product,
    isLoading,
    error,
    quantity,
    handleQuantityChange,
    isRequestFormOpen,
    setIsRequestFormOpen,
    selectedOptions,
    handleOptionChange,
    isOptionAvailable,
    currentImage,
    currentPrice,
    selectedVariant,
    duration,
    totalPrice,
    minMonthlyPrice,
    specifications,
    hasVariants,
    hasOptions,
    variationAttributes,
    hasAttributeOptions,
    getOptionsForAttribute,
    availableDurations
  } = useProductDetails(productId);

  const {
    getDisplayName,
    getCanonicalName,
    getConfigAttributes,
    getCurrentValue
  } = useAttributeHelpers(specifications, variationAttributes, selectedOptions);

  const handleBackToCatalog = () => {
    navigate("/ambassador/products");
  };

  // Loading state
  if (isLoading) {
    return (
      <PageTransition>
        <Container className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-4 bg-muted rounded w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-muted rounded" />
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-24" />
                <div className="h-8 bg-muted rounded w-32" />
                <div className="h-4 bg-muted rounded w-16" />
                <div className="h-20 bg-muted rounded" />
              </div>
            </div>
          </div>
        </Container>
      </PageTransition>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <PageTransition>
        <Container className="py-8">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Produit non trouvé</h2>
            <p className="text-muted-foreground">
              Le produit demandé n'existe pas ou n'est plus disponible.
            </p>
            <Button onClick={handleBackToCatalog}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au catalogue
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }

  const productName = product.name || "";
  const productDescription = product.description || "";
  const productBrand = product.brand || "";

  // Build breadcrumbs
  const breadcrumbs = [
    { label: "Catalogue Ambassador", href: "/ambassador/products" },
    { label: productName, href: "" }
  ];

  return (
    <PageTransition>
      <Container className="py-8 max-w-[1400px]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToCatalog}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour au catalogue
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Product Info */}
          <div>
            <ProductMainContent
              product={product}
              productName={productName}
              productDescription={productDescription}
              currentImage={currentImage}
              productBrand={productBrand}
            />
          </div>

          {/* Right Column - Configuration */}
          <div>
            <ProductConfigurationSection
              product={product}
              productCategory={product.category || ""}
              productName={productName}
              productBrand={productBrand}
              currentPrice={currentPrice}
              minMonthlyPrice={minMonthlyPrice}
              totalPrice={totalPrice}
              quantity={quantity}
              duration={duration}
              handleQuantityChange={handleQuantityChange}
              selectedOptions={selectedOptions}
              handleOptionChange={handleOptionChange}
              isOptionAvailable={isOptionAvailable}
              variationAttributes={variationAttributes}
              specifications={specifications}
              hasAttributeOptions={hasAttributeOptions}
              getOptionsForAttribute={getOptionsForAttribute}
              configAttributes={getConfigAttributes()}
              getCurrentValue={getCurrentValue}
              getDisplayName={getDisplayName}
            />
          </div>
        </div>
      </Container>
    </PageTransition>
  );
};

export default AmbassadorProductDetailPage;