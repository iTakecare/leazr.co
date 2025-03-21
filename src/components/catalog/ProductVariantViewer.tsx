
import React, { useState, useEffect } from "react";
import { 
  Product,
  ProductAttributes,
  VariantCombinationPrice 
} from "@/types/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Euro, Package } from "lucide-react";
import VariantAttributeSelector from "./VariantAttributeSelector";
import { findVariantCombinationPrice } from "@/services/variantPriceService";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";

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
    console.log("Product in variant viewer:", product);
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      console.log("Found variant combination prices:", product.variant_combination_prices);
      // Initialize with the first price's attributes
      setSelectedAttributes(product.variant_combination_prices[0].attributes);
      setSelectedPrice(product.variant_combination_prices[0]);
      
      if (onVariantSelect) {
        onVariantSelect(product.variant_combination_prices[0]);
      }
    } else {
      console.log("No variant combination prices found");
      setSelectedAttributes({});
      setSelectedPrice(null);
      
      if (onVariantSelect) {
        onVariantSelect(null);
      }
    }
  }, [product, onVariantSelect]);
  
  // Handle attribute selection
  const handleAttributesChange = async (attributes: ProductAttributes) => {
    console.log("Selected attributes changed:", attributes);
    setSelectedAttributes(attributes);
    setIsLoading(true);
    
    try {
      // Option 1: Look for a matching price in variant_combination_prices
      if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
        const match = product.variant_combination_prices.find(price => {
          if (!price.attributes) return false;
          
          return Object.keys(attributes).every(key => 
            String(price.attributes[key]).toLowerCase() === String(attributes[key]).toLowerCase()
          );
        });
        
        if (match) {
          console.log("Found matching price in variant_combination_prices:", match);
          setSelectedPrice(match);
          
          if (onVariantSelect) {
            onVariantSelect(match);
          }
          
          setIsLoading(false);
          return;
        }
      }
      
      // Option 2: Fallback to API lookup
      console.log("Searching for variant price via API");
      const priceMatch = await findVariantCombinationPrice(product.id, attributes);
      
      console.log("API price match result:", priceMatch);
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
          <div className="p-6 text-center">
            <p className="text-muted-foreground mb-2">
              Ce produit n'a pas d'attributs de variante définis.
            </p>
            <p className="text-sm text-muted-foreground">
              Pour configurer des variantes, allez dans l'onglet "Variantes et Prix", 
              puis définissez d'abord les attributs dans la section "Attributs de variante".
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
            
            <div className="mb-4">
              <div className="flex flex-wrap gap-1 mb-2">
                {Object.entries(product.variation_attributes || {}).map(([attrName, values]) => (
                  <Badge key={attrName} variant="outline" className="px-2 py-1">
                    {attrName}: {values.length} options
                  </Badge>
                ))}
              </div>
            </div>
            
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
                      {formatCurrency(selectedPrice.price)} <Euro className="h-4 w-4 ml-1" />
                    </p>
                  </div>
                  
                  {selectedPrice.monthly_price !== undefined && selectedPrice.monthly_price > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Mensualité</p>
                      <p className="text-lg flex items-center">
                        {formatCurrency(selectedPrice.monthly_price)} <Euro className="h-3 w-3 ml-1" />/mois
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
                
                <div>
                  <p className="text-sm text-muted-foreground">Attributs</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(selectedPrice.attributes || {}).map(([key, value]) => (
                      <Badge key={key} variant="secondary" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </div>
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
