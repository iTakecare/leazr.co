
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Product
} from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Layers, Package, Tag } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import VariantPriceManager from "./VariantPriceManager";
import ProductSpecifications from "./ProductSpecifications";

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
  const [activeTab, setActiveTab] = useState("prices");
  
  // Handle navigation to variant details
  const viewVariants = () => {
    // Navigate to a view that lists all variants
    if (product.variants && product.variants.length > 0) {
      toast.info(`Ce produit a ${product.variants.length} variantes`);
    } else {
      toast.info("Ce produit n'a pas de variantes");
    }
  };
  
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
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="prices">
                <Tag className="h-4 w-4 mr-2" /> Prix des variantes
              </TabsTrigger>
              <TabsTrigger value="specifications">
                <Package className="h-4 w-4 mr-2" /> Spécifications
              </TabsTrigger>
              <TabsTrigger value="variants" onClick={viewVariants}>
                <Layers className="h-4 w-4 mr-2" /> Voir les variantes
              </TabsTrigger>
            </TabsList>
            
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
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  La vue des variantes sera disponible dans une prochaine mise à jour.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductVariantManager;
