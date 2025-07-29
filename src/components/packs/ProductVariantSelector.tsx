import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useProductVariants } from "@/hooks/products/useProductVariants";
import { Product, ProductVariationAttributes } from "@/types/catalog";

interface ProductVariantSelectorProps {
  product: Product;
  selectedOptions: Record<string, string>;
  onOptionChange: (optionName: string, value: string) => void;
  onVariantSelect: (variantId?: string, price?: number, monthlyPrice?: number) => void;
}

export const ProductVariantSelector = ({
  product,
  selectedOptions,
  onOptionChange,
  onVariantSelect,
}: ProductVariantSelectorProps) => {
  const { data: variants = [], isLoading } = useProductVariants(product.id);
  const [variationAttributes, setVariationAttributes] = useState<ProductVariationAttributes>({});

  useEffect(() => {
    if (variants.length > 0) {
      // Extract variation attributes from variants
      const attributes: ProductVariationAttributes = {};
      
      variants.forEach(variant => {
        Object.entries(variant.attributes || {}).forEach(([key, value]) => {
          if (!attributes[key]) {
            attributes[key] = [];
          }
          if (!attributes[key].includes(String(value))) {
            attributes[key].push(String(value));
          }
        });
      });
      
      setVariationAttributes(attributes);
    }
  }, [variants]);

  const isOptionAvailable = (optionName: string, value: string): boolean => {
    // Check if this combination exists in variants
    const testOptions = { ...selectedOptions, [optionName]: value };
    return variants.some(variant => {
      return Object.entries(testOptions).every(([key, val]) => 
        variant.attributes?.[key] === val
      );
    });
  };

  const getSelectedVariant = () => {
    if (Object.keys(selectedOptions).length === 0) return null;
    
    return variants.find(variant => {
      return Object.entries(selectedOptions).every(([key, value]) => 
        variant.attributes?.[key] === value
      );
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  const selectedVariant = getSelectedVariant();

  useEffect(() => {
    if (selectedVariant) {
      onVariantSelect(
        selectedVariant.id,
        selectedVariant.price,
        selectedVariant.monthly_price
      );
    } else if (Object.keys(selectedOptions).length === 0) {
      // No variant selected, use base product prices
      onVariantSelect(undefined, product.price, product.monthly_price);
    }
  }, [selectedVariant, selectedOptions, onVariantSelect, product.price, product.monthly_price]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-muted rounded"></div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Produit sans variantes
      </div>
    );
  }

  const getGroupedAttributes = () => {
    const priority = ['RAM', 'Stockage', 'Couleur', 'Taille', 'Capacity'];
    const grouped = Object.entries(variationAttributes);
    
    return grouped.sort(([a], [b]) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };

  return (
    <div className="space-y-4">
      {getGroupedAttributes().map(([attributeName, values]) => (
        <div key={attributeName} className="space-y-2">
          <Label className="text-sm font-medium">
            {attributeName}
          </Label>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => {
              const isSelected = selectedOptions[attributeName] === value;
              const isAvailable = isOptionAvailable(attributeName, value);
              
              return (
                <Button
                  key={value}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  disabled={!isAvailable}
                  onClick={() => onOptionChange(attributeName, value)}
                  className={`${!isAvailable ? 'opacity-50' : ''}`}
                >
                  {value}
                </Button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedVariant && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">Variante sélectionnée</p>
                <div className="flex gap-1 flex-wrap mt-1">
                  {Object.entries(selectedOptions).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Prix unitaire</p>
                <p className="font-semibold">{formatPrice(selectedVariant.price || 0)}</p>
                {selectedVariant.monthly_price && (
                  <>
                    <p className="text-xs text-muted-foreground">Mensualité</p>
                    <p className="text-sm font-medium">{formatPrice(selectedVariant.monthly_price)}</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};