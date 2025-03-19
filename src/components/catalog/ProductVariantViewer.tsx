
import React, { useState, useEffect } from "react";
import { 
  Product,
  ProductAttributes,
  VariantCombinationPrice 
} from "@/types/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Euro, Package } from "lucide-react";
import VariantAttributeSelector from "./VariantAttributeSelector";
import { findVariantCombinationPrice } from "@/services/variantPriceService";

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
  const [isLoading, setIsLoading] = useState(false);
  
  const hasVariationAttributes = 
    product.variation_attributes && 
    Object.keys(product.variation_attributes).length > 0;
  
  useEffect(() => {
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      // Initialize with the first price's attributes
      setSelectedAttributes(product.variant_combination_prices[0].attributes);
      setSelectedPrice(product.variant_combination_prices[0]);
      
      if (onVariantSelect) {
        onVariantSelect(product.variant_combination_prices[0]);
      }
    } else {
      setSelectedAttributes({});
      setSelectedPrice(null);
      
      if (onVariantSelect) {
        onVariantSelect(null);
      }
    }
  }, [product.variant_combination_prices]);
  
  // Handle attribute selection
  const handleAttributesChange = async (attributes: ProductAttributes) => {
    setSelectedAttributes(attributes);
    setIsLoading(true);
    
    try {
      // Find the corresponding price
      const priceMatch = await findVariantCombinationPrice(product.id, attributes);
      
      setSelectedPrice(priceMatch);
      
      if (onVariantSelect) {
        onVariantSelect(priceMatch);
      }
    } catch (error) {
      console.error("Error finding variant price:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // If there are no variation attributes, show a message
  if (!hasVariationAttributes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Configuration des variantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Ce produit n'a pas d'attributs de variante définis.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Configuration des variantes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Sélectionner les attributs</h3>
            
            <VariantAttributeSelector
              variationAttributes={product.variation_attributes || {}}
              initialSelectedAttributes={selectedAttributes}
              onAttributesChange={handleAttributesChange}
            />
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-4">Informations de prix</h3>
            
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : selectedPrice ? (
              <div className="space-y-4 p-4 border rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Prix</p>
                    <p className="text-2xl font-semibold flex items-center">
                      {selectedPrice.price.toFixed(2)} <Euro className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                  
                  {selectedPrice.monthly_price !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Mensualité</p>
                      <p className="text-lg flex items-center">
                        {selectedPrice.monthly_price.toFixed(2)} <Euro className="h-3 w-3 ml-1" />/mois
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedPrice.stock !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Stock disponible</p>
                    <p className="text-lg">
                      {selectedPrice.stock} unités
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 border rounded-md">
                <p className="text-muted-foreground">
                  Aucun prix trouvé pour cette combinaison d'attributs
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductVariantViewer;
