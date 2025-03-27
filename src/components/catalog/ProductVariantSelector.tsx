import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Product, ProductAttributes } from "@/types/catalog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Package } from "lucide-react";
import { findVariantByAttributes } from "@/services/catalogService";
import { findVariantCombinationPrice } from "@/services/variantService";
import VariantSelector from "@/components/product-detail/VariantSelector";
import ProductPriceDisplay from "@/components/product-detail/ProductPriceDisplay";
import ProductImageDisplay from "@/components/product-detail/ProductImageDisplay";
import CO2SavingsCalculator from "@/components/product-detail/CO2SavingsCalculator";

interface ProductVariantSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant: (product: Product) => void;
}

const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  product,
  isOpen,
  onClose,
  onSelectVariant
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Product | null>(null);
  const [hasOptions, setHasOptions] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedOptions({});
    setCurrentPrice(null);
    setSelectedVariant(null);
    setQuantity(1);

    const hasVariationAttributes = product.variation_attributes && 
      Object.keys(product.variation_attributes).length > 0;
    
    const hasVariantPrices = product.variant_combination_prices && 
      product.variant_combination_prices.length > 0;

    setHasVariants(hasVariationAttributes || hasVariantPrices);
    setHasOptions(hasVariationAttributes);
  }, [product]);

  useEffect(() => {
    const updateSelectedVariant = async () => {
      if (!product || !product.id || Object.keys(selectedOptions).length === 0) {
        setCurrentPrice(null);
        setSelectedVariant(null);
        return;
      }

      try {
        const selectedAttrs: ProductAttributes = selectedOptions;

        if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
          const price = await findVariantCombinationPrice(product.id, selectedAttrs);
          if (price) {
            setCurrentPrice(price.monthly_price || price.price);
            
            const variant: Product = {
              ...product,
              price: price.price,
              monthly_price: price.monthly_price || 0,
              selected_attributes: selectedAttrs,
            };
            
            setSelectedVariant(variant);
            return;
          }
        }
        
        const variant = await findVariantByAttributes(product.id, selectedAttrs);
        if (variant) {
          setCurrentPrice(variant.monthly_price);
          setSelectedVariant(variant);
        } else {
          setCurrentPrice(null);
          setSelectedVariant(null);
        }
      } catch (error) {
        console.error("Error finding variant:", error);
        setCurrentPrice(null);
        setSelectedVariant(null);
      }
    };

    if (Object.keys(selectedOptions).length > 0) {
      updateSelectedVariant();
    }
  }, [selectedOptions, product]);

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  const isOptionAvailable = (optionName: string, value: string): boolean => {
    return true;
  };

  const handleSelectVariant = () => {
    if (selectedVariant) {
      onSelectVariant(selectedVariant);
    } else if (Object.keys(selectedOptions).length > 0) {
      const modifiedProduct: Product = {
        ...product,
        selected_attributes: selectedOptions
      };
      onSelectVariant(modifiedProduct);
    } else {
      onSelectVariant(product);
    }
  };

  const getMinimumPrice = (): number => {
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return Math.min(...product.variant_combination_prices.map(p => p.monthly_price || p.price));
    }
    return product.monthly_price || 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 border-b flex items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-2" 
            onClick={onClose}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <DialogTitle className="text-xl font-semibold text-blue-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {product.name}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <ProductImageDisplay 
                imageUrl={product.image_url || "/placeholder.svg"} 
                altText={product.name} 
              />
              
              {product.category && (
                <div className="mt-4">
                  <CO2SavingsCalculator 
                    category={product.category} 
                    quantity={quantity} 
                  />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{product.brand} {product.name}</h2>
              
              {product.description && (
                <p className="text-gray-600 mb-4">{product.description}</p>
              )}
              
              <ProductPriceDisplay 
                currentPrice={currentPrice}
                minimumPrice={getMinimumPrice()}
              />
              
              {hasVariants && (
                <VariantSelector
                  variationAttributes={product.variation_attributes || {}}
                  selectedOptions={selectedOptions}
                  onOptionChange={handleOptionChange}
                  isOptionAvailable={isOptionAvailable}
                  hasVariants={hasVariants}
                  hasOptions={hasOptions}
                />
              )}
              
              <div className="mt-8">
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={handleSelectVariant}
                >
                  Sélectionner
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProductVariantSelector;
