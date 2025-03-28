
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, updateProduct, deleteProduct } from "@/services/catalogService";
import { uploadProductImage } from "@/services/imageService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, 
  Save, 
  ArrowLeft, 
  Image as ImageIcon, 
  Trash2, 
  Upload,
  Info,
  Layers,
  X,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import ProductVariantManager from "@/components/catalog/ProductVariantManager";
import { Product } from "@/types/catalog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";

// Liste des catégories de produits
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

// Traductions des catégories
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

// Liste des marques populaires
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
  
  // Fetch product details
  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id || ""),
    enabled: !!id
  });
  
  // Update form data when product data is loaded
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
      
      // Set image preview if product has an image
      if (product.image_url) {
        setImagePreview(product.image_url);
        setImagePreviews([product.image_url]);
      }
      
      // Add additional images if they exist
      if (product.image_urls && Array.isArray(product.image_urls) && product.image_urls.length > 0) {
        const additionalImages = product.image_urls.filter(url => url !== product.image_url);
        setImagePreviews(prev => [...prev, ...additionalImages].slice(0, 5));
      }
    }
  }, [product]);
  
  // Update mutation
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
  
  // Delete mutation
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
    
    // Handle numeric fields
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
    
    const updatedFiles = [...imageFiles, ...newFiles].slice(0, 5);
    setImageFiles(updatedFiles);

    newFiles.forEach(file => {
      console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => {
          const updated = [...prev, reader.result as string].slice(0, 5);
          return updated;
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
      
      // Upload the image
      const imageUrl = await uploadProductImage(file, id, index === 0);
      
      // Update the preview
      setImagePreviews(prev => {
        const updated = [...prev];
        updated[index] = imageUrl;
        return updated;
      });
      
      toast.success("Image téléchargée avec succès");
      
      // Remove the file from the list since it's been uploaded
      setImageFiles(prev => prev.filter((_, i) => i !== index));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      
      return imageUrl;
    } catch (error: any) {
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
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
      
      // Upload all new images
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const index = imagePreviews.indexOf(URL.createObjectURL(file));
          if (index !== -1) {
            await handleUploadImage(file, index);
          }
        }
      }
      
      // Then update other product details
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
                <CardTitle>Informations du produit</CardTitle>
                <CardDescription>
                  Modifiez les informations de base du produit ici.
                </CardDescription>
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
                      Enregistrement...
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
                  Gérez les images du produit. L'image principale est utilisée comme visuel principal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {imagePreviews.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative border rounded-md overflow-hidden aspect-square">
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
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        {index === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                            Image principale
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {imagePreviews.length < 5 && (
                      <div 
                        className="border border-dashed rounded-md flex items-center justify-center cursor-pointer aspect-square bg-muted/50" 
                        onClick={() => document.getElementById("image-upload")?.click()}
                      >
                        <div className="text-center space-y-1">
                          <Plus className="mx-auto h-6 w-6 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Ajouter</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center border border-dashed rounded-md p-6 cursor-pointer" onClick={() => document.getElementById("image-upload")?.click()}>
                    <div className="text-center space-y-2">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Cliquez pour télécharger des images (max 5)</p>
                    </div>
                  </div>
                )}
                
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  multiple
                />
                
                <p className="text-xs text-muted-foreground mt-2">
                  La première image sera utilisée comme image principale.
                  {imagePreviews.length > 0 && ` ${5 - imagePreviews.length} emplacement(s) restant(s).`}
                </p>
                
                {imageFiles.length > 0 && (
                  <Button 
                    onClick={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)} 
                    className="mt-4" 
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
                        Télécharger les images
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="variants">
            {product && <ProductVariantManager product={product} />}
          </TabsContent>
          
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              className="w-full md:w-auto"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </form>
      </Tabs>
    </div>
  );
};

export default ProductEditPage;
