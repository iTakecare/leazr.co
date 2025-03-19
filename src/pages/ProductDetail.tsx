
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getProductById, 
  updateProduct, 
  deleteProduct, 
  uploadProductImage, 
  convertProductToParent,
  findVariantByAttributes
} from "@/services/catalogService";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Trash2, Upload, PlusCircle, MinusCircle, ChevronDown, ChevronUp, Tag, Package, Layers, Euro, X, Image, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product, ProductAttributes } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProductVariantManager from "@/components/catalog/ProductVariantManager";
import ProductSpecifications from "@/components/catalog/ProductSpecifications";

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

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttributes>({});
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [convertToParentDialogOpen, setConvertToParentDialogOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  
  // Product data query
  const productQuery = useQuery({
    queryKey: ["product", id],
    queryFn: () => {
      console.log(`Fetching product with ID: ${id}`);
      return getProductById(id!);
    },
    enabled: !!id,
    retry: 1,
    meta: {
      onSettled: (data, error) => {
        if (error) {
          console.error(`Error fetching product with ID ${id}:`, error);
          toast.error("Erreur lors du chargement du produit");
        }
      }
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit mis à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour du produit: ${error.message}`);
    }
  });
  
  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/catalog");
      toast.success("Produit supprimé avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la suppression du produit: ${error.message}`);
    }
  });
  
  // Image upload mutation
  const imageUploadMutation = useMutation({
    mutationFn: ({ file, id }: { file: File; id: string }) => 
      uploadProductImage(file, id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      setImageFiles([]);
      setImagePreviews([]);
      toast.success("Image mise à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour de l'image: ${error.message}`);
    }
  });
  
  // Convert to parent product mutation
  const convertToParentMutation = useMutation({
    mutationFn: ({ productId, modelName }: { productId: string, modelName: string }) => 
      convertProductToParent(productId, modelName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setConvertToParentDialogOpen(false);
      toast.success("Produit converti en produit parent avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la conversion du produit: ${error.message}`);
    }
  });

  // Detach from parent mutation
  const detachFromParentMutation = useMutation({
    mutationFn: (productId: string) => 
      updateProduct(productId, { 
        parent_id: null, 
        is_variation: false,
        attributes: {}
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit détaché du produit parent avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors du détachement du produit: ${error.message}`);
    }
  });
  
  // Find variant by attributes mutation
  const findVariantMutation = useMutation({
    mutationFn: ({ parentId, attributes }: { parentId: string, attributes: ProductAttributes }) => 
      findVariantByAttributes(parentId, attributes),
    onSuccess: (data) => {
      if (data) {
        setSelectedVariantId(data.id);
      } else {
        setSelectedVariantId(null);
      }
    }
  });
  
  // Initialize data when product is loaded
  useEffect(() => {
    if (productQuery.data) {
      console.log("Product data loaded:", productQuery.data);
      setFormData(productQuery.data);
      setModelName(productQuery.data.model || productQuery.data.name);
      setIsLoading(false);
      
      if (productQuery.data.image_urls) {
        setAdditionalImages(productQuery.data.image_urls);
      }
      
      // Initialize selected attributes if product is a variant
      if (productQuery.data.is_variation && productQuery.data.attributes) {
        setSelectedAttributes(productQuery.data.attributes as ProductAttributes);
      }
    } else if (productQuery.isError) {
      setIsLoading(false);
    }
  }, [productQuery.data, productQuery.isError]);
  
  // Handle input change for form fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle select change for dropdown fields
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (id) {
      updateProductMutation.mutate({ 
        id: id, 
        data: formData
      });
    }
  };
  
  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;
    
    const file = files[0];
    setImageFiles([file]);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews([reader.result as string]);
    };
    reader.readAsDataURL(file);
  };
  
  // Upload selected image
  const uploadImage = () => {
    if (imageFiles.length > 0 && id) {
      imageUploadMutation.mutate({ file: imageFiles[0], id });
    } else {
      toast.error("Veuillez sélectionner une image");
    }
  };
  
  // Remove preview image
  const removeImagePreview = () => {
    setImageFiles([]);
    setImagePreviews([]);
  };
  
  // Remove additional image
  const removeAdditionalImage = async (imageUrl: string, index: number) => {
    try {
      const newAdditionalImages = [...additionalImages];
      newAdditionalImages.splice(index, 1);
      setAdditionalImages(newAdditionalImages);
      
      if (id) {
        await updateProduct(id, { image_urls: newAdditionalImages });
        queryClient.invalidateQueries({ queryKey: ["product", id] });
        toast.success("Image supprimée avec succès");
      }
    } catch (error: any) {
      console.error("Error removing additional image:", error);
      toast.error(`Erreur lors de la suppression de l'image: ${error.message}`);
    }
  };
  
  // Navigate to parent product
  const navigateToParent = () => {
    if (formData.parent_id) {
      navigate(`/products/${formData.parent_id}`);
    }
  };
  
  // Handle attribute change for variant selection
  const handleAttributeChange = (attributeName: string, value: string) => {
    const updatedAttributes = {
      ...selectedAttributes,
      [attributeName]: value
    };
    
    setSelectedAttributes(updatedAttributes);
    
    // Try to find a matching variant with these attributes
    if (formData.parent_id && Object.keys(updatedAttributes).length > 0) {
      findVariantMutation.mutate({ 
        parentId: formData.parent_id, 
        attributes: updatedAttributes 
      });
    }
  };
  
  // Handle detach from parent
  const handleDetachFromParent = () => {
    if (id) {
      detachFromParentMutation.mutate(id);
    }
  };
  
  // Convert product to parent
  const handleConvertToParent = () => {
    if (id && modelName) {
      convertToParentMutation.mutate({ productId: id, modelName });
    } else {
      toast.error("Veuillez saisir un nom de modèle");
    }
  };
  
  // Handle navigation to selected variant
  const handleNavigateToVariant = () => {
    if (selectedVariantId) {
      navigate(`/products/${selectedVariantId}`);
    }
  };
  
  // View parent products
  const viewParentProducts = () => {
    navigate("/catalog");
  };
  
  if (isLoading) {
    return (
      <Container>
        <div className="py-8 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </Container>
    );
  }
  
  if (!productQuery.data && !isLoading) {
    return (
      <Container>
        <div className="py-8">
          <h1 className="text-2xl">Produit non trouvé</h1>
          <p className="text-muted-foreground mt-2">L'identifiant du produit est: {id}</p>
          <Button onClick={() => navigate("/catalog")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour au catalogue
          </Button>
        </div>
      </Container>
    );
  }
  
  const isParentProduct = productQuery.data?.is_parent === true;
  const isVariant = productQuery.data?.is_variation === true;
  const hasVariationAttributes = productQuery.data?.variation_attributes && 
    Object.keys(productQuery.data.variation_attributes).length > 0;
  
  return (
    <Container>
      <div className="py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => navigate("/catalog")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
          <h1 className="text-3xl font-bold">Éditer le produit</h1>
          {isVariant && formData.parent_id && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={navigateToParent}
              className="ml-auto"
            >
              <Layers className="mr-2 h-4 w-4" />
              Voir le produit parent
            </Button>
          )}
        </div>
        
        {/* Product type indicators */}
        <div className="flex flex-wrap gap-2 mb-6">
          {isParentProduct && (
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Layers className="h-4 w-4 mr-1" /> Produit parent
            </Badge>
          )}
          {isVariant && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Package className="h-4 w-4 mr-1" /> Variante
            </Badge>
          )}
          {!isParentProduct && !isVariant && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              <Package className="h-4 w-4 mr-1" /> Produit standard
            </Badge>
          )}
          {formData.model && (
            <Badge variant="secondary" className="text-sm py-1 px-3">
              Modèle: {formData.model}
            </Badge>
          )}
        </div>
        
        {/* Parent product info */}
        {isVariant && formData.parent_id && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="mr-3">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Ce produit est une variante</p>
                  <p className="text-lg font-semibold">
                    {formData.model || "Modèle inconnu"}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDetachFromParent}
                title="Détacher du produit parent"
              >
                <Unlink className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Variant selector for parent products with variants */}
        {hasVariationAttributes && !isParentProduct && formData.parent_id && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sélectionner une variante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(productQuery.data!.variation_attributes!).map(([attrName, values]) => (
                  <div key={attrName} className="space-y-2">
                    <Label htmlFor={`select-${attrName}`}>{attrName}</Label>
                    <Select
                      value={selectedAttributes[attrName]?.toString() || ""}
                      onValueChange={(value) => handleAttributeChange(attrName, value)}
                    >
                      <SelectTrigger id={`select-${attrName}`}>
                        <SelectValue placeholder={`Choisir ${attrName}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {values.map((value) => (
                          <SelectItem key={`${attrName}-${value}`} value={value.toString()}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                
                {selectedVariantId && selectedVariantId !== id && (
                  <div className="col-span-1 md:col-span-3 mt-4">
                    <Button onClick={handleNavigateToVariant}>
                      Voir cette variante
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Convert to parent product button */}
        {!isParentProduct && !isVariant && (
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setConvertToParentDialogOpen(true)}
            >
              <Layers className="mr-2 h-4 w-4" />
              Convertir en produit parent
            </Button>
          </div>
        )}
        
        <Tabs defaultValue="general">
          <TabsList className="mb-4">
            <TabsTrigger value="general">Informations générales</TabsTrigger>
            <TabsTrigger value="images">Images ({additionalImages.length + (formData.imageUrl ? 1 : 0)})</TabsTrigger>
            <TabsTrigger value="specifications">Spécifications</TabsTrigger>
            {isParentProduct && (
              <TabsTrigger value="variants">
                Variantes {productQuery.data?.variants?.length ? `(${productQuery.data.variants.length})` : ''}
              </TabsTrigger>
            )}
          </TabsList>
          
          <form onSubmit={handleSubmit}>
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" type="button">
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.
                        {isParentProduct && productQuery.data?.variants?.length && (
                          <span className="block mt-2 font-medium text-destructive">
                            Attention: Ce produit a {productQuery.data.variants.length} variantes qui seront également supprimées.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteProductMutation.mutate(id!)}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button type="submit" disabled={updateProductMutation.isPending}>
                  {updateProductMutation.isPending ? (
                    <span className="flex items-center">
                      <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                      Sauvegarde...
                    </span>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Enregistrer
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <TabsContent value="general" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du produit</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  {(isParentProduct || !isVariant) && (
                    <div className="space-y-2">
                      <Label htmlFor="model">Modèle</Label>
                      <Input
                        id="model"
                        name="model"
                        value={formData.model || ""}
                        onChange={handleInputChange}
                        placeholder="Nom du modèle"
                      />
                      <p className="text-xs text-muted-foreground">
                        Identifiant de modèle pour regrouper les variantes
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marque</Label>
                    <Select
                      value={formData.brand || ""}
                      onValueChange={(value) => handleSelectChange("brand", value)}
                    >
                      <SelectTrigger className="w-full">
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
                      value={formData.category || "other"} 
                      onValueChange={(value) => handleSelectChange("category", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {categoryTranslations[category] || category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix d'achat (€)</Label>
                    <div className="relative">
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        value={formData.price || ""}
                        onChange={handleInputChange}
                        required
                        className="pl-8"
                      />
                      <Euro className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthly_price">Mensualité (€/mois)</Label>
                    <div className="relative">
                      <Input
                        id="monthly_price"
                        name="monthly_price"
                        type="number"
                        value={formData.monthly_price || ""}
                        onChange={handleInputChange}
                        className="pl-8"
                      />
                      <Euro className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">Mensualité pour le leasing du produit</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      name="stock"
                      type="number"
                      value={formData.stock !== undefined ? formData.stock.toString() : ""}
                      onChange={handleInputChange}
                      min="0"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={5}
                      value={formData.description || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Image du produit</Label>
                  <div className="border rounded-md overflow-hidden aspect-square mb-4">
                    {formData.imageUrl || formData.image_url ? (
                      <img
                        src={(formData.imageUrl || formData.image_url) as string}
                        alt={formData.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <p className="text-muted-foreground">Aucune image</p>
                      </div>
                    )}
                  </div>
                  
                  {imagePreviews.length > 0 ? (
                    <div className="space-y-3">
                      <div className="border rounded-md overflow-hidden aspect-square relative">
                        <img
                          src={imagePreviews[0]}
                          alt="Aperçu"
                          className="w-full h-full object-contain"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={removeImagePreview}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <Button 
                        type="button" 
                        onClick={uploadImage}
                        disabled={imageUploadMutation.isPending}
                        className="w-full"
                      >
                        {imageUploadMutation.isPending ? (
                          <span className="flex items-center">
                            <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                            Téléchargement...
                          </span>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" /> Télécharger l'image
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Label htmlFor="image" className="cursor-pointer">
                        <div className="flex items-center gap-2 text-primary">
                          <Upload className="h-4 w-4" />
                          <span>Télécharger une image</span>
                        </div>
                        <input
                          id="image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                        />
                      </Label>
                    </div>
                  )}
                  
                  {isVariant && formData.attributes && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Attributs de variation</h3>
                      <div className="space-y-3 bg-muted p-4 rounded-lg">
                        {Object.entries(formData.attributes as ProductAttributes).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-2 gap-2">
                            <div className="text-sm font-medium">{key}:</div>
                            <div className="text-sm">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="images" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Images du produit</h3>
                  
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-2">Image principale</h4>
                    <div className="border rounded-md overflow-hidden aspect-video md:aspect-square w-full md:w-64 mb-4">
                      {formData.imageUrl || formData.image_url ? (
                        <img
                          src={(formData.imageUrl || formData.image_url) as string}
                          alt={formData.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <p className="text-muted-foreground">Aucune image principale</p>
                        </div>
                      )}
                    </div>
                    
                    {imagePreviews.length > 0 ? (
                      <div className="space-y-3">
                        <div className="border rounded-md overflow-hidden aspect-square relative w-full md:w-64">
                          <img
                            src={imagePreviews[0]}
                            alt="Aperçu"
                            className="w-full h-full object-contain"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={removeImagePreview}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <Button 
                          type="button" 
                          onClick={uploadImage}
                          disabled={imageUploadMutation.isPending}
                        >
                          {imageUploadMutation.isPending ? (
                            <span className="flex items-center">
                              <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                              Téléchargement...
                            </span>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" /> Télécharger l'image
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Label htmlFor="image-main" className="cursor-pointer">
                          <div className="flex items-center gap-2 text-primary">
                            <Upload className="h-4 w-4" />
                            <span>Télécharger une image principale</span>
                          </div>
                          <input
                            id="image-main"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                          />
                        </Label>
                      </div>
                    )}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-2">Images additionnelles ({additionalImages.length}/4)</h4>
                    {additionalImages.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {additionalImages.map((imageUrl, index) => (
                          <div key={index} className="relative border rounded-md overflow-hidden aspect-square">
                            <img
                              src={imageUrl}
                              alt={`${formData.name} - Image ${index + 2}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                              }}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={() => removeAdditionalImage(imageUrl, index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground mb-4">Aucune image additionnelle</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="specifications" className="space-y-6">
              <ProductSpecifications 
                productId={id!}
                initialSpecifications={productQuery.data?.specifications as Record<string, string>}
                onSpecificationsUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ["product", id] });
                }}
              />
            </TabsContent>
            
            {isParentProduct && (
              <TabsContent value="variants" className="space-y-6">
                <ProductVariantManager 
                  product={productQuery.data!} 
                  onVariantAdded={() => {
                    queryClient.invalidateQueries({ queryKey: ["product", id] });
                  }}
                />
              </TabsContent>
            )}
          </form>
        </Tabs>
      </div>
      
      {/* Convert to Parent Dialog */}
      <Dialog open={convertToParentDialogOpen} onOpenChange={setConvertToParentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir en produit parent</DialogTitle>
            <DialogDescription>
              Convertir ce produit en produit parent vous permettra d'ajouter des variantes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modelName">Nom du modèle</Label>
              <Input
                id="modelName"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Ex: MacBook Pro 14"
                required
              />
              <p className="text-xs text-muted-foreground">
                Ce nom sera utilisé pour identifier toutes les variantes de ce produit
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertToParentDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConvertToParent}
              disabled={convertToParentMutation.isPending || !modelName}
            >
              {convertToParentMutation.isPending ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                  Conversion...
                </span>
              ) : "Convertir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default ProductDetail;
