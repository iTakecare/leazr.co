
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getProducts, deleteProduct } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Trash2, Edit, ChevronDown, ChevronRight } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface AccordionProductListProps {
  products?: Product[];
  onProductDeleted?: () => void;
}

const AccordionProductList = ({ products: providedProducts, onProductDeleted }: AccordionProductListProps) => {
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [openVariants, setOpenVariants] = useState<Record<string, boolean>>({});
  
  const { data: fetchedProducts = [], isLoading, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: !providedProducts, // Only fetch products if they're not provided
  });

  const products = providedProducts || fetchedProducts;

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      toast.success("Produit supprimé avec succès");
      refetch();
      if (onProductDeleted) {
        onProductDeleted();
      }
    },
    onError: (err: Error) => {
      toast.error(`Erreur lors de la suppression du produit: ${err.message}`);
    },
  });

  const handleDeleteProduct = (id: string) => {
    deleteMutation.mutate(id);
    setProductToDelete(null);
  };
  
  const toggleVariants = (productId: string) => {
    setOpenVariants(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  if (isLoading && !providedProducts) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun produit trouvé.</p>
      </div>
    );
  }

  // Fonction pour déterminer si un produit est un parent ou un enfant
  const isParentProduct = (product: Product) => {
    return product.is_parent || (!product.parent_id && !product.is_variation);
  };

  // Grouper les produits par modèle parent
  const groupProductsByModel = () => {
    const parentProducts: Product[] = [];
    const variantsByParentId: Record<string, Product[]> = {};
    
    // Première passe: collecter tous les produits parents
    products.forEach(product => {
      if (isParentProduct(product)) {
        parentProducts.push(product);
        variantsByParentId[product.id] = [];
      }
    });
    
    // Deuxième passe: assigner les variantes à leurs parents
    products.forEach(product => {
      // Si c'est une variante et a un parent_id valide qui existe dans notre liste de parents
      if (product.parent_id && variantsByParentId[product.parent_id]) {
        variantsByParentId[product.parent_id].push(product);
      } 
      // Si le produit a un parent_id mais ce parent n'est pas dans notre liste
      else if (product.parent_id) {
        // Chercher si le parent existe dans products mais n'a pas été identifié comme parent
        const parentExists = products.find(p => p.id === product.parent_id);
        if (parentExists) {
          if (!variantsByParentId[parentExists.id]) {
            variantsByParentId[parentExists.id] = [];
          }
          variantsByParentId[parentExists.id].push(product);
        } else {
          // Si le parent n'existe pas, on traite ce produit comme indépendant
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      }
      // Si le produit n'a pas de parent_id mais est marqué comme variation
      else if (product.is_variation) {
        // Chercher un parent basé sur le nom similaire
        const baseProductName = product.name.split(/\s+\d+\s*GB|\s+\d+Go|\s+\d+\s*To|\(/).shift()?.trim();
        if (baseProductName) {
          const potentialParent = parentProducts.find(
            p => p.name.toLowerCase().includes(baseProductName.toLowerCase())
          );
          if (potentialParent) {
            variantsByParentId[potentialParent.id].push(product);
          } else {
            // Pas de parent trouvé, on le traite comme indépendant
            parentProducts.push(product);
            variantsByParentId[product.id] = [];
          }
        } else {
          // Fallback
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      }
    });
    
    // Troisième passe: traiter les produits qui ne sont ni parents ni assignés à un parent
    const unassignedProducts = products.filter(
      p => !isParentProduct(p) && !Object.values(variantsByParentId).flat().includes(p)
    );
    
    unassignedProducts.forEach(product => {
      // Essayer de regrouper par similarité de nom avec un parent existant
      const baseProductName = product.name.split(/\s+\d+\s*GB|\s+\d+Go|\s+\d+\s*To|\(/).shift()?.trim();
      
      if (baseProductName) {
        const matchingParent = parentProducts.find(
          p => p.name.toLowerCase().includes(baseProductName.toLowerCase())
        );
        
        if (matchingParent) {
          variantsByParentId[matchingParent.id].push(product);
        } else {
          // Créer un nouveau groupe pour ce produit
          parentProducts.push(product);
          variantsByParentId[product.id] = [];
        }
      } else {
        // Fallback
        parentProducts.push(product);
        variantsByParentId[product.id] = [];
      }
    });
    
    // Vérification des variants_ids
    parentProducts.forEach(parent => {
      if (parent.variants_ids && Array.isArray(parent.variants_ids)) {
        // Trouver les variantes qui sont dans variants_ids mais pas encore dans variantsByParentId
        const variantsToAdd = products.filter(
          p => parent.variants_ids?.includes(p.id) && !variantsByParentId[parent.id].some(v => v.id === p.id)
        );
        
        // Ajouter ces variantes
        if (variantsToAdd.length > 0) {
          variantsByParentId[parent.id] = [...variantsByParentId[parent.id], ...variantsToAdd];
        }
      }
    });
    
    return { parentProducts, variantsByParentId };
  };

  const { parentProducts, variantsByParentId } = groupProductsByModel();

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => productToDelete && handleDeleteProduct(productToDelete)}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Accordion type="multiple" className="space-y-4">
        {parentProducts.map((parentProduct) => {
          const variants = variantsByParentId[parentProduct.id] || [];
          const hasVariants = variants.length > 0;
          const variantCount = variants.length;
          
          return (
            <motion.div key={parentProduct.id} variants={itemVariants}>
              <AccordionItem value={parentProduct.id} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-muted rounded overflow-hidden mr-3">
                      <img
                        src={parentProduct.image_url || parentProduct.imageUrl || '/placeholder.svg'}
                        alt={parentProduct.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    </div>
                    <div className="text-left">
                      <span className="font-medium">{parentProduct.name}</span>
                      {hasVariants && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          ({variantCount} variante{variantCount > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="p-0">
                  <div className="divide-y">
                    {/* Produit principal */}
                    <div className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-medium text-primary">Modèle de base</h3>
                            <p className="text-sm text-muted-foreground">
                              {parentProduct.brand && <span>{parentProduct.brand} • </span>}
                              {formatCurrency(parentProduct.price || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={`/products/${parentProduct.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setProductToDelete(parentProduct.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Variantes du produit */}
                    {variants.length > 0 && (
                      <div className="bg-muted/10 rounded-b-lg">
                        <div className="p-3 border-t border-muted">
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            Variantes du produit ({variants.length})
                          </h4>
                          <div className="space-y-2">
                            {variants.map((variant) => (
                              <div key={variant.id} className="p-3 bg-white rounded border border-muted hover:bg-muted/20 transition-colors">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-muted rounded overflow-hidden">
                                      <img
                                        src={variant.image_url || variant.imageUrl || '/placeholder.svg'}
                                        alt={variant.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <h3 className="font-medium">{variant.name}</h3>
                                      <p className="text-sm text-muted-foreground">
                                        {formatCurrency(variant.price || 0)}
                                        {variant.variation_attributes && (
                                          <span className="ml-2">
                                            {Object.entries(variant.variation_attributes)
                                              .map(([key, value]) => `${key}: ${value}`)
                                              .join(', ')}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Link to={`/products/${variant.id}`}>
                                      <Button variant="outline" size="sm">
                                        <Edit className="h-4 w-4 mr-1" />
                                        Modifier
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => setProductToDelete(variant.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          );
        })}
      </Accordion>
    </motion.div>
  );
};

export default AccordionProductList;
