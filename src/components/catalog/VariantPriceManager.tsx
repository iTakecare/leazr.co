
import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Product, 
  ProductAttributes, 
  ProductVariationAttributes,
  VariantCombinationPrice 
} from "@/types/catalog";
import {
  createVariantCombinationPrice,
  updateVariantCombinationPrice,
  deleteVariantCombinationPrice,
  getVariantCombinationPrices
} from "@/services/variantPriceService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, ShoppingCart, Euro } from "lucide-react";
import { toast } from "sonner";
import VariantAttributeSelector from "./VariantAttributeSelector";

interface VariantPriceManagerProps {
  product: Product;
  onPriceAdded?: () => void;
}

const VariantPriceManager: React.FC<VariantPriceManagerProps> = ({ 
  product,
  onPriceAdded
}) => {
  const queryClient = useQueryClient();
  const [isAddPriceOpen, setIsAddPriceOpen] = useState(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  
  // Form data
  const [variantPrice, setVariantPrice] = useState("");
  const [variantMonthlyPrice, setVariantMonthlyPrice] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>({});
  
  // Make sure we have variation attributes
  const variationAttributes = product.variation_attributes || {};
  
  // Query for variant prices
  const variantPricesQuery = useQuery({
    queryKey: ["variant-prices", product.id],
    queryFn: () => getVariantCombinationPrices(product.id),
    enabled: !!product.id && product.is_parent === true
  });
  
  // Create price mutation
  const createPriceMutation = useMutation({
    mutationFn: (priceData: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>) => 
      createVariantCombinationPrice(priceData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-prices", product.id] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      resetForm();
      setIsAddPriceOpen(false);
      toast.success("Prix de variante créé avec succès");
      if (onPriceAdded) onPriceAdded();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la création du prix: ${error.message}`);
    }
  });
  
  // Update price mutation
  const updatePriceMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Partial<VariantCombinationPrice> }) => 
      updateVariantCombinationPrice(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-prices", product.id] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      resetForm();
      setIsEditPriceOpen(false);
      toast.success("Prix de variante mis à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour du prix: ${error.message}`);
    }
  });
  
  // Delete price mutation
  const deletePriceMutation = useMutation({
    mutationFn: (id: string) => deleteVariantCombinationPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-prices", product.id] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      toast.success("Prix de variante supprimé avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression du prix: ${error.message}`);
    }
  });
  
  // Reset form state
  const resetForm = () => {
    setVariantPrice("");
    setVariantMonthlyPrice("");
    setVariantStock("");
    setSelectedAttributes({});
    setSelectedPriceId(null);
  };
  
  // Handle attribute change
  const handleAttributeChange = (attributes: ProductAttributes) => {
    setSelectedAttributes(attributes);
  };
  
  // Format price for display
  const formatPrice = (price: number) => {
    return price.toFixed(2) + " €";
  };
  
  // Format attribute values for display
  const formatAttributeValues = (attributes: ProductAttributes) => {
    if (!attributes) return "N/A";
    
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };
  
  // Submit form for creating a new price
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!variantPrice) {
      toast.error("Veuillez saisir un prix");
      return;
    }
    
    // Check for required attributes
    const attributeNames = Object.keys(variationAttributes);
    for (const attrName of attributeNames) {
      if (!selectedAttributes[attrName]) {
        toast.error(`Veuillez sélectionner une valeur pour l'attribut "${attrName}"`);
        return;
      }
    }
    
    // Check if a price with these attributes already exists
    const existingPrice = variantPricesQuery.data?.find(p => {
      const priceAttributes = typeof p.attributes === 'string' 
        ? JSON.parse(p.attributes) 
        : p.attributes;
      
      return Object.entries(selectedAttributes).every(([key, value]) => 
        priceAttributes[key] === value
      );
    });
    
    if (existingPrice) {
      toast.error("Un prix pour cette combinaison d'attributs existe déjà");
      return;
    }
    
    createPriceMutation.mutate({
      product_id: product.id,
      price: parseFloat(variantPrice),
      monthly_price: variantMonthlyPrice ? parseFloat(variantMonthlyPrice) : undefined,
      stock: variantStock ? parseInt(variantStock, 10) : undefined,
      attributes: selectedAttributes
    });
  };
  
  // Submit form for updating a price
  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPriceId || !variantPrice) {
      toast.error("Données manquantes pour la mise à jour");
      return;
    }
    
    updatePriceMutation.mutate({
      id: selectedPriceId,
      updates: {
        price: parseFloat(variantPrice),
        monthly_price: variantMonthlyPrice ? parseFloat(variantMonthlyPrice) : undefined,
        stock: variantStock ? parseInt(variantStock, 10) : undefined
      }
    });
  };
  
  // Handle edit price
  const handleEditPrice = (price: VariantCombinationPrice) => {
    setSelectedPriceId(price.id);
    setVariantPrice(price.price.toString());
    setVariantMonthlyPrice(price.monthly_price?.toString() || "");
    setVariantStock(price.stock?.toString() || "");
    
    const attributes = typeof price.attributes === 'string'
      ? JSON.parse(price.attributes)
      : price.attributes;
    
    setSelectedAttributes(attributes || {});
    setIsEditPriceOpen(true);
  };
  
  // Handle delete price
  const handleDeletePrice = (id: string) => {
    deletePriceMutation.mutate(id);
  };
  
  const variantPrices = variantPricesQuery.data || [];
  const isLoading = variantPricesQuery.isLoading;
  
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Prix des combinaisons de variantes</CardTitle>
              <CardDescription>
                Définissez les prix pour chaque combinaison d'attributs
              </CardDescription>
            </div>
            
            <Button onClick={() => {
              resetForm();
              setIsAddPriceOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter un prix
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center p-4">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full inline-block"></div>
              <p className="mt-2 text-sm text-muted-foreground">Chargement des prix...</p>
            </div>
          ) : variantPrices.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              Aucun prix de variante défini pour ce produit.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attributs</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Mensualité</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantPrices.map(price => {
                    const attributes = typeof price.attributes === 'string'
                      ? JSON.parse(price.attributes)
                      : price.attributes;
                    
                    return (
                      <TableRow key={price.id}>
                        <TableCell className="font-medium">{formatAttributeValues(attributes)}</TableCell>
                        <TableCell>{formatPrice(price.price)}</TableCell>
                        <TableCell>{price.monthly_price ? formatPrice(price.monthly_price) : "N/A"}</TableCell>
                        <TableCell>{price.stock !== undefined ? price.stock : "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditPrice(price)}
                            >
                              <Edit className="h-4 w-4 mr-1" /> Modifier
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer ce prix de variante</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Êtes-vous sûr de vouloir supprimer ce prix ? Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeletePrice(price.id)}>
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Price Dialog */}
      <Dialog open={isAddPriceOpen} onOpenChange={setIsAddPriceOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajouter un prix de variante</DialogTitle>
            <DialogDescription>
              Définissez un prix pour une combinaison spécifique d'attributs.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="variantPrice" className="required">Prix (€)</Label>
                <div className="relative">
                  <Input
                    id="variantPrice"
                    type="number"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    className="pl-8"
                  />
                  <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="variantMonthlyPrice">Mensualité (€/mois)</Label>
                <div className="relative">
                  <Input
                    id="variantMonthlyPrice"
                    type="number"
                    value={variantMonthlyPrice}
                    onChange={(e) => setVariantMonthlyPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="pl-8"
                  />
                  <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="variantStock">Stock</Label>
                <div className="relative">
                  <Input
                    id="variantStock"
                    type="number"
                    value={variantStock}
                    onChange={(e) => setVariantStock(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="pl-8"
                  />
                  <ShoppingCart className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              {Object.keys(variationAttributes).length > 0 && (
                <>
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-3">Attributs de variante</h3>
                    
                    <VariantAttributeSelector
                      variationAttributes={variationAttributes}
                      initialSelectedAttributes={selectedAttributes}
                      onAttributesChange={handleAttributeChange}
                    />
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddPriceOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={createPriceMutation.isPending}
              >
                {createPriceMutation.isPending ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                    Création en cours...
                  </span>
                ) : "Créer le prix"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Price Dialog */}
      <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le prix de variante</DialogTitle>
            <DialogDescription>
              Modifiez le prix pour cette combinaison d'attributs.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleUpdateSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Attributs (non modifiables)</Label>
                <div className="p-3 border rounded-md bg-muted">
                  {Object.entries(selectedAttributes).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm py-1">
                      <span className="font-medium">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editVariantPrice" className="required">Prix (€)</Label>
                <div className="relative">
                  <Input
                    id="editVariantPrice"
                    type="number"
                    value={variantPrice}
                    onChange={(e) => setVariantPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                    className="pl-8"
                  />
                  <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editVariantMonthlyPrice">Mensualité (€/mois)</Label>
                <div className="relative">
                  <Input
                    id="editVariantMonthlyPrice"
                    type="number"
                    value={variantMonthlyPrice}
                    onChange={(e) => setVariantMonthlyPrice(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="pl-8"
                  />
                  <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="editVariantStock">Stock</Label>
                <div className="relative">
                  <Input
                    id="editVariantStock"
                    type="number"
                    value={variantStock}
                    onChange={(e) => setVariantStock(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="pl-8"
                  />
                  <ShoppingCart className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditPriceOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={updatePriceMutation.isPending}
              >
                {updatePriceMutation.isPending ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                    Mise à jour...
                  </span>
                ) : "Enregistrer les modifications"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VariantPriceManager;
