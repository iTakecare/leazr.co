
import React, { useState } from "react";
import { Product } from "@/types/catalog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { toast } from "@/components/ui/use-toast";

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
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]);
  
  if (!products || products.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">Aucun produit disponible</p>
      </div>
    );
  }

  // Group products based on the selected option
  const groupedProducts = products.reduce((acc, product) => {
    // Skip variants if they will be displayed under parent
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

  // Get variants for a specific product
  const getVariantsForProduct = (parentId: string): Product[] => {
    return products.filter(p => p.parent_id === parentId);
  };

  // Check if a product has variants
  const hasVariants = (productId: string): boolean => {
    const variants = getVariantsForProduct(productId);
    return variants.length > 0 || 
      (products.find(p => p.id === productId)?.is_parent || false);
  };

  // Get count of variants for a product
  const getVariantsCount = (productId: string): number => {
    return getVariantsForProduct(productId).length;
  };

  // Toggle variant expansion
  const toggleVariants = (productId: string) => {
    setExpandedVariants(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  // Check if variants are expanded for a product
  const isVariantsExpanded = (productId: string): boolean => {
    return expandedVariants.includes(productId);
  };

  const handleDelete = async (productId: string) => {
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

  return (
    <div className="space-y-4">
      {Object.entries(groupedProducts).map(([group, groupProducts]) => (
        <div key={group} className="bg-card rounded-md overflow-hidden border">
          <div className="bg-muted/40 px-4 py-2 font-medium text-lg">
            {group}
          </div>
          <Accordion type="multiple" className="px-0">
            {groupProducts.map((product) => (
              <div key={product.id}>
                <AccordionItem value={product.id} className="border-b">
                  <AccordionTrigger className="px-4 hover:no-underline">
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
                          
                          {/* Variant indicator */}
                          {hasVariants(product.id) && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 mr-2 flex items-center gap-1">
                              <Layers className="h-3 w-3" /> 
                              {getVariantsCount(product.id)} variante{getVariantsCount(product.id) > 1 ? 's' : ''}
                            </Badge>
                          )}
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
                  <AccordionContent className="px-4 pb-3">
                    <div className="grid gap-4">
                      <div className="text-sm">
                        {product.description || "Aucune description disponible."}
                      </div>
                      {!readOnly && (
                        <div className="flex justify-end gap-2">
                          <Link to={`/products/${product.id}`}>
                            <Button variant="outline" size="sm" className="flex items-center">
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                          </Link>
                          {onProductDeleted && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isDeleting[product.id]}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(product.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {isDeleting[product.id] ? "Suppression..." : "Supprimer"}
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Variants section */}
                      {hasVariants(product.id) && (
                        <div className="mt-2">
                          <div 
                            className="flex items-center gap-2 text-sm font-medium text-blue-600 cursor-pointer py-2"
                            onClick={() => toggleVariants(product.id)}
                          >
                            {isVariantsExpanded(product.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            {getVariantsCount(product.id)} Variante{getVariantsCount(product.id) > 1 ? 's' : ''}
                          </div>
                          
                          {isVariantsExpanded(product.id) && (
                            <div className="pl-4 border-l-2 border-blue-200 mt-2 space-y-3">
                              {getVariantsForProduct(product.id).map((variant) => (
                                <div 
                                  key={variant.id} 
                                  className="p-3 bg-blue-50/50 border border-blue-100 rounded-md flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-3">
                                    {variant.image_url && (
                                      <div className="w-10 h-10 rounded overflow-hidden bg-white">
                                        <img 
                                          src={variant.image_url} 
                                          alt={variant.name}
                                          className="w-full h-full object-contain p-1"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = "/placeholder.svg";
                                          }}
                                        />
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-medium">{variant.name}</div>
                                      <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                                        {variant.attributes && Object.entries(variant.attributes).map(([key, value]) => (
                                          <Badge key={key} variant="outline" className="bg-white">
                                            {key}: {value}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {variant.monthly_price !== undefined && variant.monthly_price > 0 && (
                                      <span className="text-sm text-primary font-medium">
                                        {formatCurrency(variant.monthly_price)}/mois
                                      </span>
                                    )}
                                    
                                    {!readOnly && (
                                      <>
                                        <Link to={`/products/${variant.id}`}>
                                          <Button variant="ghost" size="sm">
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </Link>
                                        {onProductDeleted && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            disabled={isDeleting[variant.id]}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              handleDelete(variant.id);
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </div>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
};

export default AccordionProductList;
