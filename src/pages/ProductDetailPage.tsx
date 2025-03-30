
import React from 'react';
import { useParams } from 'react-router-dom';
import { useProductDetails } from '@/hooks/products/useProductDetails';
import ProductImageDisplay from '@/components/product-detail/ProductImageDisplay';
import ProductPriceDisplay from '@/components/product-detail/ProductPriceDisplay';
import VariantSelector from '@/components/product-detail/VariantSelector';
import ProductDescription from '@/components/product-detail/ProductDescription';
import ProductSpecificationsTable from '@/components/product-detail/ProductSpecificationsTable';
import RelatedProducts from '@/components/product-detail/RelatedProducts';
import CustomerReviews from '@/components/product-detail/CustomerReviews';
import OrderProcess from '@/components/product-detail/OrderProcess';
import QuantitySelector from '@/components/product-detail/QuantitySelector';
import CO2SavingsCalculator from '@/components/product-detail/CO2SavingsCalculator';
import ProductBenefits from '@/components/product-detail/ProductBenefits';
import ProductIncludedServices from '@/components/product-detail/ProductIncludedServices';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import ProductBadges from '@/components/product-detail/ProductBadges';
import ProductRequestForm from '@/components/catalog/public/ProductRequestForm';
import { toast } from 'sonner';

const ProductDetailPage = () => {
  const { id } = useParams();
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
    setDuration,
    totalPrice,
    minMonthlyPrice,
    specifications,
    hasVariants,
    hasOptions,
    variationAttributes,
    hasAttributeOptions,
    getOptionsForAttribute,
    availableDurations
  } = useProductDetails(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur de chargement</h2>
        <p className="text-gray-600 mb-6">
          Impossible de charger les détails du produit.
        </p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
        <p className="text-gray-600 mb-6">
          Le produit que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <Button onClick={() => window.history.back()}>Retour</Button>
      </div>
    );
  }

  const handleRequestOffer = () => {
    if (!product) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }
    setIsRequestFormOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Product Images */}
        <div className="relative">
          <ProductImageDisplay 
            imageUrl={currentImage || product.image_url || ''} 
            altText={product.name || 'Product image'} 
          />
          <div className="absolute top-4 left-4">
            <ProductBadges 
              category={product.category} 
              brand={product.brand} 
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-lg text-muted-foreground mb-2">
              {product.brand} - {product.category}
            </p>
          </div>

          {/* Variants Section */}
          {hasOptions && (
            <div className="space-y-4">
              {Object.keys(variationAttributes).map(attribute => (
                hasAttributeOptions(attribute) && (
                  <VariantSelector
                    key={attribute}
                    variationAttributes={variationAttributes}
                    selectedOptions={selectedOptions}
                    onOptionChange={handleOptionChange}
                    isOptionAvailable={isOptionAvailable}
                    hasVariants={hasVariants}
                    hasOptions={hasOptions}
                  />
                )
              ))}
            </div>
          )}

          {/* Price Section */}
          <ProductPriceDisplay 
            currentPrice={currentPrice} 
            minimumPrice={minMonthlyPrice}
          />
          
          {/* Duration selector */}
          <div className="space-y-2">
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
              Durée du contrat
            </label>
            <div className="flex flex-wrap gap-2">
              {availableDurations.map(months => (
                <Button
                  key={months}
                  type="button"
                  variant={duration === months ? "default" : "outline"}
                  className="py-1 px-3"
                  onClick={() => setDuration(months)}
                >
                  {months} mois
                </Button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <QuantitySelector 
              quantity={quantity} 
              onQuantityChange={handleQuantityChange}
            />
            
            <Button 
              className="flex-1" 
              size="lg" 
              onClick={handleRequestOffer}
            >
              Demander une offre
            </Button>
          </div>

          {/* Request Form Modal */}
          {isRequestFormOpen && product && (
            <ProductRequestForm
              isOpen={isRequestFormOpen}
              onClose={() => setIsRequestFormOpen(false)}
              product={product}
              quantity={quantity}
              selectedOptions={selectedOptions}
              duration={duration}
              monthlyPrice={totalPrice}
            />
          )}

          <Separator />

          {/* Quick Product Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Marque</span>
              <p className="font-medium">{product.brand}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Catégorie</span>
              <p className="font-medium">{product.category}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Modèle</span>
              <p className="font-medium">{product.model || '-'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Stock</span>
              <p className="font-medium">{product.stock > 0 ? 'Disponible' : 'Sur commande'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <ProductDescription
            title="Description du produit"
            description={product.description} 
          />
          
          {/* Specifications */}
          <ProductSpecificationsTable specifications={specifications} />
        </div>

        <div className="space-y-8">
          {/* Benefits */}
          <ProductBenefits />

          {/* Included Services */}
          <ProductIncludedServices />
          
          {/* CO2 Savings Calculator */}
          <CO2SavingsCalculator 
            category={product.category || ''} 
            quantity={quantity} 
          />
        </div>
      </div>

      {/* Order Process */}
      <OrderProcess />
      
      {/* Related Products */}
      <RelatedProducts category={product.category} currentProductId={product.id} />
      
      {/* Customer Reviews */}
      <CustomerReviews />
    </div>
  );
};

export default ProductDetailPage;
