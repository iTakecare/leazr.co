
import React, { useState } from "react";
import { Product } from "@/types/catalog";
import { formatCurrency } from "@/utils/formatters";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Map for translating category names to French
const categoryTranslations: Record<string, string> = {
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

// Helper function to translate categories
const translateCategory = (category: string): string => {
  return categoryTranslations[category?.toLowerCase()] || category;
};

interface CollapsibleProductListProps {
  products: Product[];
  onDeleteProduct?: (productId: string) => void;
}

const CollapsibleProductList: React.FC<CollapsibleProductListProps> = ({ products, onDeleteProduct }) => {
  const navigate = useNavigate();
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  // Group products by parent-child relationship
  const groupedProducts = products.reduce((acc: Record<string, Product[]>, product) => {
    // If it's a variation, add to parent's list
    if (product.parent_id) {
      if (!acc[product.parent_id]) {
        acc[product.parent_id] = [];
      }
      acc[product.parent_id].push(product);
    } 
    // If it's a parent or standalone product, add to its own key
    else {
      if (!acc[product.id]) {
        acc[product.id] = [];
      }
    }
    return acc;
  }, {});

  // Get all parent products and standalone products
  const parentProducts = products.filter(p => !p.parent_id);

  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const navigateToProduct = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  // Render attributes as badges
  const renderAttributes = (product: Product) => {
    if (!product.variation_attributes) return null;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {Object.entries(product.variation_attributes).map(([key, value]) => (
          <Badge key={key} variant="outline" className="text-xs">
            {key}: {value}
          </Badge>
        ))}
      </div>
    );
  };

  const handleDeleteProduct = (productId: string) => {
    if (onDeleteProduct) {
      onDeleteProduct(productId);
    }
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted px-4 py-3 flex items-center justify-between border-b">
        <div className="grid grid-cols-5 w-full text-sm font-medium text-muted-foreground">
          <div className="col-span-2">Produit</div>
          <div>Prix</div>
          <div>Mensualité</div>
          <div className="text-right">Actions</div>
        </div>
      </div>

      <div className="divide-y">
        {parentProducts.map((product) => {
          const hasVariations = groupedProducts[product.id]?.length > 0 || product.is_parent;
          
          return (
            <div key={product.id} className="bg-white">
              <div className="px-4 py-3 grid grid-cols-5 items-center">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <span className="text-xs text-muted-foreground">No image</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      {product.category && 
                        <span className="inline-block mr-2">{translateCategory(product.category)}</span>
                      }
                      {hasVariations && (
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0">
                          {groupedProducts[product.id]?.length || 0} variantes
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  {formatCurrency(product.price)}
                </div>
                <div>
                  {product.monthly_price && formatCurrency(product.monthly_price)}/mois
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigateToProduct(product.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer ce produit ? Cette action ne peut pas être annulée.
                          {hasVariations && " Toutes les variantes seront également supprimées."}
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
                  {hasVariations && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleExpand(product.id)}
                      className="gap-1"
                    >
                      {expandedProducts[product.id] ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Masquer
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Afficher
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {hasVariations && expandedProducts[product.id] && (
                <div className="bg-muted/30 border-t">
                  {groupedProducts[product.id]?.map((variation) => (
                    <div
                      key={variation.id}
                      className="px-4 py-3 grid grid-cols-5 items-center border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <div className="col-span-2 flex items-center gap-3 pl-6">
                        <div className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                          {variation.imageUrl ? (
                            <img 
                              src={variation.imageUrl} 
                              alt={variation.name} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <span className="text-xs text-muted-foreground">No image</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{variation.name}</h4>
                          {renderAttributes(variation)}
                        </div>
                      </div>
                      <div>
                        {formatCurrency(variation.price)}
                      </div>
                      <div>
                        {variation.monthly_price && formatCurrency(variation.monthly_price)}/mois
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigateToProduct(variation.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                              <AlertDialogDescription>
                                Êtes-vous sûr de vouloir supprimer cette variante ? Cette action ne peut pas être annulée.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProduct(variation.id)}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CollapsibleProductList;
