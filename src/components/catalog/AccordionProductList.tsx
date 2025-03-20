
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, ChevronUp, ChevronDown, Cpu, HardDrive, Tag } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/catalog"; 
import { Badge } from "@/components/ui/badge";

interface AccordionProductListProps {
  products: Product[];
  onProductDeleted: (productId: string) => void;
  groupingOption: "model" | "brand";
}

interface GroupedProducts {
  [key: string]: Product[];
}

const AccordionProductList: React.FC<AccordionProductListProps> = ({ 
  products: initialProducts,
  onProductDeleted,
  groupingOption 
}) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);
  
  // Fonction pour déterminer le nombre de variantes
  const getVariantsCount = (product: Product): number => {
    // Ne compter que les vraies variantes, pas le produit parent
    if (product.variants && product.variants.length > 0) {
      return product.variants.length;
    }
    
    if (product.variant_combination_prices && product.variant_combination_prices.length > 0) {
      return product.variant_combination_prices.length;
    }
    
    if (product.variation_attributes && Object.keys(product.variation_attributes).length > 0) {
      const attributes = product.variation_attributes;
      const attributeKeys = Object.keys(attributes);
      
      if (attributeKeys.length > 0) {
        return attributeKeys.reduce((total, key) => {
          const values = attributes[key];
          return total * (Array.isArray(values) ? values.length : 1);
        }, 1);
      }
    }
    
    return 0;
  };
  
  // Grouper les produits par modèle ou marque
  const groupedProducts = React.useMemo(() => {
    const grouped: GroupedProducts = {};
    
    products.forEach(product => {
      let groupKey: string;
      
      if (groupingOption === "model") {
        if (product.is_parent) {
          groupKey = product.id;
          if (!grouped[groupKey]) {
            grouped[groupKey] = [product];
          }
          
          const variants = products.filter(p => p.parent_id === product.id);
          if (variants.length > 0) {
            grouped[groupKey] = [...grouped[groupKey], ...variants];
          }
        } else if (product.parent_id) {
          groupKey = product.parent_id;
          if (!grouped[groupKey]) {
            const parent = products.find(p => p.id === product.parent_id);
            if (parent) {
              grouped[groupKey] = [parent, product];
            } else {
              grouped[product.id] = [product];
            }
          } else {
            if (!grouped[groupKey].some(p => p.id === product.id)) {
              grouped[groupKey].push(product);
            }
          }
        } else {
          groupKey = product.id;
          if (!grouped[groupKey]) {
            grouped[groupKey] = [product];
          }
        }
      } else if (groupingOption === "brand") {
        groupKey = product.brand || "Sans marque";
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(product);
      }
    });
    
    // Tri supplémentaire pour s'assurer que les parents sont en premier
    Object.keys(grouped).forEach(key => {
      const productsInGroup = grouped[key];
      
      const parentProductIndex = productsInGroup.findIndex(p => p.is_parent || (!p.parent_id && productsInGroup.some(v => v.parent_id === p.id)));
      
      if (parentProductIndex > -1) {
        const parentProduct = productsInGroup[parentProductIndex];
        
        grouped[key] = [
          parentProduct,
          ...productsInGroup.filter((p, idx) => idx !== parentProductIndex && p.parent_id === parentProduct.id),
          ...productsInGroup.filter((p, idx) => idx !== parentProductIndex && p.parent_id !== parentProduct.id)
        ];
      }
    });
    
    return grouped;
  }, [products, groupingOption]);

  const handleDeleteProduct = async (productId: string) => {
    try {
      await onProductDeleted(productId);
      
      setProducts(prevProducts => {
        const updatedProducts = prevProducts.filter(product => 
          product.id !== productId && product.parent_id !== productId
        );
        return updatedProducts;
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };
  
  // Génère les badges d'attributs avec icônes
  const getAttributeBadge = (name: string, value: string) => {
    const lowerName = name.toLowerCase();
    let icon = null;
    let className = "text-xs py-1 px-2 m-0.5 flex items-center";
    
    // Déterminer l'icône et la classe en fonction du type d'attribut
    if (lowerName.includes("mémoire") || lowerName.includes("ram")) {
      icon = <Tag className="h-3.5 w-3.5 mr-1" />;
      className += " bg-indigo-100 text-indigo-700 border-indigo-200";
    } 
    else if (lowerName.includes("disque") || lowerName.includes("capacité") || lowerName.includes("ssd")) {
      icon = <HardDrive className="h-3.5 w-3.5 mr-1" />;
      className += " bg-blue-100 text-blue-700 border-blue-200";
    }
    else if (lowerName.includes("processeur") || lowerName.includes("cpu")) {
      icon = <Cpu className="h-3.5 w-3.5 mr-1" />;
      className += " bg-purple-100 text-purple-700 border-purple-200";
    }
    else {
      icon = <Tag className="h-3.5 w-3.5 mr-1" />;
      className += " bg-gray-100 text-gray-700 border-gray-200";
    }
    
    return (
      <Badge 
        key={`${name}-${value}`} 
        variant="outline"
        className={className}
      >
        {icon}
        {value}
      </Badge>
    );
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-gray-50">
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun produit</h3>
        <p className="mt-1 text-sm text-gray-500">
          Vous n'avez pas encore ajouté de produits à votre catalogue.
        </p>
        <div className="mt-6">
          <Link to="/catalog/create-product">
            <Button>
              Ajouter un produit
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedProducts).map(([groupKey, groupProducts]) => {
        const parentProduct = groupProducts.find(p => p.is_parent) || 
                            groupProducts.find(p => !p.parent_id && groupProducts.some(v => v.parent_id === p.id)) ||
                            groupProducts[0];
        
        // Uniquement les vraies variantes, sans compter le parent
        const variants = groupProducts.filter(p => p.parent_id === parentProduct.id);
        const variantsCount = variants.length;
        
        // Information sur la catégorie du produit
        const categoryLabel = parentProduct?.category === 'laptop' ? 'Ordinateur portable' : 
                            parentProduct?.category === 'desktop' ? 'Ordinateur fixe' : 
                            parentProduct?.category === 'tablet' ? 'Tablette' : 
                            parentProduct?.category === 'smartphone' ? 'Smartphone' : 
                            parentProduct?.category;

        return (
          <Accordion 
            key={groupKey} 
            type="single" 
            collapsible 
            className="border rounded-md overflow-hidden"
          >
            <AccordionItem value="item-1" className="border-none">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex items-center w-full">
                  <div className="w-12 h-12 mr-3 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                    <img
                      src={parentProduct.image_url || '/placeholder.svg'}
                      alt={parentProduct.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{parentProduct.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center">
                      {parentProduct.brand} • {categoryLabel}
                      {variantsCount > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700">
                          {variantsCount} variante{variantsCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Section attributs de variation */}
                  {parentProduct.variation_attributes && 
                   Object.keys(parentProduct.variation_attributes).length > 0 && (
                    <div className="rounded-md p-4 bg-gray-50 border">
                      <h3 className="text-sm font-medium mb-2">Attributs de variation disponibles</h3>
                      <div className="space-y-2">
                        {Object.entries(parentProduct.variation_attributes).map(([attrName, values]) => (
                          <div key={attrName}>
                            <div className="text-xs font-medium text-gray-500 mb-1">{attrName}</div>
                            <div className="flex flex-wrap gap-1">
                              {values.map((value) => getAttributeBadge(attrName, value))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Produit parent */}
                  {parentProduct.is_parent && (
                    <div className="flex justify-between items-center p-4 border rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{parentProduct.name}</div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          Produit parent
                        </Badge>
                        {variantsCount > 0 && (
                          <Badge variant="outline" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                            {variantsCount} variante{variantsCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link to={`/products/${parentProduct.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-1" /> Modifier
                          </Button>
                        </Link>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer ce produit et toutes ses variantes ?
                                Cette action ne peut pas être annulée.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProduct(parentProduct.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                  
                  {/* Variantes */}
                  {variants.length > 0 && (
                    <div className="space-y-2">
                      {variants.map((variant) => (
                        <div key={variant.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50">
                          <div className="flex-1">
                            <h3 className="font-medium">{variant.name}</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {variant.attributes && Object.entries(variant.attributes).map(([name, value]) => 
                                getAttributeBadge(name, value.toString())
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="font-medium">{formatCurrency(variant.price || 0)}</div>
                              {variant.monthly_price > 0 && (
                                <div className="text-sm text-gray-500">{formatCurrency(variant.monthly_price || 0)}/mois</div>
                              )}
                            </div>
                            
                            <div className="flex space-x-1">
                              <Link to={`/products/${variant.id}`}>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Êtes-vous sûr de vouloir supprimer cette variante ?
                                      Cette action ne peut pas être annulée.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteProduct(variant.id)}>
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Produits individuels */}
                  {groupingOption === "brand" && 
                    groupProducts.filter(p => !p.parent_id && !p.is_parent).map((product) => (
                    <div key={product.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50">
                      <div className="flex items-center flex-1">
                        <div className="w-8 h-8 mr-3 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                          <img
                            src={product.image_url || '/placeholder.svg'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.category || "Sans catégorie"}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right whitespace-nowrap">
                          <div className="font-medium">{formatCurrency(product.price || 0)}</div>
                          {product.monthly_price > 0 && (
                            <div className="text-sm text-gray-500">{formatCurrency(product.monthly_price || 0)}/mois</div>
                          )}
                        </div>
                        
                        <div className="flex space-x-1">
                          <Link to={`/products/${product.id}`}>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Êtes-vous sûr de vouloir supprimer ce produit ?
                                  Cette action ne peut pas être annulée.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        );
      })}
    </div>
  );
};

export default AccordionProductList;
