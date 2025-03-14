
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Container from "@/components/layout/Container";
import { deleteAllProducts, deleteProduct } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Plus, Trash2 } from "lucide-react";
import CollapsibleProductList from "@/components/catalog/CollapsibleProductList";
import ProductEditor from "@/components/catalog/ProductEditor";
import { toast } from "sonner";
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
import CategoryManager from "@/components/catalog/CategoryManager";
import ProductCatalog from "@/components/ui/ProductCatalog";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/catalogService";

// Map for translating category names to French
const categoryTranslations: Record<string, string> = {
  "all": "Tous",
  "laptop": "Ordinateur portable",
  "desktop": "Ordinateur de bureau",
  "tablet": "Tablette",
  "smartphone": "Smartphone",
  "accessories": "Accessoires",
  "printer": "Imprimante",
  "monitor": "Écran",
  "software": "Logiciel",
  "networking": "Réseau",
  "server": "Serveur",
  "storage": "Stockage",
  "other": "Autre"
};

const Catalog = () => {
  const navigate = useNavigate();
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  
  // Cette requête est juste pour avoir un refetch à transmettre au ProductCatalog
  const { refetch } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    enabled: false
  });

  const deleteAllProductsMutation = useMutation({
    mutationFn: deleteAllProducts,
    onSuccess: () => {
      refetch();
      toast.success("Tous les produits ont été supprimés");
    },
    onError: (err: Error) => {
      console.error("Erreur lors de la suppression des produits:", err);
      toast.error("Impossible de supprimer tous les produits");
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      refetch();
      toast.success("Le produit a été supprimé");
    },
    onError: (err: Error) => {
      console.error("Erreur lors de la suppression du produit:", err);
      toast.error("Impossible de supprimer le produit");
    }
  });

  const onProductAdded = () => {
    setIsAddProductOpen(false);
    refetch();
    toast.success("Produit ajouté avec succès");
  };

  const handleDeleteAllProducts = () => {
    deleteAllProductsMutation.mutate();
  };

  const handleDeleteProduct = (productId: string) => {
    deleteProductMutation.mutate(productId);
  };

  const handleSelectProduct = (product: Product) => {
    navigate(`/products/${product.id}`);
  };

  return (
    <Container>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Catalogue de produits</h1>
          <div className="flex gap-2">
            <Button onClick={() => setIsAddProductOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un produit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer tous les produits
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer tous les produits du catalogue? Cette action ne peut pas être annulée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllProducts}>
                    Supprimer tous les produits
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <Tabs defaultValue="browse" className="mb-6">
          <TabsList>
            <TabsTrigger value="browse">Parcourir</TabsTrigger>
            <TabsTrigger value="manage">Gérer</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="space-y-4">
            {/* Utiliser le composant ProductCatalog réutilisable ici en mode page (isSheet=false) */}
            <ProductCatalog 
              isOpen={true} 
              onClose={() => {}}
              onSelectProduct={handleSelectProduct}
              isSheet={false}
              title="Catalogue de produits"
              description="Parcourez notre catalogue complet de produits technologiques"
            />
          </TabsContent>
          
          <TabsContent value="manage">
            <div className="border rounded-md p-4">
              <h2 className="text-xl font-semibold mb-4">Gestion du catalogue</h2>
              <CollapsibleProductList 
                onDeleteProduct={handleDeleteProduct}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="categories">
            <CategoryManager 
              categories={Object.keys(categoryTranslations).filter(cat => cat !== "all")}
              categoryTranslations={categoryTranslations}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ProductEditor 
        isOpen={isAddProductOpen} 
        onClose={() => setIsAddProductOpen(false)} 
        onSuccess={onProductAdded}
      />
    </Container>
  );
};

export default Catalog;
