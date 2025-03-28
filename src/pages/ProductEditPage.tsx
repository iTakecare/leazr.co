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
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  useEffect(() => {
    const initStorageBucket = async () => {
      try {
        console.log("Vérification/initialisation du bucket product-images");
        let bucketExists = false;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`Tentative ${attempt}/3 d'initialisation du bucket`);
          bucketExists = await ensureStorageBucket("product-images");
          
          if (bucketExists) {
            console.log("Bucket product-images vérifié avec succès");
            break;
          } else {
            console.error(`Le bucket product-images n'a pas pu être créé à la tentative ${attempt}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (!bucketExists) {
          console.error("Le bucket product-images n'a pas pu être créé après plusieurs tentatives");
          toast.error("Erreur lors de la préparation du stockage des images");
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation du bucket product-images:", error);
        toast.error("Erreur lors de la préparation du stockage des images");
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
      
      const loadImages = async () => {
        try {
          if (id) {
            const { mainImage, additionalImages } = await fetchProductImages(id);
            
            if (mainImage) {
              setImagePreview(mainImage);
              const allImages = [mainImage, ...additionalImages];
              setImagePreviews(allImages.slice(0, 5));
              console.log("Images chargées:", { mainImage, additionalImages, allImages });
            } else {
              setImagePreview(null);
              setImagePreviews([]);
              console.log("Aucune image trouvée pour ce produit");
            }
          }
        } catch (error) {
          console.error("Erreur lors du chargement des images:", error);
          toast.error("Impossible de charger les images du produit");
        }
      };
      
      loadImages();
    }
  }, [product, id]);
  
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
    if (!files) return;

    console.log(`Selected ${files.length} new image files`);
    const newFiles = Array.from(files).slice(0, 5 - imageFiles.length);
    if (newFiles.length === 0) return;
    
    const updatedFiles = [...imageFiles, ...newFiles];
    setImageFiles(updatedFiles);

    newFiles.forEach(file => {
      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => {
          const currentPreviews = Array.isArray(prev) ? prev : [];
          return [...currentPreviews, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleUploadImage = async (file: File, index: number) => {
    if (!id) return;
    
    try {
      setIsUploading(true);
      toast.info(`Téléchargement de l'image ${index + 1}...`);
      
      let bucketReady = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`Tentative ${attempt}/3 de vérification du bucket product-images`);
        bucketReady = await ensureStorageBucket("product-images");
        
        if (bucketReady) {
          break;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!bucketReady) {
        toast.error("Impossible de créer le bucket pour les images");
        setIsUploading(false);
        return null;
      }
      
      console.log(`Début de l'upload de l'image ${index + 1} pour le produit ${id}`);
      const imageUrl = await uploadProductImage(file, id, index === 0);
      
      if (!imageUrl) {
        toast.error("Échec du téléchargement de l'image");
        setIsUploading(false);
        return null;
      }
      
      setImagePreviews(prev => {
        const updated = [...prev];
        updated[index] = imageUrl;
        return updated;
      });
      
      toast.success("Image téléchargée avec succès");
      
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      
      return imageUrl;
    } catch (error: any) {
      console.error("Erreur détaillée lors du téléchargement:", error);
      toast.error(`Erreur lors du téléchargement: ${error.message || "Erreur inconnue"}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      toast.info("Mise à jour du produit en cours...");
      
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const index = imagePreviews.indexOf(URL.createObjectURL(file));
          if (index !== -1) {
            await handleUploadImage(file, index);
          }
        }
      }
      
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {imagePreviews.length > 0 ? (
                    imagePreviews.map((src, index) => (
                      <div key={index} className="relative rounded-lg overflow-hidden border h-40">
                        <img 
                          src={src} 
                          alt={`Preview ${index}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm"
                        >
                          <X className="w-4 h-4 text-gray-600" />
                        </button>
                        {index === 0 && imagePreviews.length > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">
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
                      />
                    </label>
                  )}
                </div>
                
                {imagePreviews.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Aucune image n'est actuellement associée à ce produit.
                  </p>
                )}
              </CardContent>
              {imageFiles.length > 0 && (
                <CardFooter>
                  <Button
                    type="button"
                    onClick={() => imageFiles.forEach((file, index) => handleUploadImage(file, index))}
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
                        Télécharger toutes les images
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
