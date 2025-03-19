
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Product, 
  ProductAttributes, 
  VariantCombinationPrice 
} from "@/types/catalog";
import { findVariantCombinationPrice } from "@/services/variantPriceService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Check,
  Info,
  ShoppingCart,
  AlertCircle
} from "lucide-react";
import VariantAttributeSelector from "./VariantAttributeSelector";

interface ProductVariantViewerProps {
  product: Product;
  onVariantSelect?: (price: VariantCombinationPrice | null) => void;
}

const ProductVariantViewer: React.FC<ProductVariantViewerProps> = ({ 
  product,
  onVariantSelect
}) => {
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>({});
  const [selectedPrice, setSelectedPrice] = useState<VariantCombinationPrice | null>(null);
  
  // Ensure we have variation attributes
  const variationAttributes = product.variation_attributes || {};
  
  // Find variant price query
  const variantPriceQuery = useQuery({
    queryKey: ["variant-price", product.id, selectedAttributes],
    queryFn: () => {
      if (Object.keys(selectedAttributes).length === 0) return null;
      return findVariantCombinationPrice(product.id, selectedAttributes);
    },
    enabled: !!product.id && Object.keys(selectedAttributes).length > 0,
  });
  
  // Reset selected attributes when product changes
  useEffect(() => {
    setSelectedAttributes({});
    setSelectedPrice(null);
  }, [product.id]);
  
  // Update selected price when query result changes
  useEffect(() => {
    if (variantPriceQuery.data) {
      setSelectedPrice(variantPriceQuery.data);
      
      if (onVariantSelect) {
        onVariantSelect(variantPriceQuery.data);
      }
    } else if (variantPriceQuery.isSuccess) {
      setSelectedPrice(null);
      
      if (onVariantSelect) {
        onVariantSelect(null);
      }
    }
  }, [variantPriceQuery.data, variantPriceQuery.isSuccess, onVariantSelect]);
  
  // Handle attribute change
  const handleAttributeChange = (attributes: ProductAttributes) => {
    setSelectedAttributes(attributes);
  };
  
  // Check if all required attributes are selected
  const hasAllRequiredAttributes = Object.keys(variationAttributes).every(
    attrName => selectedAttributes[attrName]
  );
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuration du produit</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(variationAttributes).length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            Ce produit n'a pas d'attributs de variante configurés.
          </div>
        ) : (
          <div className="space-y-6">
            <VariantAttributeSelector
              variationAttributes={variationAttributes}
              initialSelectedAttributes={selectedAttributes}
              onAttributesChange={handleAttributeChange}
            />
            
            {hasAllRequiredAttributes && (
              <div className="mt-6 space-y-4">
                {variantPriceQuery.isLoading ? (
                  <div className="text-center p-4">
                    <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full inline-block"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Recherche de la configuration...</p>
                  </div>
                ) : selectedPrice ? (
                  <div className="bg-muted p-4 rounded-md space-y-3">
                    <div className="flex items-center text-green-600 gap-2">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Configuration disponible</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Prix</p>
                        <p className="text-xl font-bold">{selectedPrice.price.toFixed(2)} €</p>
                      </div>
                      
                      {selectedPrice.monthly_price && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Mensualité</p>
                          <p className="text-lg">{selectedPrice.monthly_price.toFixed(2)} €/mois</p>
                        </div>
                      )}
                    </div>
                    
                    {selectedPrice.stock !== undefined && (
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        {selectedPrice.stock > 0 ? (
                          <span>En stock: {selectedPrice.stock} disponible(s)</span>
                        ) : (
                          <Badge variant="destructive">Épuisé</Badge>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded-md">
                    <div className="flex items-center text-amber-600 gap-2">
                      <AlertCircle className="h-5 w-5" />
                      <span className="font-medium">Configuration non disponible</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Cette combinaison d'attributs n'est pas disponible. Veuillez essayer une autre configuration.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {!hasAllRequiredAttributes && Object.keys(selectedAttributes).length > 0 && (
              <div className="bg-muted p-4 rounded-md">
                <div className="flex items-center text-blue-600 gap-2">
                  <Info className="h-5 w-5" />
                  <span className="font-medium">Sélection en cours</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Veuillez sélectionner tous les attributs pour voir la disponibilité et le prix.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductVariantViewer;
