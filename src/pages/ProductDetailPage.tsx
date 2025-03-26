
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import PublicHeader from "@/components/catalog/public/PublicHeader";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import { useProductDetails } from "@/hooks/products/useProductDetails";

// Import refactored components
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import ProductBadges from "@/components/product-detail/ProductBadges";
import ProductPriceDisplay from "@/components/product-detail/ProductPriceDisplay";
import QuantitySelector from "@/components/product-detail/QuantitySelector";
import VariantSelector from "@/components/product-detail/VariantSelector";
import PriceBox from "@/components/product-detail/PriceBox";
import ProductSpecificationsTable from "@/components/product-detail/ProductSpecificationsTable";

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Use the product details hook
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
  } = useProductDetails(id);
  
  // Navigation
  const handleBackToCatalog = () => {
    navigate("/catalogue");
  };
  
  // Form handling
  const handleRequestProduct = () => {
    setIsRequestFormOpen(true);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 animate-pulse rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PublicHeader />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <p className="text-gray-600 mb-8">Impossible de trouver les détails de ce produit.</p>
          <Button onClick={handleBackToCatalog}>
            Retour au catalogue
          </Button>
        </div>
      </div>
    );
  }
  
  // Debug variant information
  console.log("Product variation attributes:", product.variation_attributes);
  console.log("Has options:", hasOptions);
  console.log("Has variants:", hasVariants);
  console.log("Selected options:", selectedOptions);
  console.log("Selected variant:", selectedVariant);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-2 mb-6">
          <Button variant="ghost" size="sm" onClick={handleBackToCatalog} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au catalogue
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <ProductImageDisplay imageUrl={currentImage} altText={product.name} />
          
          {/* Product Info */}
          <div>
            <div className="mb-2">
              <ProductBadges category={product.category} brand={product.brand} />
            </div>
            
            <h1 className="text-3xl font-bold mb-2">
              {product.name}
            </h1>
            
            <ProductPriceDisplay currentPrice={currentPrice} minimumPrice={minMonthlyPrice} />
            
            <div className="mb-4">
              <p className="text-gray-600">
                {product.description || "Cet appareil est disponible à la location pour votre entreprise. Configurez-le selon vos besoins et demandez une offre personnalisée."}
              </p>
            </div>
            
            <Separator className="my-4" />
            
            {/* Configuration Options */}
            <div className="mb-6">
              <h3 className="text-xl font-medium mb-4">Configuration</h3>
              
              <div className="bg-gray-50 p-6 rounded-lg border space-y-6">
                {/* Variant selector */}
                <VariantSelector 
                  variationAttributes={product.variation_attributes || {}}
                  selectedOptions={selectedOptions}
                  onOptionChange={handleOptionChange}
                  isOptionAvailable={isOptionAvailable}
                  hasVariants={hasVariants}
                  hasOptions={hasOptions}
                />
                
                {/* Quantity Selector */}
                <QuantitySelector 
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
                />
              </div>
            </div>
            
            {/* Price Box */}
            <PriceBox 
              totalPrice={totalPrice}
              onRequestOffer={handleRequestProduct}
            />
            
            {/* Specifications */}
            <ProductSpecificationsTable specifications={specifications} />
          </div>
        </div>
      </div>
      
      <ProductRequestForm 
        isOpen={isRequestFormOpen}
        onClose={() => setIsRequestFormOpen(false)}
        product={selectedVariant || product}
        quantity={quantity}
        selectedOptions={selectedOptions}
        duration={duration}
        monthlyPrice={totalPrice}
      />
    </div>
  );
};

export default ProductDetailPage;
