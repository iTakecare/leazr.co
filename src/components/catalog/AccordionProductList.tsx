
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Package, Layers, Edit, Trash2, ChevronDown, ChevronUp, Tag as TagIcon } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/catalog"; 
import { toast } from "@/components/ui/use-toast";

interface AccordionProductListProps {
  products: Product[];
  onProductDeleted: ((productId: string) => void) | null;
  groupingOption: "model" | "brand";
  readOnly?: boolean;
}

interface GroupedProducts {
  [key: string]: Product[];
}

const AccordionProductList: React.FC<AccordionProductListProps> = ({ 
  products: initialProducts,
  onProductDeleted,
  groupingOption,
  readOnly = false
}) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]);

  // Mettre à jour les produits locaux lorsque les produits initiaux changent
  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);
  
  // Regrouper les produits par modèle ou marque
  const groupedProducts = useMemo(() => {
    const grouped: GroupedProducts = {};
    
    products.forEach(product => {
      let groupKey: string;
      
      if (groupingOption === "model") {
        if (product.is_parent) {
          // Les produits parents sont leurs propres groupes
          groupKey = product.id;
          if (!grouped[groupKey]) {
            grouped[groupKey] = [product];
          }
        } else if (product.parent_id) {
          // Les produits enfants vont dans le groupe de leur parent
          groupKey = product.parent_id;
          if (!grouped[groupKey]) {
            grouped[groupKey] = [];
          }
          grouped[groupKey].push(product);
        } else {
          // Les produits sans variation vont dans leur propre groupe
          groupKey = product.id;
          if (!grouped[groupKey]) {
            grouped[groupKey] = [product];
          }
        }
      } else if (groupingOption === "brand") {
        // Regrouper par marque
        groupKey = product.brand || "Sans marque";
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(product);
      }
    });
    
    if (groupingOption === "model") {
      console.log("Grouping by model:", Object.keys(grouped).length, "parent products", 
                  products.filter(p => p.parent_id).length, "variants");
    } else {
      console.log("Grouping by brand:", Object.keys(grouped).length, "brands", products.length, "products");
    }
    
    return grouped;
  }, [products, groupingOption]);

  const toggleVariantsExpanded = (productId: string) => {
    setExpandedVariants(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    );
  };

  const isVariantsExpanded = (productId: string) => {
    return expandedVariants.includes(productId);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!onProductDeleted) return;
    
    try {
      await onProductDeleted(productId);
      
      // Mettre à jour l'état local pour retirer le produit supprimé
      setProducts(prevProducts => {
        // Retirer le produit supprimé et ses variantes
        const updatedProducts = prevProducts.filter(product => 
          product.id !== productId && product.parent_id !== productId
        );
        return updatedProducts;
      });
      
      toast({
        title: "Succès",
        description: "Le produit a été supprimé",
        variant: "default",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };

  // Fonction pour récupérer les variantes d'un produit
  const getVariantsForProduct = (productId: string): Product[] => {
    return products.filter(product => product.parent_id === productId);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-gray-50">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Aucun produit</h3>
        <p className="mt-1 text-sm text-gray-500">
          {readOnly 
            ? "Aucun produit n'est disponible dans le catalogue."
            : "Vous n'avez pas encore ajouté de produits à votre catalogue."
          }
        </p>
        {!readOnly && (
          <div className="mt-6">
            <Link to="/catalog/create-product">
              <Button>
                Ajouter un produit
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Accordion type="multiple" className="space-y-4">
      {Object.entries(groupedProducts).map(([groupKey, groupProducts], groupIndex) => {
        // Pour le regroupement par modèle, le premier produit est le produit parent ou le seul produit
        const mainProduct = groupingOption === "model" 
          ? groupProducts.find(p => p.is_parent) || groupProducts[0]
          : null;
        
        const groupTitle = groupingOption === "model" 
          ? (mainProduct?.name || "Produit")
          : groupKey;
        
        // Les variantes sont les produits qui ont un parent_id correspondant au produit parent
        // ou tous les produits sauf le produit principal pour le regroupement par modèle
        const variants = groupingOption === "model" && mainProduct 
          ? getVariantsForProduct(mainProduct.id)
          : [];
        
        const hasVariants = variants.length > 0;
        
        return (
          <motion.div
            key={groupKey}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: groupIndex * 0.05 }}
          >
            <AccordionItem value={groupKey} className="border rounded-md overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:bg-gray-50 data-[state=open]:bg-gray-50">
                <div className="flex items-center">
                  {groupingOption === "model" && mainProduct ? (
                    <div className="flex flex-1 items-center">
                      <div className="w-10 h-10 mr-3 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                        <img
                          src={mainProduct.image_url || '/placeholder.svg'}
                          alt={mainProduct.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-left">{mainProduct.name}</div>
                        <div className="text-xs text-muted-foreground text-left flex items-center">
                          {hasVariants ? (
                            <span className="flex items-center"><Layers className="h-3 w-3 mr-1" /> {variants.length} variante(s)</span>
                          ) : (
                            <span>{mainProduct.brand || "Sans marque"} • {mainProduct.category || "Sans catégorie"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 font-medium text-left">
                      {groupTitle} <span className="text-xs text-muted-foreground">({groupProducts.length} produit{groupProducts.length > 1 ? 's' : ''})</span>
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4">
                  {/* Afficher le produit principal d'abord pour le regroupement par modèle */}
                  {groupingOption === "model" && mainProduct && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="p-4 bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="font-medium">{mainProduct.name}</div>
                          {mainProduct.is_parent && hasVariants && (
                            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Produit parent</span>
                          )}
                        </div>
                        
                        {!readOnly && onProductDeleted && (
                          <div className="flex space-x-2">
                            <Link to={`/products/${mainProduct.id}`}>
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
                                    Êtes-vous sûr de vouloir supprimer ce produit{mainProduct.is_parent ? " et toutes ses variantes" : ""} ?
                                    Cette action ne peut pas être annulée.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(mainProduct.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                      
                      {!mainProduct.is_parent && (
                        <div className="p-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <div className="text-sm font-medium">Prix</div>
                              <div>{formatCurrency(mainProduct.price || 0)}</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Mensualité</div>
                              <div>{formatCurrency(mainProduct.monthly_price || 0)}/mois</div>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Stock</div>
                              <div>{mainProduct.stock || "Non spécifié"}</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Afficher le bouton pour voir les variantes si le produit est parent */}
                      {mainProduct.is_parent && hasVariants && (
                        <div className="p-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => {
                              e.preventDefault();
                              toggleVariantsExpanded(mainProduct.id);
                            }}
                            className="w-full flex items-center justify-center text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Layers className="h-4 w-4 mr-2" />
                            {isVariantsExpanded(mainProduct.id) ? 'Masquer' : 'Afficher'} les {variants.length} variante{variants.length > 1 ? 's' : ''}
                            {isVariantsExpanded(mainProduct.id) ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Afficher les variantes seulement si elles existent et si elles sont développées */}
                  {groupingOption === "model" && mainProduct && mainProduct.is_parent && hasVariants && isVariantsExpanded(mainProduct.id) && (
                    <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-2 mt-2">
                      <div className="text-sm font-medium text-blue-800 mb-2">Variantes de {mainProduct.name}</div>
                      {variants.map((variant) => (
                        <div key={variant.id} className="border rounded-md overflow-hidden bg-blue-50">
                          <div className="p-3 flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-8 h-8 mr-2 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                                <img
                                  src={variant.image_url || '/placeholder.svg'}
                                  alt={variant.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/placeholder.svg";
                                  }}
                                />
                              </div>
                              <div>
                                <div className="font-medium">{variant.name}</div>
                                {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(variant.attributes).map(([key, value], idx) => (
                                      <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                        <TagIcon className="h-3 w-3" />
                                        {key}: {String(value)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 ml-2">
                              <div className="text-sm mr-4">
                                {formatCurrency(variant.price || 0)}
                              </div>
                              
                              {!readOnly && onProductDeleted && (
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
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Afficher les autres produits pour le regroupement par marque */}
                  {groupingOption === "brand" && (
                    <div className="space-y-2">
                      {groupProducts.map((product) => (
                        <div key={product.id} className="border rounded-md overflow-hidden">
                          <div className="p-3 flex justify-between items-center">
                            <div className="flex items-center">
                              <div className="w-8 h-8 mr-2 overflow-hidden rounded bg-gray-100 flex-shrink-0">
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
                                  {product.is_parent && (
                                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">Produit parent</span>
                                  )}
                                </div>
                                
                                {/* Afficher un indicateur de variantes pour les produits parents dans le regroupement par marque */}
                                {product.is_parent && (
                                  <div className="mt-1">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleVariantsExpanded(product.id);
                                      }}
                                      className="text-xs px-2 py-0 h-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Layers className="h-3 w-3 mr-1" />
                                      {isVariantsExpanded(product.id) ? 'Masquer' : 'Voir'} les variantes
                                      {isVariantsExpanded(product.id) ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3 ml-2">
                              <div className="text-sm mr-4">
                                {formatCurrency(product.price || 0)}
                              </div>
                              
                              {!readOnly && onProductDeleted && (
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
                                          Êtes-vous sûr de vouloir supprimer ce produit{product.is_parent ? " et toutes ses variantes" : ""} ?
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
                              )}
                            </div>
                          </div>
                          
                          {/* Afficher les variantes du produit dans le regroupement par marque */}
                          {product.is_parent && isVariantsExpanded(product.id) && (
                            <div className="ml-4 pl-4 border-l-2 border-blue-200 space-y-2 p-2 bg-blue-50">
                              {getVariantsForProduct(product.id).map((variant) => (
                                <div key={variant.id} className="border rounded-md overflow-hidden bg-white">
                                  <div className="p-3 flex justify-between items-center">
                                    <div className="flex items-center">
                                      <div className="w-6 h-6 mr-2 overflow-hidden rounded bg-gray-100 flex-shrink-0">
                                        <img
                                          src={variant.image_url || '/placeholder.svg'}
                                          alt={variant.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                                          }}
                                        />
                                      </div>
                                      <div>
                                        <div className="font-medium text-sm">{variant.name}</div>
                                        {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {Object.entries(variant.attributes).map(([key, value], idx) => (
                                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                                <TagIcon className="h-3 w-3" />
                                                {key}: {String(value)}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-3 ml-2">
                                      <div className="text-sm mr-4">
                                        {formatCurrency(variant.price || 0)}
                                      </div>
                                      
                                      {!readOnly && onProductDeleted && (
                                        <div className="flex space-x-1">
                                          <Link to={`/products/${variant.id}`}>
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                          </Link>
                                          
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50">
                                                <Trash2 className="h-3 w-3" />
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
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        );
      })}
    </Accordion>
  );
};

export default AccordionProductList;
