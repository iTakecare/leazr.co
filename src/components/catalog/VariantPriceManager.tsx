
import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Product, 
  ProductAttributes,
  VariantCombinationPrice
} from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Euro, Trash2, Plus, Package2 } from "lucide-react";
import { toast } from "sonner";
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
import VariantAttributeSelector from "./VariantAttributeSelector";
import { 
  getVariantCombinationPrices, 
  createVariantCombinationPrice,
  deleteVariantCombinationPrice
} from "@/services/variantPriceService";

interface VariantPriceManagerProps {
  product: Product;
  onPriceAdded?: () => void;
}

const VariantPriceManager: React.FC<VariantPriceManagerProps> = ({ 
  product,
  onPriceAdded
}) => {
  const queryClient = useQueryClient();
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>({});
  const [price, setPrice] = useState<number | string>("");
  const [monthlyPrice, setMonthlyPrice] = useState<number | string>("");
  const [stock, setStock] = useState<number | string>("");
  const [attributesToDelete, setAttributesToDelete] = useState<ProductAttributes | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const hasVariationAttributes = 
    product.variation_attributes && 
    Object.keys(product.variation_attributes).length > 0;
  
  // Get variant prices
  const { data: variantPrices, isLoading } = useQuery({
    queryKey: ["variant-prices", product.id],
    queryFn: () => getVariantCombinationPrices(product.id),
    enabled: !!product.id && product.is_parent === true,
  });
  
  // Add variant price mutation
  const addVariantPriceMutation = useMutation({
    mutationFn: (data: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>) => 
      createVariantCombinationPrice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-prices", product.id] });
      resetForm();
      toast.success("Prix de variante ajouté avec succès");
      if (onPriceAdded) onPriceAdded();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de l'ajout du prix: ${error.message}`);
    }
  });
  
  // Delete variant price mutation
  const deleteVariantPriceMutation = useMutation({
    mutationFn: (id: string) => deleteVariantCombinationPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-prices", product.id] });
      toast.success("Prix de variante supprimé avec succès");
      if (onPriceAdded) onPriceAdded();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression du prix: ${error.message}`);
    }
  });
  
  // Helper to check if all required attributes are selected
  const areAllAttributesSelected = (): boolean => {
    if (!product.variation_attributes) return false;
    
    return Object.keys(product.variation_attributes).every(
      attrName => selectedAttributes[attrName] !== undefined
    );
  };
  
  // Reset form values
  const resetForm = () => {
    setSelectedAttributes({});
    setPrice("");
    setMonthlyPrice("");
    setStock("");
  };
  
  // Handle attribute selection
  const handleAttributesChange = (attributes: ProductAttributes) => {
    setSelectedAttributes(attributes);
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!areAllAttributesSelected()) {
      toast.error("Veuillez sélectionner toutes les options d'attributs");
      return;
    }
    
    if (!price) {
      toast.error("Veuillez saisir un prix");
      return;
    }
    
    // Check if this combination already exists
    const combinationExists = variantPrices?.some(variantPrice => {
      const priceAttrs = variantPrice.attributes;
      return Object.keys(selectedAttributes).every(
        key => String(priceAttrs[key]).toLowerCase() === String(selectedAttributes[key]).toLowerCase()
      );
    });
    
    if (combinationExists) {
      toast.error("Cette combinaison d'attributs existe déjà");
      return;
    }
    
    const newVariantPrice = {
      product_id: product.id,
      attributes: selectedAttributes,
      price: Number(price),
      monthly_price: monthlyPrice ? Number(monthlyPrice) : undefined,
      stock: stock ? Number(stock) : undefined
    };
    
    addVariantPriceMutation.mutate(newVariantPrice);
  };
  
  // Prepare for delete
  const confirmDelete = (id: string, attributes: ProductAttributes) => {
    setDeleteId(id);
    setAttributesToDelete(attributes);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle delete
  const handleDelete = () => {
    if (deleteId) {
      deleteVariantPriceMutation.mutate(deleteId);
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
      setAttributesToDelete(null);
    }
  };
  
  // Format attributes for display
  const formatAttributes = (attributes: ProductAttributes): string => {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };
  
  // If there are no variation attributes defined, show a message
  if (!hasVariationAttributes) {
    return (
      <div className="bg-muted p-6 rounded-md text-center">
        <Package2 className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium mb-2">Aucun attribut de variante défini</h3>
        <p className="text-muted-foreground mb-4">
          Vous devez d'abord définir des attributs de variante pour ce produit.
        </p>
        <Button variant="outline" size="sm" disabled>
          Définir des attributs
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Définir un nouveau prix</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sélectionnez les attributs et définissez le prix pour cette combinaison
                </p>
              </div>
              
              <VariantAttributeSelector
                variationAttributes={product.variation_attributes || {}}
                initialSelectedAttributes={{}}
                onAttributesChange={handleAttributesChange}
              />
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Prix (€)</Label>
                  <div className="relative">
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="pl-8"
                      placeholder="0.00"
                    />
                    <Euro className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monthly-price">Mensualité (€/mois)</Label>
                  <div className="relative">
                    <Input
                      id="monthly-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={monthlyPrice}
                      onChange={(e) => setMonthlyPrice(e.target.value)}
                      className="pl-8"
                      placeholder="0.00"
                    />
                    <Euro className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={!areAllAttributesSelected() || !price || addVariantPriceMutation.isPending}
                >
                  {addVariantPriceMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                      Ajout...
                    </span>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" /> Ajouter ce prix
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Prix des variantes</h3>
        
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Chargement des prix...</p>
          </div>
        ) : variantPrices && variantPrices.length > 0 ? (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attributs</TableHead>
                  <TableHead>Prix (€)</TableHead>
                  <TableHead>Mensualité (€/mois)</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantPrices.map((variantPrice) => (
                  <TableRow key={variantPrice.id}>
                    <TableCell className="font-medium">
                      {formatAttributes(variantPrice.attributes)}
                    </TableCell>
                    <TableCell>{variantPrice.price.toFixed(2)} €</TableCell>
                    <TableCell>
                      {variantPrice.monthly_price 
                        ? `${variantPrice.monthly_price.toFixed(2)} €` 
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {variantPrice.stock !== undefined 
                        ? variantPrice.stock 
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(variantPrice.id, variantPrice.attributes)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 border rounded-md">
            <p className="text-muted-foreground">
              Aucun prix de variante défini pour ce produit
            </p>
          </div>
        )}
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prix de variante</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce prix pour la combinaison
              {attributesToDelete && (
                <span className="font-medium block mt-2">
                  {formatAttributes(attributesToDelete)}
                </span>
              )}
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VariantPriceManager;
