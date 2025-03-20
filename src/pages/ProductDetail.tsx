import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getProductById, 
  updateProduct, 
  deleteProduct, 
  uploadProductImage, 
  convertProductToParent
} from "@/services/catalogService";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Trash2, Upload, Layers, Euro, X, Unlink, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product, VariantCombinationPrice } from "@/types/catalog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductVariantManager from "@/components/catalog/ProductVariantManager";
import ProductSpecifications from "@/components/catalog/ProductSpecifications";
import ProductVariantViewer from "@/components/catalog/ProductVariantViewer";

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

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [convertToParentDialogOpen, setConvertToParentDialogOpen] = useState(false);
  const [modelName, setModelName] = useState("");
  const [selectedVariantPrice, setSelectedVariantPrice] = useState<VariantCombinationPrice | null>(null);
  const [totalImages, setTotalImages] = useState(0);
  
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

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => {
      const productData = { ...data };
      
      if ('variants' in productData) delete productData.variants;
      if ('variant_combination_prices' in productData) delete productData.variant_combination_prices;
      
      return updateProduct(id, productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit mis à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour du produit: ${error.message}`);
    }
  });
  
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
  
  const imageUploadMutation = useMutation({
    mutationFn: ({ file, id, isMain = false }: { file: File; id: string; isMain?: boolean }) => 
      uploadProductImage(file, id, isMain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      setImageFiles([]);
      setImagePreviews([]);
      setAdditionalImageFiles([]);
      setAdditionalImagePreviews([]);
      toast.success("Image mise à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour de l'image: ${error.message}`);
    }
  });
  
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
  
  useEffect(() => {
    if (productQuery.data) {
      console.log("Product data loaded:", productQuery.data);
      setFormData(productQuery.data);
      setModelName(productQuery.data.model || productQuery.data.name);
      setIsLoading(false);
      
      let imageCount = 0;
      
      if (productQuery.data.imageUrl || productQuery.data.image_url) {
        imageCount++;
      }
      
      const additionalImgs = Array.isArray(productQuery.data.image_urls) 
        ? productQuery.data.image_urls.filter(url => url && url.trim() !== '')
        : [];
      
      setAdditionalImages(additionalImgs);
      setTotalImages(imageCount + additionalImgs.length);
      
      console.log(`Total images: ${imageCount + additionalImgs.length} (Main: ${imageCount ? 1 : 0}, Additional: ${additionalImgs.length})`);
      console.log("Additional images:", additionalImgs);
    } else if (productQuery.isError) {
      setIsLoading(false);
    }
  }, [productQuery.data, productQuery.isError]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (id) {
      updateProductMutation.mutate({ 
        id: id, 
        data: formData
      });
    }
  };
  
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
  
  const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;
    
    const remainingSlots = 5 - totalImages - additionalImageFiles.length;
    if (remainingSlots <= 0) {
      toast.error("Vous avez atteint la limite de 5 images par produit");
      return;
    }
    
    const newFiles = Array.from(files).slice(0, remainingSlots);
    setAdditionalImageFiles(prev => [...prev, ...newFiles]);
    
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdditionalImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const uploadImage = () => {
    if (imageFiles.length > 0 && id) {
      imageUploadMutation.mutate({ file: imageFiles[0], id, isMain: true });
    } else {
      toast.error("Veuillez sélectionner une image");
    }
  };
  
  const uploadAdditionalImages = () => {
    if (additionalImageFiles.length === 0 || !id) {
      toast.error("Veuillez sélectionner au moins une image additionnelle");
      return;
    }
    
    for (const file of additionalImageFiles) {
      imageUploadMutation.mutate({ file, id, isMain: false });
    }
  };
  
  const removeImagePreview = () => {
    setImageFiles([]);
    setImagePreviews([]);
  };
  
  const removeAdditionalImagePreview = (index: number) => {
    setAdditionalImageFiles(prev => prev.filter((_, i) => i !== index));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeAdditionalImage = async (imageUrl: string, index: number) => {
    try {
      const newAdditionalImages = [...additionalImages];
      newAdditionalImages.splice(index, 1);
      setAdditionalImages(newAdditionalImages);
      setTotalImages(prev => prev - 1);
      
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
  
  const navigateToParent = () => {
    if (formData.parent_id) {
      navigate(`/products/${formData.parent_id}`);
    }
  };
  
  const handleDetachFromParent = () => {
    if (id) {
      detachFromParentMutation.mutate(id);
    }
  };
  
  const handleConvertToParent = () => {
    if (id && modelName) {
      convertToParentMutation.mutate({ productId: id, modelName });
    } else {
      toast.error("Veuillez saisir un nom de modèle");
    }
  };
  
  const handleVariantPriceSelect = (price: VariantCombinationPrice | null) => {
    setSelectedVariantPrice(price);
  };
  
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
  
  const availableImageSlots = 5 - totalImages;
  
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
        
        <div className="flex flex-wrap gap-2 mb-6">
          {isParentProduct && (
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Layers className="h-4 w-4 mr-1" /> Produit parent
            </Badge>
          )}
          {isVariant && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              Variante
            </Badge>
          )}
          {!isParentProduct && !isVariant && (
            <Badge variant="outline" className="text-sm py-1 px-3">
              Produit standard
            </Badge>
          )}
          {formData.model && (
            <Badge variant="secondary" className="text-sm py-1 px-3">
              Modèle: {formData.model}
            </Badge>
          )}
        </div>
        
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
            <TabsTrigger value="images">Images ({totalImages})</TabsTrigger>
            <TabsTrigger value="specifications">Spécifications</TabsTrigger>
            {isParentProduct && (
              <TabsTrigger value="variants">
                Variantes et Prix
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
                      value={formData.description || ""}
                      onChange={handleInputChange}
                      className="min-h-[250px]"
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
                          console.error("Error loading main image:", (formData.imageUrl || formData.image_url));
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
                  
                  {selectedVariantPrice && (
                    <div className="mt-6 p-4 border rounded-md bg-muted">
                      <h3 className="text-lg font-medium mb-2">Prix sélectionné</h3>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1">
                          <span className="text-sm font-medium">Prix:</span>
                          <span className="text-sm">{selectedVariantPrice.price.toFixed(2)} €</span>
                        </div>
                        {selectedVariantPrice.monthly_price && (
                          <div className="grid grid-cols-2 gap-1">
                            <span className="text-sm font-medium">Mensualité:</span>
                            <span className="text-sm">{selectedVariantPrice.monthly_price.toFixed(2)} €/mois</span>
                          </div>
                        )}
                        {selectedVariantPrice.stock !== undefined && (
                          <div className="grid grid-cols-2 gap-1">
                            <span className="text-sm font-medium">Stock:</span>
                            <span className="text-sm">{selectedVariantPrice.stock}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="images" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Images du produit ({totalImages}/5)</h3>
                  
                  <div className="mb-6">
                    <h4 className="text-md font-medium mb-2">Image principale</h4>
                    <div className="border rounded-md overflow-hidden aspect-video md:aspect-square w-full md:w-64 mb-4">
                      {formData.imageUrl || formData.image_url ? (
                        <img
                          src={(formData.imageUrl || formData.image_url) as string}
                          alt={formData.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            console.error("Error loading main image:", (formData.imageUrl || formData.image_url));
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
                    <h4 className="text-md font-medium mb-2">Images additionnelles ({additionalImages.length})</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {additionalImages.length > 0 && additionalImages.map((imageUrl, index) => (
                        <div key={`additional-${index}`} className="relative border rounded-md overflow-hidden aspect-square">
                          <img
                            src={imageUrl}
                            alt={`${formData.name} - Image ${index + 2}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error("Error loading additional image:", imageUrl);
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
                      
                      {additionalImagePreviews.map((preview, index) => (
                        <div key={`preview-${index}`} className="relative border rounded-md overflow-hidden aspect-square">
                          <img
                            src={preview}
                            alt={`Aperçu ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => removeAdditionalImagePreview(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {availableImageSlots > 0 && (
                        <div 
                          className="border border-dashed rounded-md flex items-center justify-center cursor-pointer aspect-square bg-muted/50" 
                          onClick={() => document.getElementById("additional-image-upload")?.click()}
                        >
                          <div className="text-center space-y-1">
                            <Plus className="mx-auto h-6 w-6 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Ajouter</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <input
                      id="additional-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAdditionalImageChange}
                      multiple
                    />
                    
                    {additionalImageFiles.length > 0 && (
                      <Button 
                        type="button" 
                        onClick={uploadAdditionalImages}
                        disabled={imageUploadMutation.isPending}
                        className="mt-2"
                      >
                        {imageUploadMutation.isPending ? (
                          <span className="flex items-center">
                            <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                            Téléchargement...
                          </span>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" /> Télécharger les images additionnelles ({additionalImageFiles.length})
                          </>
                        )}
                      </Button>
                    )}
                    
                    {additionalImages.length === 0 && additionalImagePreviews.length === 0 && (
                      <p className="text-muted-foreground">Aucune image additionnelle</p>
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
      
      <Dialog open={convertToParentDialogOpen} onOpenChange={setConvertToParentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir en produit parent</DialogTitle>
            <DialogDescription>
              Convertir ce produit en produit parent vous permettra de définir des prix pour différentes combinaisons d'attributs.
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
