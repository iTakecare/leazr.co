import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, updateProduct, deleteProduct } from "@/services/catalogService";
import { uploadProductImage } from "@/services/imageService";
import { ensureStorageBucket } from "@/services/storageService";
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
  Save,
  X,
  Plus,
  Upload
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
  CardFooter,
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
import { supabase } from "@/integrations/supabase/client";

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
  
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  
  useEffect(() => {
    const initStorageBucket = async () => {
      try {
        console.log("Checking product-images bucket");
        const bucketExists = await ensureStorageBucket("product-images");
        if (bucketExists) {
          console.log("product-images bucket verified successfully");
        } else {
          console.error("Could not verify product-images bucket");
          toast.error("Error preparing image storage");
        }
      } catch (error) {
        console.error("Error initializing product-images bucket:", error);
        toast.error("Error preparing image storage");
      }
    };
    
    initStorageBucket();
  }, []);
  
  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: !!id
  });
  
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
        variation_attributes: product.variation_attributes || {}
      });
      
      loadProductImages();
    }
  }, [product, id]);

  const loadProductImages = async () => {
    if (!id) return;
    
    setIsLoadingImages(true);
    try {
      const { data: files, error } = await supabase
        .storage
        .from('product-images')
        .list(`${id}`);
      
      if (error) {
        console.error("Error loading product images:", error);
        toast.error("Impossible de charger les images du produit");
        setIsLoadingImages(false);
        return;
      }
      
      const imageFiles = files.filter(file => !file.name.endsWith('/') && file.name !== '.emptyFolderPlaceholder');
      
      if (imageFiles.length === 0) {
        console.log("No images found for product in bucket");
        setImagePreviews([]);
        setIsLoadingImages(false);
        return;
      }
      
      const imageUrls = imageFiles.map(file => {
        const { data } = supabase
          .storage
          .from('product-images')
          .getPublicUrl(`${id}/${file.name}`);
        
        return data.publicUrl;
      });
      
      console.log("Loaded product images from storage:", imageUrls);
      setImagePreviews(imageUrls);
    } catch (error) {
      console.error("Error in loadProductImages:", error);
      toast.error("Impossible de charger les images du produit");
    } finally {
      setIsLoadingImages(false);
    }
  };
  
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Product>) => updateProduct(id || "", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit mis à jour avec succès");
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
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
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    console.log(`Selected ${files.length} new image files`);
    const newFiles = Array.from(files);
    setImageFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [
          ...prev,
          reader.result as string
        ]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = async (index: number) => {
    if (!id) return;
    
    const imageUrl = imagePreviews[index];
    if (imageUrl.startsWith('data:')) {
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
      return;
    }
    
    try {
      setIsUploading(true);
      
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      
      const { error } = await supabase
        .storage
        .from('product-images')
        .remove([`${id}/${fileName}`]);
      
      if (error) {
        console.error("Error deleting image:", error);
        toast.error("Erreur lors de la suppression de l'image");
        return;
      }
      
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
      toast.success("Image supprimée avec succès");
    } catch (error) {
      console.error("Error removing image:", error);
      toast.error("Erreur lors de la suppression de l'image");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleUploadImages = async () => {
    if (!id || imageFiles.length === 0) return;
    
    try {
      setIsUploading(true);
      toast.info(`Téléchargement de ${imageFiles.length} image(s)...`);
      
      const bucketReady = await ensureStorageBucket("product-images");
      if (!bucketReady) {
        toast.error("Impossible de préparer le stockage pour les images");
        setIsUploading(false);
        return;
      }
      
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt) {
          console.error("Impossible de déterminer l'extension du fichier:", file.name);
          continue;
        }
        
        const originalName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '-');
        const fileName = `${originalName}-${Date.now()}.${fileExt}`;
        
        let contentType = file.type;
        if (!contentType || contentType === 'application/octet-stream' || contentType === 'application/json') {
          switch (fileExt) {
            case 'jpg':
            case 'jpeg':
              contentType = 'image/jpeg';
              break;
            case 'png':
              contentType = 'image/png';
              break;
            case 'gif':
              contentType = 'image/gif';
              break;
            case 'webp':
              contentType = 'image/webp';
              break;
            case 'svg':
              contentType = 'image/svg+xml';
              break;
            default:
              contentType = `image/${fileExt}`;
          }
        }
        
        console.log(`Uploading file: ${fileName} with type: ${contentType}`);
        
        try {
          const fileBuffer = await file.arrayBuffer();
          const correctBlob = new Blob([fileBuffer], { type: contentType });
          
          const { error } = await supabase
            .storage
            .from('product-images')
            .upload(`${id}/${fileName}`, correctBlob, {
              cacheControl: '3600',
              contentType: contentType,
              upsert: true
            });
          
          if (error) {
            console.error("Error uploading image:", error);
            toast.error(`Erreur lors du téléchargement: ${error.message}`);
          }
        } catch (fileError) {
          console.error("Error processing file:", fileError);
          toast.error("Erreur lors du traitement du fichier");
        }
      }
      
      setImageFiles([]);
      
      await loadProductImages();
      
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      
      toast.success("Images téléchargées avec succès");
    } catch (error: any) {
      console.error("Error uploading images:", error);
      toast.error(`Erreur lors du téléchargement: ${error.message || "Erreur inconnue"}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSetMainImage = async (index: number) => {
    if (!id) return;
    
    try {
      setIsUploading(true);
      
      const imageUrl = imagePreviews[index];
      
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0]; 
      
      const publicUrl = supabase
        .storage
        .from('product-images')
        .getPublicUrl(`${id}/${fileName}`).data.publicUrl;
      
      await updateMutation.mutateAsync({
        image_url: publicUrl
      });
      
      toast.success("Image principale définie avec succès");
    } catch (error) {
      console.error("Error setting main image:", error);
      toast.error("Erreur lors de la définition de l'image principale");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      toast.info("Mise à jour du produit en cours...");
      await updateMutation.mutateAsync(formData);
      
      if (imageFiles.length > 0) {
        await handleUploadImages();
      }
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

  const addTimestamp = (url: string): string => {
    if (!url || url === '/placeholder.svg' || url.startsWith('data:')) return url;
    
    try {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${new Date().getTime()}`;
    } catch (e) {
      return url;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }
  
  if (isError) {
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
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Informations du produit</CardTitle>
                    <CardDescription>
                      Modifiez les informations de base du produit ici.
                    </CardDescription>
                  </div>
                  {id && (
                    <div className="flex items-center text-xs text-gray-500">
                      <div className="mr-2">ID: {id}</div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={handleCopyId}
                        title="Copier l'ID"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="required">Nom du produit</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name || ""}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category" className="required">Catégorie</Label>
                    <Select 
                      value={formData.category || ""} 
                      onValueChange={(value) => setFormData({...formData, category: value})}
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marque</Label>
                    <Select 
                      value={formData.brand || ""} 
                      onValueChange={(value) => setFormData({...formData, brand: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une marque" />
                      </SelectTrigger>
                      <SelectContent>
                        {popularBrands.map((brandName) => (
                          <SelectItem key={brandName} value={brandName}>
                            {brandName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      name="stock"
                      type="number"
                      value={formData.stock || 0}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={formData.price || 0}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthly_price">Mensualité</Label>
                    <Input
                      id="monthly_price"
                      name="monthly_price"
                      type="number"
                      step="0.01"
                      value={formData.monthly_price || 0}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="col-span-2 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_parent"
                        checked={formData.is_parent || false}
                        onChange={(e) => setFormData({...formData, is_parent: e.target.checked})}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="is_parent">Ce produit a des variantes</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Activez cette option si vous souhaitez créer des variantes (tailles, couleurs, etc.)
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description || ""}
                    onChange={handleChange}
                    rows={5}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={updateMutation.isPending || deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>
                
                <Button 
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mise à jour...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Enregistrer
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="images">
            <Card>
              <CardHeader>
                <CardTitle>Images du produit</CardTitle>
                <CardDescription>
                  Ajoutez des images pour votre produit (maximum 5 images).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingImages ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-2">Chargement des images...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {imagePreviews.length > 0 ? (
                      imagePreviews.map((src, index) => (
                        <div key={index} className="relative rounded-lg overflow-hidden border h-40 flex items-center justify-center">
                          <img 
                            src={addTimestamp(src)}
                            alt={`Preview ${index}`}
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                              console.error(`Error loading image preview: ${src}`);
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleSetMainImage(index)}
                                className="bg-white hover:bg-gray-100 text-gray-800"
                              >
                                Définir comme principale
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeImage(index)}
                              >
                                Supprimer
                              </Button>
                            </div>
                          </div>
                          
                          {product?.image_url === src && (
                            <div className="absolute bottom-0 left-0 right-0 bg-primary text-white text-xs text-center py-1">
                              Image principale
                            </div>
                          )}
                        </div>
                      ))
                    ) : null}
                    
                    {imagePreviews.length < 5 && (
                      <label className="border border-dashed rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                        <Plus className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-500 mt-2">Ajouter une image</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageChange}
                          multiple
                        />
                      </label>
                    )}
                  </div>
                )}
                
                {imagePreviews.length === 0 && !isLoadingImages && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Aucune image n'est actuellement associée à ce produit.
                  </p>
                )}
              </CardContent>
              {imageFiles.length > 0 && (
                <CardFooter>
                  <Button
                    type="button"
                    onClick={handleUploadImages}
                    className="ml-auto"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Télécharger {imageFiles.length} image(s)
                      </>
                    )}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="variants">
            {product && (
              <ProductVariantManager
                product={product}
                onVariantAdded={() => {
                  queryClient.invalidateQueries({ queryKey: ["product", id] });
                }}
              />
            )}
          </TabsContent>
          
        </form>
      </Tabs>
    </div>
  );
};

export default ProductEditPage;
