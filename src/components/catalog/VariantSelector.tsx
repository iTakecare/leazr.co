
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";

interface VariantSelectorProps {
  product: any;
  onVariantSelect: (variant: any) => void;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({ product, onVariantSelect }) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [availableOptions, setAvailableOptions] = useState<Record<string, string[]>>({});
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  
  // Initialize available options from product variation attributes
  useEffect(() => {
    if (!product) return;
    
    // Get variation attributes
    const variationAttrs = product.variation_attributes || {};
    setAvailableOptions(variationAttrs);
    
    // Set initial selected attributes (first option for each attribute)
    const initialSelection: Record<string, string> = {};
    Object.entries(variationAttrs).forEach(([attrName, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        initialSelection[attrName] = values[0];
      }
    });
    
    setSelectedAttributes(initialSelection);
  }, [product]);
  
  // Find matching variant when attributes change
  useEffect(() => {
    if (!product || !product.variant_combination_prices || Object.keys(selectedAttributes).length === 0) {
      return;
    }
    
    // Find a variant that matches all selected attributes
    const matchingVariant = product.variant_combination_prices.find((variant: any) => {
      if (!variant.attributes) return false;
      
      return Object.entries(selectedAttributes).every(([key, value]) => 
        String(variant.attributes[key]) === String(value)
      );
    });
    
    setSelectedVariant(matchingVariant);
  }, [selectedAttributes, product]);
  
  // Check if a specific option is available with current selections
  const isOptionAvailable = (attributeName: string, value: string): boolean => {
    if (!product || !product.variant_combination_prices) return false;
    
    // Get current selections excluding the attribute we're checking
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attributeName];
    
    // Check if any variant matches this option and all other selected attributes
    return product.variant_combination_prices.some((variant: any) => {
      if (!variant.attributes) return false;
      
      // First check if the variant has the attribute value we're looking for
      if (String(variant.attributes[attributeName]) !== String(value)) return false;
      
      // Then check if the variant matches all other selected attributes
      return Object.entries(otherSelections).every(([key, val]) => 
        String(variant.attributes[key]) === String(val)
      );
    });
  };
  
  // Handle attribute change
  const handleSelectAttribute = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  
  // Confirm variant selection
  const handleConfirmSelection = () => {
    if (selectedVariant) {
      // Create a composite product with variant info
      const productWithVariant = {
        ...product,
        price: selectedVariant.price,
        monthly_price: selectedVariant.monthly_price,
        attributes: selectedVariant.attributes,
        selected_variant_id: selectedVariant.id
      };
      
      onVariantSelect(productWithVariant);
    }
  };
  
  // If no variation attributes, return null
  if (!product || !product.variation_attributes || Object.keys(product.variation_attributes).length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sélectionner une variante</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Attribute Selection */}
          {Object.entries(availableOptions).map(([attributeName, options]) => (
            <div key={attributeName} className="space-y-2">
              <h3 className="text-sm font-medium">{attributeName}</h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(options) && options.map((option) => {
                  const isAvailable = isOptionAvailable(attributeName, option);
                  const isSelected = selectedAttributes[attributeName] === option;
                  
                  return (
                    <Button
                      key={`${attributeName}-${option}`}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={!isAvailable ? "opacity-50" : ""}
                      disabled={!isAvailable}
                      onClick={() => handleSelectAttribute(attributeName, option)}
                    >
                      {String(option)}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Selected Variant Information */}
          {selectedVariant ? (
            <div className="mt-4 p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium mb-2">Variante sélectionnée</h3>
              
              <div className="flex flex-wrap gap-1 mb-3">
                {Object.entries(selectedVariant.attributes || {}).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Prix</p>
                  <p className="text-lg font-semibold">{formatCurrency(selectedVariant.price)}</p>
                </div>
                {selectedVariant.monthly_price > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Mensualité</p>
                    <p className="text-lg font-semibold">{formatCurrency(selectedVariant.monthly_price)}/mois</p>
                  </div>
                )}
              </div>
              
              <Button className="w-full" onClick={handleConfirmSelection}>
                Sélectionner cette variante
              </Button>
            </div>
          ) : (
            <div className="mt-4 p-4 border rounded-md bg-gray-50 text-center text-muted-foreground">
              Aucune variante disponible pour cette combinaison d'attributs
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VariantSelector;
