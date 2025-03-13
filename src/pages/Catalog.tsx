
import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Container from "@/components/layout/Container";
import { getProducts, deleteAllProducts, deleteProduct } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { Search, Plus, Filter, AlertCircle, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import CollapsibleProductList from "@/components/catalog/CollapsibleProductList";
import ProductEditor from "@/components/catalog/ProductEditor";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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

const translateCategory = (category: string): string => {
  return categoryTranslations[category.toLowerCase()] || category;
};

const Catalog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  
  const { 
    data: products = [], 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    meta: {
      onError: (err: Error) => {
        console.error("Error loading products:", err);
        toast.error("Unable to load products");
      }
    }
  });

  const deleteAllProductsMutation = useMutation({
    mutationFn: deleteAllProducts,
    onSuccess: () => {
      refetch();
      toast.success("All products have been deleted");
    },
    onError: (err: Error) => {
      console.error("Error deleting all products:", err);
      toast.error("Unable to delete all products");
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: () => {
      refetch();
      toast.success("Product has been deleted");
    },
    onError: (err: Error) => {
      console.error("Error deleting product:", err);
      toast.error("Unable to delete product");
    }
  });

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(
    new Set(products.map((product: Product) => product.category))
  ).filter(Boolean);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05
      }
    }
  };

  const onProductAdded = () => {
    setIsAddProductOpen(false);
    refetch();
    toast.success("Product added successfully");
  };

  const handleRetry = () => {
    refetch();
    toast.info("Attempting to reload products...");
  };

  const handleDeleteAllProducts = () => {
    deleteAllProductsMutation.mutate();
  };

  const handleDeleteProduct = (productId: string) => {
    deleteProductMutation.mutate(productId);
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

        {isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>Une erreur s'est produite lors du chargement des produits: {error instanceof Error ? error.message : "Erreur inconnue"}</p>
              <Button onClick={handleRetry} variant="outline" size="sm" className="self-start">
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="browse" className="mb-6">
          <TabsList>
            <TabsTrigger value="browse">Parcourir</TabsTrigger>
            <TabsTrigger value="manage">Gérer</TabsTrigger>
            <TabsTrigger value="categories">Catégories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={!selectedCategory ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Tous
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {translateCategory(category)}
                  </Button>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <CollapsibleProductList 
                  products={filteredProducts} 
                  onDeleteProduct={handleDeleteProduct}
                />
              </motion.div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun produit trouvé. {searchTerm && "Essayez de modifier votre recherche."}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="manage">
            <div className="border rounded-md p-4">
              <h2 className="text-xl font-semibold mb-4">Gestion du catalogue</h2>
              {isLoading ? (
                <div className="h-32 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : products.length > 0 ? (
                <div className="space-y-4">
                  {products.map((product: Product) => (
                    <div key={product.id} className="border-b pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {product.brand && <span className="font-semibold">{product.brand}</span>}
                            {product.brand && product.category && <span> • </span>}
                            {product.category && translateCategory(product.category)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link to={`/products/${product.id}`}>
                            <Button variant="outline" size="sm">Modifier</Button>
                          </Link>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Aucun produit dans le catalogue. Ajoutez des produits ou importez-les depuis WooCommerce.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="categories">
            <CategoryManager 
              categories={categories} 
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
