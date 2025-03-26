import React, { useState } from "react";
import { Product } from "@/types/catalog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "@/components/ui/use-toast";
import VariantIndicator from "@/components/ui/product/VariantIndicator";

interface AccordionProductListProps {
  products: Product[];
  onProductDeleted: (productId: string) => Promise<void> | null;
  groupingOption: "model" | "brand";
  readOnly?: boolean;
}

const AccordionProductList: React.FC<AccordionProductListProps> = ({
  products,
  onProductDeleted,
  groupingOption,
  readOnly = false
}) => {
  const [isDeleting, setIsDeleting] = useState<{ [key: string]: boolean }>({});
  
  console.log("AccordionProductList: Received products:", products.length);
  
  if (!products || products.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">Aucun produit trouvé</p>
      </div>
    );
  }

  const groupedProducts = products.reduce((acc, product) => {
    if (product.parent_id) return acc;
    
    const groupKey = groupingOption === "model" ? 
      (product.model || product.name) : 
      (product.brand || "Sans marque");
    
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    
    acc[groupKey].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Méthode améliorée pour calculer le nombre TOTAL de combinaisons possibles
  const calculateTotalPossibleVariants = (product: Product): number => {
    // 1. Si le produit a un nombre de variantes défini par le serveur, l'utiliser
    if (product.variants_count !== undefined && product.variants_count > 0) {
      return product.variants_count;
    }
    
    // 2. Si le produit a des attributs de variation, calculer le nombre TOTAL de combinaisons possibles
    if (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0) {
      const attributes = product.variation_attributes;
      
      // Calculer le nombre de combinaisons possibles en multipliant le nombre de valeurs de chaque attribut
      let totalCombinations = 1;
      Object.values(attributes).forEach(values => {
        if (Array.isArray(values) && values.length > 0) {
          totalCombinations *= values.length;
        }
      });
      
      console.log(`calculateTotalPossibleVariants: Product ${product.name} - Total combinations:`, totalCombinations);
      return totalCombinations;
    }
    
    // 3. Si le produit a des combinaisons de prix de variantes, utiliser ce nombre
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return product.variant_combination_prices.length;
    }
    
    // 4. Si le produit a des variantes directes, compter celles-ci
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    return 0;
  };

  // Déterminer si le produit a des variantes
  const hasVariants = (product: Product): boolean => {
    if (!product) return false;
    
    // Les conditions pour qu'un produit ait des variantes
    return (
      (product.is_parent === true) || 
      (product.variant_combination_prices && product.variant_combination_prices.length > 0) ||
      (product.variation_attributes && Object.keys(product.variation_attributes || {}).length > 0) ||
      (product.variants && product.variants.length > 0)
    );
  };

  // Logging pour déboguer
  products.forEach(product => {
    const hasVariantsFlag = hasVariants(product);
    const variantsCount = hasVariantsFlag ? calculateTotalPossibleVariants(product) : 0;
    if (hasVariantsFlag) {
      console.log(`AccordionProductList: Product ${product.name} has ${variantsCount} variants`);
      if (product.variation_attributes) {
        console.log(`AccordionProductList: Product ${product.name} variation attributes:`, product.variation_attributes);
      }
    }
  });

  const handleDelete = async (productId: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!onProductDeleted) return;
    
    if (confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      try {
        setIsDeleting(prev => ({ ...prev, [productId]: true }));
        await onProductDeleted(productId);
        toast({
          title: "Produit supprimé",
          description: "Le produit a été supprimé avec succès",
          variant: "default",
        });
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        toast({
          title: "Erreur",
          description: "Une erreur est survenue lors de la suppression",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(prev => ({ ...prev, [productId]: false }));
      }
    }
  };

  const handleDuplicate = (product: Product, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const duplicatedProduct = {
      ...product,
      name: `${product.name} (copie)`,
    };
    
    toast({
      title: "Fonctionnalité en développement",
      description: "La duplication de produits sera bientôt disponible",
      variant: "default",
    });
    
    console.log("Produit à dupliquer:", duplicatedProduct);
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedProducts).map(([group, groupProducts]) => (
        <div key={group} className="bg-card rounded-md overflow-hidden border">
          <div className="bg-muted/40 px-4 py-2 font-medium text-lg">
            {group}
          </div>
          <Accordion type="multiple" className="px-0">
            {groupProducts.map((product) => {
              const productHasVariants = hasVariants(product);
              const variantsCount = productHasVariants ? calculateTotalPossibleVariants(product) : 0;
              
              return (
                <div key={product.id}>
                  <AccordionItem value={product.id} className="border-b">
                    <div className="flex items-center pr-4">
                      <AccordionTrigger className="px-4 hover:no-underline flex-1 [&>svg]:hidden">
                        <div className="flex-1 flex items-center">
                          <div className="w-14 h-14 flex-shrink-0 rounded overflow-hidden mr-4 bg-muted">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-contain p-1"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/placeholder.svg";
                                }}
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground">
                                <span className="text-xs">No image</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{product.name}</h3>
                              
                              <VariantIndicator 
                                hasVariants={productHasVariants} 
                                variantsCount={variantsCount} 
                              />
                            </div>
                            <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
                              {product.brand && (
                                <Badge variant="outline" className="bg-gray-50">{product.brand}</Badge>
                              )}
                              {product.category && (
                                <Badge variant="outline" className="bg-gray-50">{product.category}</Badge>
                              )}
                              {product.monthly_price !== undefined && product.monthly_price > 0 && (
                                <span className="text-primary font-medium">
                                  {formatCurrency(product.monthly_price)}/mois
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      
                      {!readOnly && (
                        <div className="flex items-center gap-1 ml-auto">
                          <Link to={`/products/${product.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={(e) => handleDuplicate(product, e as React.MouseEvent)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {onProductDeleted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={isDeleting[product.id]}
                              onClick={(e) => handleDelete(product.id, e as React.MouseEvent)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <AccordionContent className="px-4 pb-2">
                      {/* Intentionally left empty */}
                    </AccordionContent>
                  </AccordionItem>
                </div>
              );
            })}
          </Accordion>
        </div>
      ))}
    </div>
  );
};

export default AccordionProductList;
