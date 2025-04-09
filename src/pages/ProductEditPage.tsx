import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, updateProduct, deleteProduct } from "@/services/catalogService";
import { useProductById } from "@/hooks/products/useProductById";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import {
  ArrowLeft,
  Loader2,
  Info,
  ImageIcon,
  Layers,
  Copy,
  Trash2,
  Save
} from "lucide-react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import ProductVariantManager from "@/components/catalog/ProductVariantManager";
import ProductImageManager from "@/components/catalog/ProductImageManager";
import { Checkbox } from "@/components/ui/checkbox";

const productCategories = [
  "laptop",
  "desktop",
  "tablet",
  "smartphone",
  "accessories",
  "printer",
  "monitor",
  "software",
  "networking",
  "server",
  "storage",
  "other"
];

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

const popularBrands = [
  "Apple",
  "Samsung",
  "HP",
  "Dell",
  "Lenovo",
  "Asus",
  "Acer",
  "Microsoft",
  "Sony",
  "LG",
  "Huawei",
  "Canon",
  "Xerox",
  "Logitech",
  "Brother",
  "Autre"
];

const ProductEditPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Product>>({
    name: "",
    description: "",
    category: "",
    brand: "",
    price: 0,
    monthly_price: 0,
    stock: 0,
    active: true
  });
  
  const [activeTab, setActiveTab] = useState("details");
  const [updatingMainImage, setUpdatingMainImage] = useState(false);
  
  const { product, isLoading, error, updateLocalProduct } = useProductById(id || "");
  
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        category: product.category,
        brand: product.brand,
        price: product.price,
        monthly_price: product.monthly_price || 0,
        stock: product.stock || 0,
        active: product.active !== undefined ? product.active : true,
        specifications: product.specifications || {},
        is_parent: product.is_parent || false,
        variation_attributes: product.variation_attributes || {},
        admin_only: product.admin_only || false
      });
    }
  }, [product, id]);
  
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Product>) => updateProduct(id || "", data),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (updatedProduct) {
        updateLocalProduct(updatedProduct);
      }
      toast.success("Produit mis à jour avec succès");
    },
    onError: (error: any) => {
      console.error("Error in updateProduct:", error);
      toast.error(`Erreur lors de la mise à jour: ${error.message || "Erreur inconnue"}`);
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(id || ""),
    onSuccess: () => {
      toast.success("Produit supprimé avec succès");
      navigate("/catalog");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression: ${error.message}`);
    }
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "number") {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      toast.info("Mise à jour du produit en cours...");
      await updateMutation.mutateAsync(formData);
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  };
  
  const handleDelete = () => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
      deleteMutation.mutate();
    }
  };

  const handleCopyId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      toast.success("ID copié dans le presse-papier");
    }
  };
  
  const handleImageChange = (images: any[]) => {
    console.log("Images mises à jour:", images);
  };
  
  const handleSetMainImage = async (imageUrl: string) => {
    if (!id) return;
    
    try {
      setUpdatingMainImage(true);
      toast.loading("Mise à jour de l'image principale...");
      
      const result = await updateMutation.mutateAsync({
        image_url: imageUrl
      });
      
      updateLocalProduct({ image_url: imageUrl });
      
      toast.dismiss();
      toast.success("Image principale définie avec succès");
    } catch (error) {
      console.error("Error setting main image:", error);
      toast.dismiss();
      toast.error("Erreur lors de la définition de l'image principale");
    } finally {
      setUpdatingMainImage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 text-red-500">
        Erreur: {(error as Error).message}
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/catalog")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Modifier le produit</h1>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto mb-6">
          <TabsTrigger value="details">
            <Info className="h-4 w-4 mr-2" />
            Informations
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            Images
          </TabsTrigger>
          <TabsTrigger value="variants">
            <Layers className="h-4 w-4 mr-2" />
            Variantes
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Informations du produit</CardTitle>
              <CardDescription>
                Modifiez les informations de base du produit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyId}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copier l'ID
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {id}
                    </span>
                  </div>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du produit</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brand">Marque</Label>
                  <Select 
                    name="brand" 
                    value={formData.brand || ""} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, brand: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une marque" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select 
                    name="category" 
                    value={formData.category || ""} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {productCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {categoryTranslations[cat] || cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix (€)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      value={formData.price?.toString() || "0"}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthly_price">Mensualité (€/mois)</Label>
                    <Input
                      id="monthly_price"
                      name="monthly_price"
                      type="number"
                      value={formData.monthly_price?.toString() || "0"}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    value={formData.stock?.toString() || "0"}
                    onChange={handleChange}
                    min="0"
                    step="1"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="admin_only" 
                    checked={formData.admin_only} 
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, admin_only: !!checked }))}
                  />
                  <Label htmlFor="admin_only" className="text-sm font-medium cursor-pointer">
                    Réserver aux administrateurs et ambassadeurs
                  </Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description || ""}
                    onChange={handleChange}
                    rows={6}
                  />
                </div>
                
                <div className="flex justify-end">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Images du produit</CardTitle>
              <CardDescription>
                Gérez les images du produit. Définissez une image principale en cliquant sur le bouton ✓.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {id && (
                <ProductImageManager
                  productId={id}
                  onChange={handleImageChange}
                  onSetMainImage={handleSetMainImage}
                  currentMainImage={product?.image_url}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="variants">
          <Card>
            <CardHeader>
              <CardTitle>Variantes du produit</CardTitle>
              <CardDescription>
                Gérez les variantes de ce produit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {id && product && (
                <ProductVariantManager
                  product={product}
                  onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ["product", id] });
                  }}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductEditPage;
