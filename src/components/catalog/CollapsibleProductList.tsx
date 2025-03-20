
import React, { useState } from "react";
import { Product } from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronsUpDown, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
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
import { toast } from "@/components/ui/use-toast";

interface CollapsibleProductListProps {
  products: Product[];
  onDeleteProduct: (productId: string) => Promise<void>;
}

const CollapsibleProductList = ({ products, onDeleteProduct }: CollapsibleProductListProps) => {
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  
  // Initialiser localProducts lorsque products change
  React.useEffect(() => {
    setLocalProducts(products || []);
  }, [products]);

  if (!localProducts || localProducts.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground">Aucun produit n'a été trouvé.</p>
        <p className="text-sm text-muted-foreground mt-2">Ajoutez des produits pour les voir apparaître ici.</p>
      </div>
    );
  }

  const openDeleteConfirm = (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingProductId(productId);
    setConfirmDialogOpen(true);
  };

  const cancelDelete = () => {
    setDeletingProductId(null);
    setConfirmDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deletingProductId) return;
    
    try {
      setIsDeleting(true);
      
      // Suppression optimiste - supprimer immédiatement de l'UI
      const updatedProducts = localProducts.filter(
        product => product.id !== deletingProductId
      );
      setLocalProducts(updatedProducts);
      
      // Effectuer la suppression en base de données
      await onDeleteProduct(deletingProductId);
      
      toast({
        title: "Succès",
        description: "Le produit a été supprimé",
      });
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      
      // En cas d'échec, restaurer la liste originale
      setLocalProducts(products);
      
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingProductId(null);
      setConfirmDialogOpen(false);
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-4">
      {localProducts.map((product, index) => (
        <motion.div
          key={product.id}
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: index * 0.05 }}
        >
          <Collapsible className="border rounded-md">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded overflow-hidden">
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
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.category} • 
                    {!product.is_parent && formatCurrency(product.price || 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link to={`/products/${product.id}`}>
                  <Button variant="outline" size="sm">Modifier</Button>
                </Link>
                
                <Button 
                  variant="destructive" 
                  size="sm" 
                  disabled={isDeleting && deletingProductId === product.id}
                  onClick={(e) => openDeleteConfirm(product.id, e)}
                >
                  {isDeleting && deletingProductId === product.id ? (
                    <span className="animate-spin h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
                
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronsUpDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <div className="p-4 pt-0 border-t">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Description</h4>
                    <p className="text-sm text-muted-foreground">
                      {product.description || "Aucune description disponible"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">Détails</h4>
                    <ul className="text-sm space-y-1">
                      <li><span className="text-muted-foreground">Marque:</span> {product.brand || "Non spécifiée"}</li>
                      {!product.is_parent && (
                        <>
                          <li><span className="text-muted-foreground">Prix:</span> {formatCurrency(product.price || 0)}</li>
                          <li><span className="text-muted-foreground">Mensualité:</span> {formatCurrency(product.monthly_price || 0)}/mois</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </motion.div>
      ))}
      
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce produit ? Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? (
                <span className="flex items-center">
                  <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent rounded-full"></span>
                  Suppression...
                </span>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CollapsibleProductList;
