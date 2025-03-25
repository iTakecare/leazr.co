
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Package, Tag, RefreshCcw, Layers, ArrowRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { 
  identifyProductGroups, 
  autoGroupAllProducts,
  generateAllVariantPrices
} from "@/services/productGroupingService";

const ProductGroupingManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  // Auto-analyze when component mounts
  useEffect(() => {
    handleAnalyzeProducts();
  }, []);
  
  // Fetch potential product groups
  const { data: productGroups = new Map(), isLoading: isLoadingGroups, refetch: refetchGroups } = useQuery({
    queryKey: ["product-groups"],
    queryFn: identifyProductGroups,
    enabled: false, // Don't fetch automatically
  });
  
  // Auto-group products mutation
  const autoGroupMutation = useMutation({
    mutationFn: autoGroupAllProducts,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["product-groups"] });
        toast.success(`${data.groupsCreated} groupes créés avec ${data.productsGrouped} produits organisés`);
      }
    }
  });
  
  // Generate prices mutation
  const generatePricesMutation = useMutation({
    mutationFn: generateAllVariantPrices,
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success(`${data.pricesCreated} combinaisons de prix créées`);
      }
    }
  });
  
  // Handle analyze products
  const handleAnalyzeProducts = async () => {
    setIsLoading(true);
    try {
      await refetchGroups();
      toast.success("Analyse des produits terminée");
    } catch (error) {
      toast.error("Erreur lors de l'analyse des produits");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle auto-group products
  const handleAutoGroupProducts = async () => {
    autoGroupMutation.mutate();
  };
  
  // Handle generate prices
  const handleGeneratePrices = async () => {
    generatePricesMutation.mutate();
  };
  
  // Organize the potential groups information
  const potentialGroups = Array.from(productGroups.entries()).map(([baseName, products]) => ({
    baseName,
    productCount: products.length,
    products
  }));
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Gestionnaire de regroupement de produits
        </CardTitle>
        <CardDescription>
          Analysez et organisez automatiquement les produits en groupes parents/variantes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Étape 1</CardTitle>
              <CardDescription>Analyser les produits similaires</CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button 
                className="w-full"
                onClick={handleAnalyzeProducts}
                disabled={isLoading || isLoadingGroups}
              >
                {(isLoading || isLoadingGroups) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Analyser les produits
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Étape 2</CardTitle>
              <CardDescription>Organiser en groupes parent/variantes</CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button 
                className="w-full"
                onClick={handleAutoGroupProducts}
                disabled={autoGroupMutation.isPending}
                variant="default"
              >
                {autoGroupMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Regrouper automatiquement
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-base">Étape 3</CardTitle>
              <CardDescription>Générer les combinaisons de prix</CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button 
                className="w-full"
                onClick={handleGeneratePrices}
                disabled={generatePricesMutation.isPending}
                variant="secondary"
              >
                {generatePricesMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Générer les prix
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Results section */}
        {potentialGroups.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Groupes potentiels détectés ({potentialGroups.length})</h3>
            
            <div className="space-y-3">
              {potentialGroups.map(({ baseName, productCount }) => (
                <div key={baseName} className="flex items-center justify-between bg-secondary/20 p-3 rounded-md">
                  <div>
                    <h4 className="font-medium">{baseName}</h4>
                    <div className="text-sm text-muted-foreground">{productCount} produits similaires</div>
                  </div>
                  <Badge variant="outline">{productCount} variantes</Badge>
                </div>
              ))}
            </div>
          </div>
        ) : isLoadingGroups ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Alert>
            <RefreshCcw className="h-4 w-4" />
            <AlertTitle>Analyse nécessaire</AlertTitle>
            <AlertDescription>
              Cliquez sur "Analyser les produits" pour détecter les groupes potentiels.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductGroupingManager;
