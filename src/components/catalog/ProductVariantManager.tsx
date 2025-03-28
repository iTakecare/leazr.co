
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Product, 
  VariantCombinationPrice
} from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Layers, Package, Tag, Edit, Trash2, Settings } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import VariantPriceManager from "./VariantPriceManager";
import ProductSpecifications from "./ProductSpecifications";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import VariantAttributeSelector from "./VariantAttributeSelector";

interface ProductVariantManagerProps {
  product: Product;
  onVariantAdded?: () => void;
}

const ProductVariantManager: React.FC<ProductVariantManagerProps> = ({ 
  product,
  onVariantAdded
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("attributes");
  
  // Format the attribute display for variant combinations
  const formatVariantAttributes = (attributes: Record<string, any>) => {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };
  
  // Count available variants
  const countVariants = () => {
    let count = 0;
    
    // Count child product variants
    if (product.variants && product.variants.length > 0) {
      count += product.variants.length;
    }
    
    // Count price combination variants
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      count += product.variant_combination_prices.length;
    }
    
    return count;
  };
  
  const variantsCount = countVariants();
  const hasVariants = variantsCount > 0;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Gestion des variantes</CardTitle>
              <CardDescription>
                Gérez les attributs, prix et spécifications de ce produit
              </CardDescription>
            </div>
            {hasVariants && (
              <Badge className="bg-blue-100 text-blue-800">
                {variantsCount} variante{variantsCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="attributes">
                <Settings className="h-4 w-4 mr-2" /> Attributs
              </TabsTrigger>
              <TabsTrigger value="prices">
                <Tag className="h-4 w-4 mr-2" /> Prix des variantes
              </TabsTrigger>
              <TabsTrigger value="specifications">
                <Package className="h-4 w-4 mr-2" /> Spécifications
              </TabsTrigger>
              <TabsTrigger value="variants">
                <Layers className="h-4 w-4 mr-2" /> Voir les variantes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="attributes">
              <VariantAttributeSelector 
                productId={product.id} 
                initialAttributes={product.variation_attributes}
                onAttributesUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ["product", product.id] });
                }}
              />
            </TabsContent>
            
            <TabsContent value="prices">
              <VariantPriceManager 
                product={product} 
                onPriceAdded={() => {
                  queryClient.invalidateQueries({ queryKey: ["product", product.id] });
                  if (onVariantAdded) onVariantAdded();
                }} 
              />
            </TabsContent>
            
            <TabsContent value="specifications">
              <ProductSpecifications 
                productId={product.id}
                initialSpecifications={product.specifications as Record<string, string>}
                onSpecificationsUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ["product", product.id] });
                }}
              />
            </TabsContent>
            
            <TabsContent value="variants">
              {product.variant_combination_prices && product.variant_combination_prices.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Configurations de prix disponibles</h3>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Attributs</th>
                          <th className="px-4 py-3 text-right font-medium">Prix d'achat</th>
                          <th className="px-4 py-3 text-right font-medium">Mensualité</th>
                          <th className="px-4 py-3 text-center font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.variant_combination_prices.map((variant: VariantCombinationPrice) => (
                          <tr key={variant.id} className="border-t hover:bg-muted/20">
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="font-medium">Configuration</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="bg-gray-50 text-xs">
                                      {key}: {value}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(variant.price)}
                            </td>
                            <td className="px-4 py-3 text-right text-primary font-medium">
                              {formatCurrency(variant.monthly_price || 0)}/mois
                            </td>
                            <td className="px-4 py-3 text-center">
                              {variant.stock || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <p className="text-muted-foreground text-xs mt-4">
                    Pour modifier ces configurations, utilisez l'onglet "Prix des variantes"
                  </p>
                </div>
              ) : product.variants && product.variants.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Produits variants liés</h3>
                  <div className="space-y-2">
                    {product.variants.map((variant: Product) => (
                      <div key={variant.id} className="p-4 rounded-md border flex justify-between items-center hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          {variant.image_url && (
                            <div className="w-10 h-10 rounded overflow-hidden bg-muted">
                              <img 
                                src={variant.image_url} 
                                alt={variant.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{variant.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {variant.attributes && formatVariantAttributes(variant.attributes)}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/products/${variant.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune variante disponible</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Ce produit n'a pas encore de variantes. Utilisez l'onglet "Attributs" pour définir les caractéristiques variables, puis "Prix des variantes" pour créer des configurations avec différents attributs et prix.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductVariantManager;
