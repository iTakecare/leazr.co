
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
import { Trash2, Edit } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface AccordionProductListProps {
  products?: Product[];
  onProductDeleted?: () => void;
}

const AccordionProductList = ({ products: providedProducts, onProductDeleted }: AccordionProductListProps) => {
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
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

  // Group products by category
  const productsByCategory: Record<string, Product[]> = {};
  
  products.forEach(product => {
    const category = product.category || "non-categorisé";
    if (!productsByCategory[category]) {
      productsByCategory[category] = [];
    }
    productsByCategory[category].push(product);
  });

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
      
      {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
        <motion.div key={category} variants={itemVariants}>
          <Accordion type="single" collapsible className="border rounded-lg overflow-hidden">
            <AccordionItem value={category} className="border-0">
              <AccordionTrigger className="px-4 py-3 bg-muted/50 hover:bg-muted">
                <div className="flex items-center">
                  <span className="capitalize font-medium">{category}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({categoryProducts.length} produit{categoryProducts.length > 1 ? 's' : ''})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="divide-y">
                  {categoryProducts.map((product) => (
                    <div key={product.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-muted rounded overflow-hidden">
                            <img
                              src={product.image_url || product.imageUrl || '/placeholder.svg'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.brand && <span>{product.brand} • </span>}
                              {formatCurrency(product.price || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link to={`/products/${product.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                          </Link>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setProductToDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default AccordionProductList;
