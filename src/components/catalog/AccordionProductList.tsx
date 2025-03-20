
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
import { Package, Layers, Edit, Trash2, Tag, Cpu, HardDrive } from "lucide-react";
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

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);
  
  const getVariantsCount = (product: Product): number => {
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
  
  const groupedProducts = useMemo(() => {
    const grouped: GroupedProducts = {};
    
    console.log("Raw products to be grouped:", products);
    
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
  
  const getAttributeBadge = (name: string, value: string) => {
    const getIcon = () => {
      const lowerName = name.toLowerCase();
      if (lowerName.includes("processeur") || lowerName.includes("cpu") || lowerName.includes("processor")) 
        return <Cpu className="h-3.5 w-3.5 mr-1" />;
      if (lowerName.includes("mémoire") || lowerName.includes("ram") || lowerName.includes("memory")) 
        return <Tag className="h-3.5 w-3.5 mr-1" />;
      if (lowerName.includes("disque") || lowerName.includes("stockage") || lowerName.includes("ssd") || 
          lowerName.includes("capacité") || lowerName.includes("storage") || lowerName.includes("disk")) 
        return <HardDrive className="h-3.5 w-3.5 mr-1" />;
      return <Tag className="h-3.5 w-3.5 mr-1" />;
    };
    
    return (
      <Badge 
        key={`${name}-${value}`} 
        variant="outline"
        className="text-xs py-1 px-2 m-0.5 flex items-center bg-blue-50 text-blue-700 border-blue-100"
      >
        {getIcon()}
        {value}
      </Badge>
    );
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
        const parentProduct = groupProducts.find(p => p.is_parent) || 
                             groupProducts.find(p => !p.parent_id && groupProducts.some(v => v.parent_id === p.id)) ||
                             groupProducts[0];
        
        const variants = groupProducts.filter(p => p.parent_id === parentProduct.id);
        
        const variantsCount = variants.length || getVariantsCount(parentProduct);
        
        const groupTitle = groupingOption === "model" 
          ? (parentProduct.name)
          : groupKey;
          
        const productType = parentProduct?.category ? 
          (parentProduct.category === 'laptop' ? 'Ordinateur portable' : 
          parentProduct.category === 'desktop' ? 'Ordinateur fixe' : 
          parentProduct.category === 'tablet' ? 'Tablette' : 
          parentProduct.category === 'smartphone' ? 'Smartphone' : 
          parentProduct.category) : 'Produit';
        
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
                  {groupingOption === "model" ? (
                    <div className="flex flex-1 items-center">
                      <div className="w-10 h-10 mr-3 overflow-hidden rounded bg-gray-100 flex-shrink-0">
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
                          {parentProduct.brand || "Sans marque"} • {productType}
                          {variantsCount > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-indigo-100 text-indigo-700">
                              {variantsCount} variante{variantsCount > 1 ? 's' : ''}
                            </Badge>
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
                  {/* Affichage des attributs de variation comme dans l'exemple */}
                  {groupingOption === "model" && parentProduct.variation_attributes && 
                   Object.keys(parentProduct.variation_attributes).length > 0 && (
                    <div className="border rounded-md p-4 bg-gray-50">
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
                  
                  {/* Produit parent (simplifié comme dans l'exemple) */}
                  {groupingOption === "model" && parentProduct.is_parent && (
                    <div className="border rounded-md p-4 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{parentProduct.name}</div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Produit parent
                        </Badge>
                        {variantsCount > 0 && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700">
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
                  
                  {/* Liste des variantes simplifiée, comme dans l'exemple */}
                  {groupingOption === "model" && variants.length > 0 && (
                    <div className="space-y-1">
                      {variants.map((variant) => (
                        <div key={variant.id} className="border rounded-md p-3 hover:bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="flex-1">
                              <div className="font-medium mb-1">{variant.name}</div>
                              <div className="flex flex-wrap gap-1">
                                {variant.attributes && Object.entries(variant.attributes).map(([name, value]) => 
                                  getAttributeBadge(name, value.toString())
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-4 ml-4">
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
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Produits individuels (pour le regroupement par marque ou les produits sans variantes) */}
                  {(groupingOption === "brand" 
                    ? groupProducts 
                    : groupProducts.filter(p => !p.parent_id && !p.is_parent && variants.length === 0)).map((product) => (
                    <div key={product.id} className="border rounded-md p-3 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
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
                            <div className="font-medium">{product.name}</div>
                            
                            {groupingOption === "brand" && (
                              <div className="text-xs text-muted-foreground">
                                {product.category || "Sans catégorie"}
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
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        );
      })}
    </Accordion>
  );
};

export default AccordionProductList;
