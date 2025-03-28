import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Product, 
  ProductAttributes,
  ProductVariationAttributes,
  VariantCombinationPrice
} from "@/types/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Euro, Trash2, Plus, Package2, Tag, Edit, Grid, Pencil } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import VariantAttributeSelector from "./VariantAttributeSelector";
import { 
  getVariantCombinationPrices, 
  createVariantCombinationPrice,
  deleteVariantCombinationPrice,
  updateProductVariationAttributes,
  updateParentProductRemovePrice
} from "@/services/variantPriceService";
import { Badge } from "@/components/ui/badge";

interface VariantPriceManagerProps {
  product: Product;
  onPriceAdded?: () => void;
}

const VariantPriceManager: React.FC<VariantPriceManagerProps> = ({ 
  product,
  onPriceAdded
}) => {
  const [open, setOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [newMonthlyPrice, setNewMonthlyPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  const { data: variantPrices, isLoading, isError, error } = useQuery(
    ["variantPrices", product.id],
    () => getVariantCombinationPrices(product.id)
  );
  
  const { mutate: createPriceMutation, isLoading: isCreateLoading } = useMutation(
    createVariantCombinationPrice,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["variantPrices", product.id] });
        queryClient.invalidateQueries({ queryKey: ["product", product.id] });
        setOpen(false);
        setNewPrice("");
        setNewMonthlyPrice("");
        setNewStock("");
        setSelectedAttributes({});
        toast.success("Prix de la variante ajouté avec succès!");
        if (onPriceAdded) onPriceAdded();
      },
      onError: (error: any) => {
        toast.error(`Erreur lors de l'ajout du prix de la variante: ${error.message || "Unknown error"}`);
      },
    }
  );
  
  const { mutate: deletePriceMutation, isLoading: isDeleteLoading } = useMutation(
    deleteVariantCombinationPrice,
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["variantPrices", product.id] });
        queryClient.invalidateQueries({ queryKey: ["product", product.id] });
        setIsDeleteAlertOpen(false);
        setSelectedVariantId(null);
        toast.success("Prix de la variante supprimé avec succès!");
      },
      onError: (error: any) => {
        toast.error(`Erreur lors de la suppression du prix de la variante: ${error.message || "Unknown error"}`);
      },
    }
  );
  
  const handleOpenChange = () => {
    setOpen(!open);
    if (!open) {
      setNewPrice("");
      setNewMonthlyPrice("");
      setNewStock("");
      setSelectedAttributes({});
      setIsEditing(false);
      setEditingVariantId(null);
    }
  };
  
  const handleAttributeSelect = (attributeName: string, attributeValue: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: attributeValue
    }));
  };
  
  const handlePriceSubmit = async () => {
    if (!newPrice || Object.keys(selectedAttributes).length === 0) {
      toast.error("Veuillez remplir tous les champs et sélectionner les attributs.");
      return;
    }
    
    const price = parseFloat(newPrice);
    const monthlyPrice = newMonthlyPrice ? parseFloat(newMonthlyPrice) : undefined;
    const stock = newStock ? parseInt(newStock, 10) : undefined;
    
    if (isNaN(price)) {
      toast.error("Veuillez entrer un prix valide.");
      return;
    }
    
    const variantPriceData = {
      product_id: product.id,
      attributes: selectedAttributes,
      price: price,
      monthly_price: monthlyPrice,
      stock: stock
    };
    
    createPriceMutation(variantPriceData);
  };
  
  const handleDeleteVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDeleteVariant = () => {
    if (selectedVariantId) {
      deletePriceMutation(selectedVariantId);
    }
  };
  
  const handleEditVariant = (variant: VariantCombinationPrice) => {
    setIsEditing(true);
    setEditingVariantId(variant.id);
    setNewPrice(variant.price.toString());
    setNewMonthlyPrice((variant.monthly_price || '').toString());
    setNewStock((variant.stock || '').toString());
    setSelectedAttributes(variant.attributes);
    setOpen(true);
  };
  
  const handleUpdatePrice = async () => {
    if (!newPrice) {
      toast.error("Veuillez entrer un prix.");
      return;
    }
    
    const price = parseFloat(newPrice);
    const monthlyPrice = newMonthlyPrice ? parseFloat(newMonthlyPrice) : undefined;
    const stock = newStock ? parseInt(newStock, 10) : undefined;
    
    if (isNaN(price)) {
      toast.error("Veuillez entrer un prix valide.");
      return;
    }
    
    if (!editingVariantId) {
      toast.error("ID de variante invalide.");
      return;
    }
    
    const updates = {
      price: price,
      monthly_price: monthlyPrice,
      stock: stock
    };
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase
        .from('product_variant_prices')
        .update(updates)
        .eq('id', editingVariantId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating variant price:', error);
        throw new Error(error.message);
      }
      
      queryClient.invalidateQueries({ queryKey: ["variantPrices", product.id] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      setOpen(false);
      setNewPrice("");
      setNewMonthlyPrice("");
      setNewStock("");
      setSelectedAttributes({});
      setIsEditing(false);
      setEditingVariantId(null);
      toast.success("Prix de la variante mis à jour avec succès!");
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour du prix de la variante: ${error.message || "Unknown error"}`);
    }
  };
  
  const getAttributeOptions = (attributeName: string): string[] => {
    if (!product.variation_attributes || !product.variation_attributes[attributeName]) {
      return [];
    }
    return product.variation_attributes[attributeName];
  };
  
  if (isLoading) {
    return <p>Chargement des prix des variantes...</p>;
  }
  
  if (isError) {
    return <p>Error: {(error as Error).message}</p>;
  }
  
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Prix des variantes</CardTitle>
            <Button onClick={handleOpenChange}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un prix
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {variantPrices && variantPrices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attributs</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Mensualité</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantPrices.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      {Object.entries(variant.attributes).map(([key, value]) => (
                        <div key={key}>
                          <Badge className="mr-1">{key}:</Badge>
                          {value}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>{variant.price}</TableCell>
                    <TableCell>{variant.monthly_price || "-"}</TableCell>
                    <TableCell>{variant.stock || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVariant(variant)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVariant(variant.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>Aucun prix de variante n'a été ajouté pour ce produit.</p>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Modifier le prix de la variante" : "Ajouter un prix de variante"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Modifiez les détails de la variante." : "Créez un nouveau prix pour une combinaison d'attributs."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {product.variation_attributes && Object.entries(product.variation_attributes).map(([attributeName, attributeValues]) => (
              <div key={attributeName}>
                <Label>{attributeName}</Label>
                <VariantAttributeSelector
                  attributeName={attributeName}
                  attributeOptions={getAttributeOptions(attributeName)}
                  selectedAttribute={selectedAttributes[attributeName] as string}
                  onAttributeSelect={handleAttributeSelect}
                />
              </div>
            ))}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="price">Prix</Label>
                <Input
                  type="number"
                  id="price"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="monthly_price">Mensualité</Label>
                <Input
                  type="number"
                  id="monthly_price"
                  value={newMonthlyPrice}
                  onChange={(e) => setNewMonthlyPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock</Label>
                <Input
                  type="number"
                  id="stock"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={handleOpenChange}>
              Annuler
            </Button>
            <Button type="submit" onClick={isEditing ? handleUpdatePrice : handlePriceSubmit} disabled={isCreateLoading}>
              {isCreateLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                isEditing ? "Mettre à jour le prix" : "Ajouter le prix"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le prix de la variante.
              Êtes-vous sûr(e) de vouloir continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedVariantId(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteVariant} disabled={isDeleteLoading}>
              {isDeleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
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

export default VariantPriceManager;
