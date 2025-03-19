
import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Product, 
  ProductAttributes, 
  ProductVariationAttributes 
} from "@/types/catalog";
import { 
  createProductVariant, 
  updateProduct, 
  findVariantByAttributes,
  parseAttributes 
} from "@/services/catalogService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, ShoppingCart, Euro } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ProductVariantManagerProps {
  product: Product;
  onVariantAdded?: () => void;
}

const ProductVariantManager: React.FC<ProductVariantManagerProps> = ({ 
  product,
  onVariantAdded
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  
  // Form data
  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [variantMonthlyPrice, setVariantMonthlyPrice] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>({});
  
  // Make sure we have variation attributes
  const variationAttributes = product.variation_attributes || {};
  
  // Create variant mutation
  const createVariantMutation = useMutation({
    mutationFn: (variantData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { attributes: ProductAttributes }) => 
      createProductVariant(product.id, variantData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", product.id] });
      resetForm();
      setIsAddVariantOpen(false);
      toast.success("Variante créée avec succès");
      if (onVariantAdded) onVariantAdded();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la création de la variante: ${error.message}`);
    }
  });
  
  // Check for variant existence mutation
  const checkVariantExistenceMutation = useMutation({
    mutationFn: (attributes: ProductAttributes) => 
      findVariantByAttributes(product.id, attributes),
    onError: (error: any) => {
      toast.error(`Erreur lors de la vérification de la variante: ${error.message}`);
    }
  });
  
  // Reset form state
  const resetForm = () => {
    setVariantName("");
    setVariantPrice("");
    setVariantMonthlyPrice("");
    setVariantStock("");
    setSelectedAttributes({});
  };
  
  // Handle attribute change
  const handleAttributeChange = (attributeName: string, value: string) => {
    setSelectedAttributes(prev => ({
      ...prev,
      [attributeName]: value
    }));
  };
  
  // Check if the current attribute combination already exists
  const checkVariantExistence = async () => {
    if (Object.keys(selectedAttributes).length === 0) {
      return false;
    }
    
    const variant = await checkVariantExistenceMutation.mutateAsync(selectedAttributes);
    return !!variant;
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!variantName || !variantPrice) {
      toast.error("Veuillez remplir tous les champs obligatoires");
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
    
    // Check if variant with same attributes already exists
    const exists = await checkVariantExistence();
    if (exists) {
      toast.error("Une variante avec ces attributs existe déjà");
      return;
    }
    
    createVariantMutation.mutate({
      name: variantName,
      price: parseFloat(variantPrice),
      monthly_price: variantMonthlyPrice ? parseFloat(variantMonthlyPrice) : undefined,
      stock: variantStock ? parseInt(variantStock, 10) : undefined,
      brand: product.brand,
      category: product.category,
      description: product.description,
      active: true,
      attributes: selectedAttributes
    });
  };
  
  // Navigate to variant details
  const handleViewVariant = (variantId: string) => {
    navigate(`/products/${variantId}`);
  };
  
  // Format attribute values for display
  const formatAttributeValues = (variant: Product) => {
    if (!variant.attributes) return "N/A";
    
    const attrs = parseAttributes(variant.attributes);
    return Object.entries(attrs)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };
  
  // Effect to update form when selected variant changes
  useEffect(() => {
    if (selectedVariantId) {
      const variant = product.variants?.find(v => v.id === selectedVariantId);
      if (variant) {
        setVariantName(variant.name);
        setVariantPrice(variant.price.toString());
        setVariantMonthlyPrice(variant.monthly_price?.toString() || "");
        setVariantStock(variant.stock?.toString() || "");
        setSelectedAttributes(parseAttributes(variant.attributes));
      }
    } else {
      resetForm();
    }
  }, [selectedVariantId, product.variants]);
  
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Variantes de produit</CardTitle>
              <CardDescription>
                Gérez les différentes versions de ce produit
              </CardDescription>
            </div>
            
            <Button onClick={() => {
              resetForm();
              setIsAddVariantOpen(true);
            }}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter une variante
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!product.variants || product.variants.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              Aucune variante disponible pour ce produit.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Attributs</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.variants.map(variant => (
                    <TableRow key={variant.id}>
                      <TableCell className="font-medium">{variant.name}</TableCell>
                      <TableCell>{formatAttributeValues(variant)}</TableCell>
                      <TableCell>{variant.price} €</TableCell>
                      <TableCell>
                        {variant.stock !== undefined 
                          ? variant.stock === 0 
                            ? <Badge variant="destructive">Épuisé</Badge> 
                            : variant.stock
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewVariant(variant.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Modifier
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Add Variant Dialog */}
      <Dialog open={isAddVariantOpen} onOpenChange={setIsAddVariantOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Ajouter une variante</DialogTitle>
            <DialogDescription>
              Créez une nouvelle variante pour ce produit avec des attributs spécifiques.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="variantName" className="required">Nom de la variante</Label>
                <Input
                  id="variantName"
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  placeholder="Nom de la variante"
                  required
                />
              </div>
              
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
                    
                    <div className="space-y-3">
                      {Object.entries(variationAttributes).map(([attrName, attrValues]) => (
                        <div key={attrName} className="space-y-2">
                          <Label htmlFor={`attr-${attrName}`} className="required">{attrName}</Label>
                          <Select
                            value={selectedAttributes[attrName]?.toString() || ""}
                            onValueChange={(value) => handleAttributeChange(attrName, value)}
                          >
                            <SelectTrigger id={`attr-${attrName}`}>
                              <SelectValue placeholder={`Sélectionner ${attrName.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {attrValues.map((value) => (
                                <SelectItem key={`${attrName}-${value}`} value={value.toString()}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddVariantOpen(false)}
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                disabled={createVariantMutation.isPending}
              >
                {createVariantMutation.isPending ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                    Création en cours...
                  </span>
                ) : "Créer la variante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductVariantManager;
