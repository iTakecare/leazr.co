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
  const queryClient = useQueryClient();
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>({});
  const [purchasePrice, setPurchasePrice] = useState<number | string>("");
  const [monthlyPrice, setMonthlyPrice] = useState<number | string>("");
  const [stock, setStock] = useState<number | string>("");
  const [attributesToDelete, setAttributesToDelete] = useState<ProductAttributes | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [isBulkGenerationDialogOpen, setIsBulkGenerationDialogOpen] = useState(false);
  
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false);
  const [attributeName, setAttributeName] = useState("");
  const [attributeValues, setAttributeValues] = useState<string>("");
  const [existingAttributes, setExistingAttributes] = useState<ProductVariationAttributes>({});
  
  const [isEditingAttribute, setIsEditingAttribute] = useState(false);
  const [editingAttributeName, setEditingAttributeName] = useState("");
  const [editingAttributeValues, setEditingAttributeValues] = useState("");
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  
  const hasVariationAttributes = 
    product.variation_attributes && 
    Object.keys(product.variation_attributes).length > 0;
  
  useEffect(() => {
    if (product.variation_attributes) {
      setExistingAttributes(product.variation_attributes);
    }
  }, [product.variation_attributes]);
  
  const { data: variantPrices, isLoading } = useQuery({
    queryKey: ["variant-prices", product.id],
    queryFn: () => getVariantCombinationPrices(product.id),
    enabled: !!product.id && product.is_parent === true,
  });
  
  const addVariantPriceMutation = useMutation({
    mutationFn: (data: Omit<VariantCombinationPrice, 'id' | 'created_at' | 'updated_at'>) => 
      createVariantCombinationPrice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variant-prices", product.id] });
      resetForm();
      toast.success(isEditing ? "Prix de variante mis à jour avec succès" : "Prix de variante ajouté avec succès");
      if (onPriceAdded) onPriceAdded();
      setIsEditing(false);
      setEditingVariantId(null);
    },
    onError: (error: any) => {
      console.error("Error adding variant price:", error);
      toast.error(`Erreur lors de l'ajout du prix: ${error.message}`);
    }
  });
  
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
  
  const updateAttributesMutation = useMutation({
    mutationFn: (data: { productId: string, attributes: ProductVariationAttributes }) => 
      updateProductVariationAttributes(data.productId, data.attributes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      toast.success("Attributs de variante mis à jour avec succès");
      if (onPriceAdded) onPriceAdded();
      setIsAttributeDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour des attributs: ${error.message}`);
    }
  });
  
  const removeParentPriceMutation = useMutation({
    mutationFn: (productId: string) => updateParentProductRemovePrice(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      toast.success("Prix du produit parent supprimé avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression du prix parent: ${error.message}`);
    }
  });
  
  const handleRemoveParentPrice = () => {
    removeParentPriceMutation.mutate(product.id);
  };
  
  const areAllAttributesSelected = (): boolean => {
    if (!product.variation_attributes) return false;
    
    const allSelected = Object.keys(product.variation_attributes).every(
      attrName => {
        const value = selectedAttributes[attrName];
        return value !== undefined && value !== null && value !== "";
      }
    );
    
    console.log("All attributes selected:", allSelected, "Selected attributes:", selectedAttributes);
    return allSelected;
  };
  
  const resetForm = () => {
    setSelectedAttributes({});
    setPurchasePrice("");
    setMonthlyPrice("");
    setStock("");
  };
  
  const handleAttributesChange = (attributes: ProductAttributes) => {
    console.log("Attributes changed to:", attributes);
    setSelectedAttributes(attributes);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!areAllAttributesSelected()) {
      toast.error("Veuillez sélectionner toutes les options d'attributs");
      return;
    }
    
    if (!purchasePrice) {
      toast.error("Veuillez saisir un prix d'achat");
      return;
    }
    
    const numPurchasePrice = Number(purchasePrice);
    if (isNaN(numPurchasePrice) || numPurchasePrice <= 0) {
      toast.error("Le prix d'achat doit être un nombre positif");
      return;
    }
    
    if (!isEditing) {
      const combinationExists = variantPrices?.some(variantPrice => {
        if (editingVariantId && variantPrice.id === editingVariantId) return false;
        
        const priceAttrs = variantPrice.attributes;
        return Object.keys(selectedAttributes).every(
          key => String(priceAttrs[key]).toLowerCase() === String(selectedAttributes[key]).toLowerCase()
        );
      });
      
      if (combinationExists) {
        toast.error("Cette combinaison d'attributs existe déjà");
        return;
      }
    }
    
    let stockNumber: number | undefined = undefined;
    if (stock !== "") {
      stockNumber = Number(stock);
      if (isNaN(stockNumber)) {
        stockNumber = 0;
      }
    }
    
    const newVariantPrice = {
      product_id: product.id,
      attributes: selectedAttributes,
      price: numPurchasePrice,
      monthly_price: monthlyPrice ? Number(monthlyPrice) : undefined,
      stock: stockNumber
    };
    
    if (isEditing && editingVariantId) {
      deleteVariantPriceMutation.mutate(editingVariantId);
    }
    
    console.log("Adding/updating variant price:", newVariantPrice);
    addVariantPriceMutation.mutate(newVariantPrice);
  };
  
  const confirmDelete = (id: string, attributes: ProductAttributes) => {
    setDeleteId(id);
    setAttributesToDelete(attributes);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDelete = () => {
    if (deleteId) {
      deleteVariantPriceMutation.mutate(deleteId);
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
      setAttributesToDelete(null);
    }
  };
  
  const handleEdit = (variantPrice: VariantCombinationPrice) => {
    setIsEditing(true);
    setEditingVariantId(variantPrice.id);
    setSelectedAttributes({...variantPrice.attributes});
    
    if (variantPrice.price && !isNaN(Number(variantPrice.price))) {
      setPurchasePrice(variantPrice.price);
    } else {
      setPurchasePrice("");
    }
    
    setMonthlyPrice(variantPrice.monthly_price || "");
    setStock(variantPrice.stock !== undefined ? variantPrice.stock : "");
    
    console.log("Editing variant:", variantPrice);
    console.log("Selected attributes set to:", variantPrice.attributes);
    
    const formElement = document.getElementById('variant-price-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const cancelEdit = () => {
    setIsEditing(false);
    setEditingVariantId(null);
    resetForm();
  };
  
  const generateAttributeCombinations = (): ProductAttributes[] => {
    if (!product.variation_attributes || Object.keys(product.variation_attributes).length === 0) {
      return [];
    }
    
    let result: ProductAttributes[] = [{}];
    
    Object.entries(product.variation_attributes).forEach(([attrName, values]) => {
      const newResult: ProductAttributes[] = [];
      
      result.forEach(combinationSoFar => {
        values.forEach(value => {
          newResult.push({
            ...combinationSoFar,
            [attrName]: value
          });
        });
      });
      
      result = newResult;
    });
    
    return result;
  };
  
  const generateAllVariantPrices = () => {
    const combinations = generateAttributeCombinations();
    
    if (combinations.length === 0) {
      toast.error("Aucune combinaison d'attributs possible");
      return;
    }
    
    const existingCombinations = variantPrices || [];
    
    const newCombinations = combinations.filter(combo => {
      return !existingCombinations.some(existing => {
        return Object.keys(combo).every(
          key => String(existing.attributes[key]).toLowerCase() === String(combo[key]).toLowerCase()
        );
      });
    });
    
    if (newCombinations.length === 0) {
      toast.error("Toutes les combinaisons d'attributs existent déjà");
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    const loadingToast = toast.loading(`Génération de ${newCombinations.length} prix de variantes...`);
    
    removeParentPriceMutation.mutate(product.id);
    
    newCombinations.reduce((promise, combination, index) => {
      return promise.then(() => {
        const newVariantPrice = {
          product_id: product.id,
          attributes: combination,
          price: 0,
          monthly_price: 0,
          stock: null
        };
        
        console.log(`Creating variant ${index + 1}/${newCombinations.length}:`, newVariantPrice);
        
        return createVariantCombinationPrice(newVariantPrice)
          .then(() => {
            successCount++;
            if (index % 5 === 0 || index === newCombinations.length - 1) {
              toast.loading(`Génération en cours: ${index + 1}/${newCombinations.length}`, {
                id: loadingToast
              });
            }
          })
          .catch((error) => {
            console.error(`Error creating variant ${index + 1}:`, error);
            errorCount++;
          });
      });
    }, Promise.resolve())
      .then(() => {
        toast.dismiss(loadingToast);
        
        if (successCount > 0) {
          toast.success(`${successCount} prix de variantes générés avec succès`);
          queryClient.invalidateQueries({ queryKey: ["variant-prices", product.id] });
          if (onPriceAdded) onPriceAdded();
        }
        
        if (errorCount > 0) {
          toast.error(`Échec de la génération de ${errorCount} prix de variantes`);
        }
        
        setIsBulkGenerationDialogOpen(false);
      });
  };
  
  const handleAddAttribute = () => {
    if (!attributeName.trim()) {
      toast.error("Veuillez saisir un nom d'attribut");
      return;
    }
    
    if (!attributeValues.trim()) {
      toast.error("Veuillez saisir au moins une valeur d'attribut");
      return;
    }
    
    const valuesArray = attributeValues
      .split(",")
      .map(val => val.trim())
      .filter(val => val.length > 0)
      .filter((val, index, self) => self.indexOf(val) === index);
    
    if (valuesArray.length === 0) {
      toast.error("Veuillez saisir au moins une valeur d'attribut");
      return;
    }
    
    const updatedAttributes = {
      ...existingAttributes,
      [attributeName]: valuesArray
    };
    
    setExistingAttributes(updatedAttributes);
    
    setAttributeName("");
    setAttributeValues("");
  };
  
  const handleRemoveAttribute = (attrName: string) => {
    const updatedAttributes = { ...existingAttributes };
    delete updatedAttributes[attrName];
    setExistingAttributes(updatedAttributes);
  };
  
  const handleEditAttribute = (attrName: string) => {
    const values = existingAttributes[attrName];
    setEditingAttributeName(attrName);
    setEditingAttributeValues(values.join(", "));
    setIsEditingAttribute(true);
  };
  
  const saveEditedAttribute = () => {
    if (!editingAttributeValues.trim()) {
      toast.error("Veuillez saisir au moins une valeur d'attribut");
      return;
    }
    
    const valuesArray = editingAttributeValues
      .split(",")
      .map(val => val.trim())
      .filter(val => val.length > 0)
      .filter((val, index, self) => self.indexOf(val) === index);
    
    if (valuesArray.length === 0) {
      toast.error("Veuillez saisir au moins une valeur d'attribut");
      return;
    }
    
    const updatedAttributes = { ...existingAttributes };
    delete updatedAttributes[editingAttributeName];
    
    updatedAttributes[editingAttributeName] = valuesArray;
    
    setExistingAttributes(updatedAttributes);
    cancelEditAttribute();
  };
  
  const cancelEditAttribute = () => {
    setIsEditingAttribute(false);
    setEditingAttributeName("");
    setEditingAttributeValues("");
  };
  
  const saveAttributes = () => {
    if (Object.keys(existingAttributes).length === 0) {
      toast.error("Veuillez ajouter au moins un attribut");
      return;
    }
    
    updateAttributesMutation.mutate({
      productId: product.id,
      attributes: existingAttributes
    });
  };
  
  const formatAttributes = (attributes: ProductAttributes): string => {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };
  
  if (product.is_parent !== true) {
    return (
      <div className="bg-muted p-6 rounded-md text-center">
        <Package2 className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium mb-2">Ce produit n'est pas un produit parent</h3>
        <p className="text-muted-foreground mb-4">
          Vous devez d'abord convertir ce produit en produit parent pour définir des variantes.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Attributs de variante
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={() => setIsAttributeDialogOpen(true)}
                variant="outline"
                size="sm"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier les attributs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasVariationAttributes ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(product.variation_attributes || {}).map(([attrName, values]) => (
                  <div key={attrName} className="border rounded-md p-3">
                    <h4 className="font-medium">{attrName}</h4>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {values.map((value) => (
                        <Badge key={`${attrName}-${value}`} variant="secondary" className="px-2 py-1">
                          {value}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={() => setIsBulkGenerationDialogOpen(true)}
                  variant="outline"
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Générer toutes les variantes
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                Aucun attribut de variante défini pour ce produit
              </p>
              <Button 
                onClick={() => setIsAttributeDialogOpen(true)}
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Définir des attributs
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {hasVariationAttributes && (
        <>
          <div className="space-y-6">
            <Card id="variant-price-form">
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      {isEditing ? "Modifier le prix d'achat" : "Définir un nouveau prix d'achat"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {isEditing 
                        ? "Modifiez les attributs et le prix pour cette combinaison" 
                        : "Sélectionnez les attributs et définissez le prix d'achat pour cette combinaison"}
                    </p>
                  </div>
                  
                  <VariantAttributeSelector
                    variationAttributes={product.variation_attributes || {}}
                    initialSelectedAttributes={selectedAttributes}
                    onAttributesChange={handleAttributesChange}
                    key={`attribute-selector-${isEditing ? "edit-" + editingVariantId : "new"}`}
                  />
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchase-price">Prix d'achat (€)</Label>
                      <div className="relative">
                        <Input
                          id="purchase-price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={purchasePrice}
                          onChange={(e) => setPurchasePrice(e.target.value)}
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
                  
                  <div className="flex justify-end gap-2">
                    {isEditing && (
                      <Button 
                        variant="outline" 
                        onClick={cancelEdit}
                      >
                        Annuler
                      </Button>
                    )}
                    <Button 
                      onClick={handleSubmit}
                      disabled={!areAllAttributesSelected() || !purchasePrice || addVariantPriceMutation.isPending}
                    >
                      {addVariantPriceMutation.isPending ? (
                        <span className="flex items-center">
                          <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                          {isEditing ? "Mise à jour..." : "Ajout..."}
                        </span>
                      ) : (
                        <>
                          {isEditing ? (
                            <>
                              <Edit className="mr-2 h-4 w-4" /> Mettre à jour ce prix
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" /> Ajouter ce prix
                            </>
                          )}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
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
                      <TableHead>Prix d'achat (€)</TableHead>
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
                        <TableCell>
                          {variantPrice.price 
                            ? `${variantPrice.price.toFixed(2)} €` 
                            : "-"}
                        </TableCell>
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
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(variantPrice)}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(variantPrice.id, variantPrice.attributes)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
        </>
      )}
      
      <Dialog open={isAttributeDialogOpen} onOpenChange={setIsAttributeDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Définir les attributs de variante</DialogTitle>
            <DialogDescription>
              Définissez les attributs qui vont servir à créer les variantes de ce produit.
              Par exemple: Couleur, Taille, Matière, etc.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {!isEditingAttribute ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3 md:col-span-1">
                  <Label htmlFor="attribute-name">Nom de l'attribut</Label>
                  <Input
                    id="attribute-name"
                    placeholder="Ex: Couleur, Taille..."
                    value={attributeName}
                    onChange={(e) => setAttributeName(e.target.value)}
                  />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Label htmlFor="attribute-values">Valeurs possibles</Label>
                  <Input
                    id="attribute-values"
                    placeholder="Ex: Rouge, Bleu, Vert... (séparés par des virgules)"
                    value={attributeValues}
                    onChange={(e) => setAttributeValues(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editing-attribute-name">Nom de l'attribut</Label>
                  <Input
                    id="editing-attribute-name"
                    value={editingAttributeName}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="editing-attribute-values">Valeurs possibles</Label>
                  <Input
                    id="editing-attribute-values"
                    placeholder="Ex: Rouge, Bleu, Vert... (séparés par des virgules)"
                    value={editingAttributeValues}
                    onChange={(e) => setEditingAttributeValues(e.target.value)}
                  />
                </div>
                <div className="flex space-x-2 justify-end">
                  <Button variant="outline" onClick={cancelEditAttribute}>
                    Annuler
                  </Button>
                  <Button onClick={saveEditedAttribute}>
                    Enregistrer les modifications
                  </Button>
                </div>
              </div>
            )}
            
            {!isEditingAttribute && (
              <Button type="button" onClick={handleAddAttribute} variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Ajouter cet attribut
              </Button>
            )}
            
            <Separator />
            
            <div>
              <h3 className="text-lg font-medium mb-4">Attributs définis</h3>
              
              {Object.keys(existingAttributes).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(existingAttributes).map(([attrName, values]) => (
                    <div key={attrName} className="flex items-start justify-between border rounded-md p-3">
                      <div>
                        <h4 className="font-medium">{attrName}</h4>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {values.map((value) => (
                            <Badge key={`${attrName}-${value}`} variant="secondary" className="px-2 py-1">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditAttribute(attrName)}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAttribute(attrName)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-md">
                  <p className="text-muted-foreground">
                    Aucun attribut défini
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAttributeDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={saveAttributes}
              disabled={Object.keys(existingAttributes).length === 0 || updateAttributesMutation.isPending}
            >
              {updateAttributesMutation.isPending ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                  Enregistrement...
                </span>
              ) : (
                "Enregistrer les attributs"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isBulkGenerationDialogOpen} onOpenChange={setIsBulkGenerationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer toutes les variantes</DialogTitle>
            <DialogDescription>
              Cette action va créer automatiquement toutes les combinaisons d'attributs possibles
              avec des prix aléatoires et supprimer le prix du produit parent.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="mt-2 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Nombre de combinaisons à générer: </p>
              <p className="text-2xl font-bold">
                {generateAttributeCombinations().length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Les combinaisons déjà existantes seront ignorées.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBulkGenerationDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={generateAllVariantPrices}
            >
              Générer toutes les variantes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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
