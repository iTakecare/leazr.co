
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
import { Package, Layers, Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Product } from "@/types/catalog"; 
import { toast } from "@/components/ui/use-toast";
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

  const handleDeleteProduct = async (productId: string) => {
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

  if (products.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-gray-50">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
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

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Accordion 
      type="multiple" 
      className="space-y-4" 
      value={expandedGroups}
      onValueChange={setExpandedGroups}
    >
      {Object.entries(groupedProducts).map(([groupKey, groupProducts], groupIndex) => {
        // Pour le regroupement par modèle, le premier produit est le produit parent ou le seul produit
        const mainProduct = groupingOption === "model" 
          ? groupProducts.find(p => p.is_parent) || groupProducts[0]
          : null;
        
        const groupTitle = groupingOption === "model" 
          ? (mainProduct?.name || "Produit")
          : groupKey;
        
        const variants = groupingOption === "model" 
          ? groupProducts.filter(p => p.id !== mainProduct?.id || !mainProduct.is_parent)
          : [];
        
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
                <div className="flex items-center w-full">
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
                      <div className="flex-1 text-left">
                        <div className="font-medium">{mainProduct.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          {mainProduct.brand || "Sans marque"} • {mainProduct.category || "Sans catégorie"}
                          {mainProduct.is_parent && variants.length > 0 && (
                            <span className="ml-2 flex items-center">
                              <Layers className="h-3 w-3 mr-1" /> {variants.length} variante(s)
                            </span>
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
                  {/* Afficher le produit principal pour le regroupement par modèle */}
                  {groupingOption === "model" && mainProduct && mainProduct.is_parent && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="p-4 bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="font-medium">{mainProduct.name}</div>
                          <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                            Produit parent
                          </Badge>
                        </div>
                        
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
                                  Êtes-vous sûr de vouloir supprimer ce produit et toutes ses variantes ?
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
                      </div>
                      
                      {mainProduct.price > 0 && (
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
                    </div>
                  )}
                  
                  {/* Afficher les variantes ou tous les produits pour le regroupement par marque */}
                  <div className="space-y-2">
                    {/* Pour regroupement par modèle : afficher toutes les variantes */}
                    {/* Pour regroupement par marque : afficher tous les produits */}
                    {(groupingOption === "model" 
                      ? (mainProduct?.is_parent ? variants : groupProducts) 
                      : groupProducts).map((product) => (
                      <div key={product.id} className="border rounded-md overflow-hidden">
                        <div className="p-3 flex justify-between items-center">
                          <div className="flex items-center flex-1">
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
                            <div className="flex-1">
                              <div className="font-medium flex items-center">
                                {product.name}
                                {product.is_parent && (
                                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800 text-xs">
                                    Parent
                                  </Badge>
                                )}
                                {product.parent_id && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Variante
                                  </Badge>
                                )}
                              </div>
                              {groupingOption === "brand" && (
                                <div className="text-xs text-muted-foreground">
                                  {product.category || "Sans catégorie"}
                                </div>
                              )}
                              {product.attributes && Object.keys(product.attributes).length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {Object.entries(product.attributes).map(([key, value], index, arr) => (
                                    <span key={key}>
                                      {key}: <strong>{value}</strong>{index < arr.length - 1 ? ', ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3 ml-2">
                            <div className="text-sm mr-4 whitespace-nowrap">
                              {formatCurrency(product.price || 0)}
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
                                      Êtes-vous sûr de vouloir supprimer ce produit
                                      {product.is_parent ? " et toutes ses variantes" : ""} ?
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
                      </div>
                    ))}
                  </div>
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
