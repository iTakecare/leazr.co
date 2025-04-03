import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import { Check, ChevronRight } from "lucide-react";
import CO2SavingsCalculator from "@/components/product-detail/CO2SavingsCalculator";
import { useAuth } from "@/context/AuthContext";

interface VariantSelectorProps {
  product: any;
  onVariantSelect: (variant: any) => void;
}

const VariantSelector: React.FC<VariantSelectorProps> = ({ product, onVariantSelect }) => {
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [availableOptions, setAvailableOptions] = useState<Record<string, string[]>>({});
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const { isAdmin } = useAuth();
  
  useEffect(() => {
    if (!product) return;
    
    const variationAttrs = product.variation_attributes || {};
    setAvailableOptions(variationAttrs);
    
    const initialSelection: Record<string, string> = {};
    Object.entries(variationAttrs).forEach(([attrName, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        initialSelection[attrName] = values[0];
      }
    });
    
    setSelectedAttributes(initialSelection);
  }, [product]);
  
  useEffect(() => {
    if (!product || !product.variant_combination_prices || Object.keys(selectedAttributes).length === 0) {
      return;
    }
    
    const matchingVariant = product.variant_combination_prices.find((variant: any) => {
      if (!variant.attributes) return false;
      
      return Object.entries(selectedAttributes).every(([key, value]) => 
        String(variant.attributes[key]) === String(value)
      );
    });
    
    setSelectedVariant(matchingVariant);
  }, [selectedAttributes, product]);
  
  const isOptionAvailable = (attributeName: string, value: string): boolean => {
    if (!product || !product.variant_combination_prices) return false;
    
    const otherSelections = { ...selectedAttributes };
    delete otherSelections[attributeName];
    
    return product.variant_combination_prices.some((variant: any) => {
      if (!variant.attributes) return false;
      
      if (String(variant.attributes[attributeName]) !== String(value)) return false;
      
      return Object.entries(otherSelections).every(([key, val]) => 
        String(variant.attributes[key]) === String(val)
      );
    });
  };
  
  const handleSelectAttribute = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  
  const handleConfirmSelection = () => {
    if (selectedVariant) {
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
  
  const shouldShowPurchasePrice = isAdmin();
  
  if (!product || !product.variation_attributes || Object.keys(product.variation_attributes).length === 0) {
    return null;
  }
  
  const hasVariants = product.variant_combination_prices && product.variant_combination_prices.length > 0;
  
  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-gray-900">
          Sélectionner une configuration pour {product.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(availableOptions).map(([attributeName, options]) => (
            <div key={attributeName} className="space-y-3">
              <h3 className="text-md font-semibold text-gray-800">
                {attributeName}
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(options) && options.map((option) => {
                  const isAvailable = isOptionAvailable(attributeName, option);
                  const isSelected = selectedAttributes[attributeName] === option;
                  
                  return (
                    <Button
                      key={`${attributeName}-${option}`}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`relative rounded-full px-4 py-2 transition-all ${
                        isSelected ? "bg-primary text-white" : "bg-white"
                      } ${!isAvailable ? "opacity-40" : ""}`}
                      disabled={!isAvailable}
                      onClick={() => handleSelectAttribute(attributeName, option)}
                    >
                      {isSelected && (
                        <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                      <span className={isSelected ? "pl-2" : ""}>
                        {String(option)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
          
          {selectedVariant ? (
            <div className="mt-6 rounded-xl bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-md font-medium text-gray-900">Configuration sélectionnée</h3>
                <div className="flex gap-1">
                  {Object.entries(selectedVariant.attributes || {}).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="rounded-full bg-blue-100 text-blue-800 text-xs px-2 py-1">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="mb-4 grid grid-cols-2 gap-6">
                {shouldShowPurchasePrice && selectedVariant.price > 0 && (
                  <div className="rounded-lg bg-white p-3 shadow-sm">
                    <p className="text-sm text-gray-500">Prix</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(selectedVariant.price)}</p>
                  </div>
                )}
                {selectedVariant.monthly_price > 0 && (
                  <div className={`rounded-lg bg-white p-3 shadow-sm ${!shouldShowPurchasePrice ? 'col-span-2' : ''}`}>
                    <p className="text-sm text-gray-500">Mensualité</p>
                    <p className="text-xl font-bold text-indigo-700">{formatCurrency(selectedVariant.monthly_price)}/mois</p>
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full gap-2 justify-center items-center bg-indigo-600 hover:bg-indigo-700 transition-colors" 
                onClick={handleConfirmSelection}
              >
                Sélectionner cette configuration
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-amber-800">
                {hasVariants 
                  ? "Veuillez sélectionner une configuration valide"
                  : "Aucune configuration disponible pour ce produit"}
              </p>
            </div>
          )}
          
          {product.category && (
            <CO2SavingsCalculator 
              category={product.category} 
              quantity={1}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default VariantSelector;
