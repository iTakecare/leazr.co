import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useProductById } from "@/hooks/products/useProductById";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import ProductImageGallery from "@/components/product-detail/ProductImageGallery";
import ProductInfo from "@/components/product-detail/ProductInfo";
import ProductPricing from "@/components/ui/product/ProductPricing";
import QuantitySelector from "@/components/product-detail/QuantitySelector";
import PriceBox from "@/components/product-detail/PriceBox";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, PackageCheck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import ProductPriceDisplay from "@/components/product-detail/ProductPriceDisplay";
import ProductVariantSelector from "@/components/catalog/ProductVariantSelector";
import { useCart } from "@/context/CartContext";
import AddToCartButton from "@/components/cart/AddToCartButton";

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const { product, isLoading, error } = useProductById(productId);
  const [quantity, setQuantity] = useState(1);
  const [duration, setDuration] = useState(36);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentVariant, setCurrentVariant] = useState<Product | null>(null);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    if (product && product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      setShowVariantSelector(true);
    }
  }, [product]);

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(newQuantity);
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
  };

  const handleOptionSelect = (optionName: string, optionValue: string) => {
    setSelectedOptions(prev => ({ ...prev, [optionName]: optionValue }));
  };

  const handleVariantSelect = (variant: Product) => {
    setCurrentVariant(variant);
    setShowVariantSelector(false);
  };

  const handleRequestOffer = () => {
    alert('Demande envoyée !');
  };

  const minimumPrice = product?.variant_combination_prices && product.variant_combination_prices.length > 0
    ? Math.min(...product.variant_combination_prices.map(v => v.monthly_price || Infinity))
    : product?.monthly_price || 0;

  const currentPrice = currentVariant?.monthly_price || product?.monthly_price || null;
  const totalPrice = (currentPrice || minimumPrice) * quantity;

  const handleAddToCart = () => {
    if (product) {
      const productToAdd = currentVariant || product;
      addToCart(productToAdd, quantity, selectedOptions);
    }
  };

  if (isLoading) {
    return <div>Chargement du produit...</div>;
  }

  if (error || !product) {
    return <div>Erreur lors du chargement du produit.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/catalogue" className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au catalogue
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProductImageGallery product={product} />

        <div>
          <ProductInfo product={product} />

          <div className="mb-4">
            <ProductPriceDisplay currentPrice={currentPrice} minimumPrice={minimumPrice} />
          </div>

          <QuantitySelector quantity={quantity} onQuantityChange={handleQuantityChange} />

          <div className="mt-6">
            <PriceBox
              totalPrice={totalPrice}
              duration={duration}
              onRequestOffer={handleRequestOffer}
              product={currentVariant || product}
              selectedAttributes={selectedOptions}
              quantity={quantity}
            />
            <AddToCartButton product={currentVariant || product} quantity={quantity} selectedAttributes={selectedOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
