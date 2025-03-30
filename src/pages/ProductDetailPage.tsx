
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { useProductDetails } from "@/hooks/products/useProductDetails";
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import ProductPriceDisplay from "@/components/product-detail/ProductPriceDisplay";
import ProductDescription from "@/components/product-detail/ProductDescription";
import ProductSpecificationsTable from "@/components/product-detail/ProductSpecificationsTable";
import PriceBox from "@/components/product-detail/PriceBox";
import QuantitySelector from "@/components/product-detail/QuantitySelector";
import VariantSelector from "@/components/product-detail/VariantSelector";
import OrderProcess from "@/components/product-detail/OrderProcess";
import ProductRequestForm from "@/components/catalog/public/ProductRequestForm";
import ProductIncludedServices from "@/components/product-detail/ProductIncludedServices";
import { Loader2 } from "lucide-react";

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
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
  } = useProductDetails(productId);

  useEffect(() => {
    if (product) {
      document.title = `${product.name} | iTakecare`;
    }
  }, [product]);

  if (isLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Chargement du produit...</p>
          </div>
        </Container>
      </PageTransition>
    );
  }

  if (error || !product) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
            <p>Nous n'avons pas trouvé le produit que vous recherchez.</p>
          </div>
        </Container>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Container>
        <div className="py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <ProductImageDisplay imageUrl={currentImage} altText={product.name} />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-gray-600 mb-4">Marque: {product.brand}</p>
              )}

              <ProductPriceDisplay
                currentPrice={currentPrice}
                minimumPrice={minMonthlyPrice}
              />

              {hasOptions && (
                <div className="mt-6 space-y-4">
                  {Object.keys(variationAttributes).map((attributeName) => (
                    hasAttributeOptions(attributeName) && (
                      <VariantSelector
                        key={attributeName}
                        attributeName={attributeName}
                        options={getOptionsForAttribute(attributeName)}
                        selectedValue={selectedOptions[attributeName] || ''}
                        onChange={(value) => handleOptionChange(attributeName, value)}
                        isOptionAvailable={isOptionAvailable}
                      />
                    )
                  ))}
                </div>
              )}

              <div className="mt-6">
                <QuantitySelector
                  quantity={quantity}
                  onQuantityChange={handleQuantityChange}
                />
              </div>

              <PriceBox
                totalPrice={totalPrice}
                duration={duration}
                onRequestOffer={() => setIsRequestFormOpen(true)}
                product={product}
                quantity={quantity}
                selectedOptions={selectedOptions}
              />

              <ProductIncludedServices />

              <OrderProcess />
            </div>
          </div>

          <div className="mt-12">
            <ProductDescription 
              title="Description du produit"
              description={product.description || ''} 
            />
          </div>

          {Object.keys(specifications).length > 0 && (
            <div className="mt-12">
              <ProductSpecificationsTable specifications={specifications} />
            </div>
          )}
        </div>

        <ProductRequestForm
          isOpen={isRequestFormOpen}
          onClose={() => setIsRequestFormOpen(false)}
          product={product}
          quantity={quantity}
          selectedOptions={selectedOptions}
          duration={duration}
          monthlyPrice={totalPrice}
        />
      </Container>
    </PageTransition>
  );
};

export default ProductDetailPage;
