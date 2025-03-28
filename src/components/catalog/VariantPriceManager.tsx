
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
import { 
  Euro, 
  Trash2, 
  Plus, 
  Package2, 
  Tag, 
  Edit, 
  Grid, 
  Pencil, 
  Loader2, 
  Wand2,
  AlertCircle,
  Check
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  getVariantCombinationPrices, 
  createVariantCombinationPrice,
  deleteVariantCombinationPrice,
  updateProductVariationAttributes
} from "@/services/variantPriceService";

interface VariantPriceManagerProps {
  product: Product;
  onPriceAdded?: () => void;
}

const VariantPriceManager: React.FC<VariantPriceManagerProps> = ({ 
  product,
  onPriceAdded
}) => {
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [newMonthlyPrice, setNewMonthlyPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [isGeneratingCombinations, setIsGeneratingCombinations] = useState(false);
  
  const queryClient = useQueryClient();
  
  const { data: variantPrices, isLoading, isError, error } = useQuery({
    queryKey: ["variantPrices", product.id],
    queryFn: () => getVariantCombinationPrices(product.id)
  });
  
  const createPriceMutation = useMutation({
    mutationFn: createVariantCombinationPrice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variantPrices", product.id] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      resetForm();
      toast.success("Prix de la variante ajouté avec succès!");
      if (onPriceAdded) onPriceAdded();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de l'ajout du prix de la variante: ${error.message || "Unknown error"}`);
    },
  });
  
  const deletePriceMutation = useMutation({
    mutationFn: deleteVariantCombinationPrice,
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
  });
  
  const resetForm = () => {
    setNewPrice("");
    setNewMonthlyPrice("");
    setNewStock("");
    setSelectedAttributes({});
    setIsEditing(false);
    setEditingVariantId(null);
    setShowPriceForm(false);
  };
  
  const handleShowAddPrice = () => {
    resetForm();
    setShowPriceForm(true);
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
    
    const stringAttributes: Record<string, string> = {};
    Object.entries(selectedAttributes).forEach(([key, value]) => {
      stringAttributes[key] = String(value);
    });
    
    const variantPriceData = {
      product_id: product.id,
      attributes: stringAttributes,
      price: price,
      monthly_price: monthlyPrice,
      stock: stock
    };
    
    createPriceMutation.mutate(variantPriceData);
  };
  
  const handleDeleteVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    setIsDeleteAlertOpen(true);
  };
  
  const confirmDeleteVariant = () => {
    if (selectedVariantId) {
      deletePriceMutation.mutate(selectedVariantId);
    }
  };
  
  const handleEditVariant = (variant: VariantCombinationPrice) => {
    setIsEditing(true);
    setEditingVariantId(variant.id);
    setNewPrice(variant.price.toString());
    setNewMonthlyPrice((variant.monthly_price || '').toString());
    setNewStock((variant.stock || '').toString());
    setSelectedAttributes(variant.attributes as Record<string, string>);
    setShowPriceForm(true);
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
      resetForm();
      toast.success("Prix de la variante mis à jour avec succès!");
    } catch (error: any) {
      toast.error(`Erreur lors de la mise à jour du prix de la variante: ${error.message || "Unknown error"}`);
    }
  };
  
  // Génère toutes les combinaisons possibles des attributs
  const generateAllCombinations = () => {
    if (!product.variation_attributes || Object.keys(product.variation_attributes).length === 0) {
      toast.error("Aucun attribut de variation n'est défini pour ce produit.");
      return;
    }
    
    setIsGeneratingCombinations(true);
    
    // Fonction pour générer les combinaisons récursivement
    const generateCombinations = (
      attributes: Record<string, string[]>,
      currentIndex: number,
      currentCombination: Record<string, string>,
      results: Record<string, string>[]
    ) => {
      const attributeNames = Object.keys(attributes);
      
      // Si nous avons parcouru tous les attributs, ajoutez la combinaison actuelle aux résultats
      if (currentIndex === attributeNames.length) {
        results.push({...currentCombination});
        return;
      }
      
      const currentAttrName = attributeNames[currentIndex];
      const currentAttrValues = attributes[currentAttrName];
      
      // Parcourir toutes les valeurs pour l'attribut actuel
      for (const value of currentAttrValues) {
        currentCombination[currentAttrName] = value;
        generateCombinations(attributes, currentIndex + 1, currentCombination, results);
      }
    };
    
    const combinations: Record<string, string>[] = [];
    generateCombinations(product.variation_attributes, 0, {}, combinations);
    
    // Filtrer les combinaisons qui existent déjà
    const existingCombinations = variantPrices?.map(variant => 
      JSON.stringify(variant.attributes)
    ) || [];
    
    const newCombinations = combinations.filter(combination => 
      !existingCombinations.includes(JSON.stringify(combination))
    );
    
    if (newCombinations.length === 0) {
      toast.info("Toutes les combinaisons possibles existent déjà.");
      setIsGeneratingCombinations(false);
      return;
    }
    
    // Créer un prix par défaut pour chaque nouvelle combinaison
    const createDefaultPrice = async (attributes: Record<string, string>) => {
      try {
        await createVariantCombinationPrice({
          product_id: product.id,
          attributes,
          price: product.price || 0,
          monthly_price: product.monthly_price,
          stock: 0
        });
        return true;
      } catch (error) {
        console.error("Erreur lors de la création d'une combinaison:", error);
        return false;
      }
    };
    
    // Processus batch pour créer toutes les combinaisons
    const processBatchCreation = async () => {
      let successCount = 0;
      
      for (const combination of newCombinations) {
        const success = await createDefaultPrice(combination);
        if (success) successCount++;
      }
      
      queryClient.invalidateQueries({ queryKey: ["variantPrices", product.id] });
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      
      toast.success(`${successCount} combinaisons de variantes créées avec succès`);
      setIsGeneratingCombinations(false);
    };
    
    processBatchCreation();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Impossible de charger les prix des variantes: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <CardTitle className="text-xl">Prix des variantes</CardTitle>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button 
                variant="outline" 
                onClick={generateAllCombinations}
                disabled={isGeneratingCombinations || !product.variation_attributes || Object.keys(product.variation_attributes).length === 0}
              >
                {isGeneratingCombinations ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Générer toutes les combinaisons
              </Button>
              
              <Button onClick={handleShowAddPrice}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un prix
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Section de l'ajout/édition de prix */}
          {showPriceForm && (
            <div className="mb-6 p-4 border rounded-lg bg-slate-50">
              <h3 className="text-lg font-medium mb-4">
                {isEditing ? "Modifier le prix de la variante" : "Ajouter un nouveau prix de variante"}
              </h3>
              
              <div className="grid gap-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sélection des attributs */}
                  {product.variation_attributes && Object.entries(product.variation_attributes).map(([attributeName, attributeValues]) => (
                    <div key={attributeName} className="space-y-2">
                      <Label>{attributeName}</Label>
                      <select
                        className="w-full p-2 border rounded"
                        value={selectedAttributes[attributeName] as string || ''}
                        onChange={(e) => handleAttributeSelect(attributeName, e.target.value)}
                        disabled={isEditing}
                      >
                        <option value="">Sélectionnez une valeur</option>
                        {attributeValues.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                
                {/* Prix et stock */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                >
                  Annuler
                </Button>
                <Button 
                  type="button" 
                  onClick={isEditing ? handleUpdatePrice : handlePriceSubmit}
                  disabled={createPriceMutation.isPending}
                >
                  {createPriceMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    isEditing ? "Mettre à jour" : "Ajouter"
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Liste des prix de variantes */}
          {variantPrices && variantPrices.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attributs</TableHead>
                    <TableHead className="text-right">Prix</TableHead>
                    <TableHead className="text-right">Mensualité</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(variantPrices) && variantPrices.map((variant) => (
                    <TableRow key={variant.id}>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {variant.attributes && Object.entries(variant.attributes || {}).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="mr-1">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{variant.price} €</TableCell>
                      <TableCell className="text-right">{variant.monthly_price ? `${variant.monthly_price} €` : "-"}</TableCell>
                      <TableCell className="text-center">{variant.stock || "-"}</TableCell>
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
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 border rounded-lg bg-slate-50">
              <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun prix de variante défini</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                Aucun prix de variante n'a été ajouté pour ce produit. Utilisez le bouton ci-dessus 
                pour définir manuellement des prix de variantes ou générer automatiquement toutes les combinaisons possibles.
              </p>
              {(!product.variation_attributes || Object.keys(product.variation_attributes).length === 0) && (
                <Alert className="max-w-md mx-auto mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Attention</AlertTitle>
                  <AlertDescription>
                    Vous devez d'abord définir des attributs de variation dans l'onglet "Attributs" 
                    avant de pouvoir ajouter des prix de variantes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
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
            <AlertDialogAction 
              onClick={confirmDeleteVariant} 
              disabled={deletePriceMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deletePriceMutation.isPending ? (
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
