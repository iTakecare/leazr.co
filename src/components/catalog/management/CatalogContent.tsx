
import React from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "@/types/catalog";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";
import AccordionProductList from "../AccordionProductList";
import ProductGrid from "../ProductGrid";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CatalogContentProps {
  products: Product[];
  isLoading: boolean;
  error: any;
  viewMode: "grid" | "accordion";
  groupingOption: "model" | "brand" | "category";
  onProductDeleted: (productId: string) => void;
}

const CatalogContent: React.FC<CatalogContentProps> = ({
  products,
  isLoading,
  error,
  viewMode,
  groupingOption,
  onProductDeleted
}) => {
  const navigate = useNavigate();
  const [productToDelete, setProductToDelete] = React.useState<string | null>(null);
  
  const handleEditProduct = (productId: string) => {
    navigate(`/catalog/edit-product/${productId}`);
  };
  
  const confirmDelete = (productId: string) => {
    setProductToDelete(productId);
  };
  
  const handleDelete = () => {
    if (productToDelete) {
      onProductDeleted(productToDelete);
      setProductToDelete(null);
    }
  };
  
  const cancelDelete = () => {
    setProductToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              Une erreur est survenue lors du chargement des produits. Veuillez réessayer plus tard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="p-8">
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle>Aucun produit trouvé</CardTitle>
            <CardDescription>
              Commencez par ajouter des produits à votre catalogue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {products.map((product) => (
            <Card key={product.id} className="h-full flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium line-clamp-2">
                  {product.name}
                  {product.is_parent && (
                    <Badge variant="outline" className="ml-2 bg-blue-50">Variantes</Badge>
                  )}
                </CardTitle>
                <CardDescription className="line-clamp-1">
                  {product.brand || ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow pb-2">
                <div className="aspect-square rounded-md overflow-hidden bg-gray-100 mb-3">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <span className="text-gray-400">Aucune image</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm text-gray-500">Catégorie:</span>
                    <span className="ml-2 text-sm">{product.category}</span>
                  </div>
                  <div>
                    {product.is_parent ? (
                      <Badge variant="secondary">Parent</Badge>
                    ) : product.active ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <Check className="mr-1 h-3 w-3" /> Actif
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                        Inactif
                      </Badge>
                    )}
                  </div>
                </div>
                {!product.is_parent && (
                  <div className="mt-2 text-sm font-medium">
                    {product.monthly_price ? (
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-primary">
                          {formatCurrency(product.monthly_price)} /mois
                        </span>
                        <span className="text-xs text-gray-500">
                          ou {formatCurrency(product.price || 0)}
                        </span>
                      </div>
                    ) : (
                      <span>{formatCurrency(product.price || 0)}</span>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-2 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditProduct(product.id)}
                >
                  Éditer
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => confirmDelete(product.id)}
                >
                  Supprimer
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-4">
          {viewMode === "accordion" ? (
            <AccordionProductList 
              products={products}
              onDelete={confirmDelete}
              groupingOption={groupingOption === "model" ? "brand" : "category"}
            />
          ) : (
            <ProductGrid 
              products={products}
              groupBy={groupingOption === "model" ? "brand" : "category"}
              onDelete={confirmDelete}
            />
          )}
        </div>
      )}
      
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera définitivement le produit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CatalogContent;
