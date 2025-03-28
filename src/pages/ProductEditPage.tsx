
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, updateProduct, deleteProduct } from "@/services/catalogService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
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
import { Loader2, Save, ArrowLeft, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import ProductVariantManager from "@/components/catalog/ProductVariantManager";
import { uploadProductImage, updateProductImage } from "@/services/imageService"; 
import { Product } from "@/types/catalog";

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
        specifications: product.specifications || {}
      });
      
      // Set image preview if product has an image
      if (product.image_url) {
        setImagePreview(product.image_url);
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
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleUploadImage = async () => {
    if (!imageFile || !id) return;
    
    try {
      setIsUploading(true);
      
      // Upload the image
      const imageUrl = await uploadProductImage(imageFile, id, true);
      
      // Update the product with the new image URL
      await updateProductImage(id, imageUrl, true);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      
      toast.success("Image téléchargée avec succès");
      setImageFile(null);
    } catch (error: any) {
      toast.error(`Erreur lors du téléchargement: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // First upload image if there's a new one
    if (imageFile) {
      await handleUploadImage();
    }
    
    // Then update other product details
    updateMutation.mutate(formData);
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
      <div className="flex items-center mb-6">
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="details">Informations</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="variants">Variantes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <form onSubmit={handleSubmit}>
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
                    <Label htmlFor="category">Catégorie</Label>
                    <Input
                      id="category"
                      name="category"
                      value={formData.category || ""}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marque</Label>
                    <Input
                      id="brand"
                      name="brand"
                      value={formData.brand || ""}
                      onChange={handleChange}
                    />
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
          </form>
        </TabsContent>
        
        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Images du produit</CardTitle>
              <CardDescription>
                Gérez les images du produit. L'image principale est utilisée comme visuel principal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-md p-4">
                <h3 className="text-lg font-medium mb-4">Image principale</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-center border rounded-md p-4 bg-muted/30 h-48">
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt={formData.name || "Product"} 
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                        <p>Pas d'image</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="image">Sélectionner une image</Label>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="mt-2"
                    />
                    
                    {imageFile && (
                      <Button 
                        onClick={handleUploadImage} 
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
                            Télécharger l'image
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Additional images section could be added here */}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="variants">
          {product && <ProductVariantManager product={product} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductEditPage;
