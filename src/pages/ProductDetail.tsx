import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, updateProduct, uploadProductImage } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import Container from "@/components/layout/Container";
import PageTransition from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload, X, Plus, Image } from "lucide-react";
import { nanoid } from "nanoid";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ProductEditorFormSchema } from "@/lib/validation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VariantAttributeSelector from "@/components/catalog/VariantAttributeSelector";
import VariantPriceManager from "@/components/catalog/VariantPriceManager";

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  
  const [activeTab, setActiveTab] = useState("basic");
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    price: number;
    monthly_price: number;
    imageUrl: string;
    active: boolean;
    admin_only: boolean;
    imagesToUpload: { file: File, id: string }[];
    imagesToRemove: { file: File, id: string }[];
    images: { src: string, id: string }[];
  }>({
    name: "",
    description: "",
    price: 0,
    monthly_price: 0,
    imageUrl: "",
    active: true,
    admin_only: false,
    imagesToUpload: [],
    imagesToRemove: [],
    images: []
  });
  const [uploadingImageIds, setUploadingImageIds] = useState<string[]>([]);
  
  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
    initialData: null
  });
  
  const product = productQuery.data;
  
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price,
        monthly_price: product.monthly_price || 0,
        imageUrl: product.imageUrl || "",
        active: product.active || false,
        admin_only: product.admin_only || false,
        imagesToUpload: [],
        imagesToRemove: [],
        images: product.image_urls?.map(url => ({ src: url, id: nanoid() })) || []
      });
    }
  }, [product]);
  
  const updateProductMutation = useMutation({
    mutationFn: (updates: Partial<Product>) => updateProduct(productId!, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      toast.success("Produit mis à jour avec succès");
      setIsEditMode(false);
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour du produit: ${error.message}`);
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: checked
    }));
  };
  
  const handleImageUpload = async (files: FileList) => {
    setUploadingImageIds([...Array(files.length)].map(() => nanoid()));
    
    const newImages = Array.from(files).map((file) => ({
      file,
      id: nanoid()
    }));
    
    setFormData(prevData => ({
      ...prevData,
      imagesToUpload: [...prevData.imagesToUpload, ...newImages]
    }));
  };
  
  const handleRemoveImage = (imageIndex: number) => {
    setFormData((prevData) => ({
      ...prevData,
      imagesToUpload: prevData.imagesToUpload.filter((_, index) => index !== imageIndex),
      imagesToRemove: [...prevData.imagesToRemove, {
        file: new File([], ""),
        id: prevData.images[imageIndex].id
      }]
    }));
    
    setFormData(prevData => ({
      ...prevData,
      images: prevData.images.filter((_, index) => index !== imageIndex)
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId) {
      toast.error("Product ID is missing.");
      return;
    }
    
    const updates: Partial<Product> = {
      name: formData.name,
      description: formData.description,
      price: formData.price,
      monthly_price: formData.monthly_price,
      active: formData.active,
      admin_only: formData.admin_only
    };
    
    updateProductMutation.mutate(updates);
    
    // Upload new images
    for (const image of formData.imagesToUpload) {
      try {
        await uploadProductImage(image.file, productId);
        toast.success(`Image ${image.file.name} uploaded successfully`);
      } catch (error: any) {
        toast.error(`Error uploading image ${image.file.name}: ${error.message}`);
      }
    }
    
    // Remove images
    // TODO: Implement image removal logic
    
    setFormData(prevData => ({
      ...prevData,
      imagesToUpload: [],
      imagesToRemove: []
    }));
  };
  
  if (productQuery.isLoading) {
    return (
      <PageTransition>
        <Container>
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (!product || productQuery.isError) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-48">
            <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
            <p className="text-muted-foreground">
              Le produit demandé n'existe pas ou a été supprimé.
            </p>
            <Button variant="outline" onClick={() => navigate("/catalog")}>
              Retour au catalogue
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  if (!isAdmin()) {
    return (
      <PageTransition>
        <Container>
          <div className="flex flex-col items-center justify-center h-48">
            <h2 className="text-2xl font-bold mb-4">Accès refusé</h2>
            <p className="text-muted-foreground">
              Vous n'avez pas les autorisations nécessaires pour voir cette page.
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </div>
        </Container>
      </PageTransition>
    );
  }
  
  return (
    <PageTransition>
      <Container>
        <div className="mb-8 flex justify-between items-center">
          <div>
            <Button variant="ghost" onClick={() => navigate("/catalog")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au catalogue
            </Button>
            <h1 className="text-2xl font-bold mt-2">{product.name}</h1>
          </div>
          {isEditMode ? (
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setIsEditMode(false)}>
                Annuler
              </Button>
              <Button onClick={handleSubmit} disabled={updateProductMutation.isLoading}>
                {updateProductMutation.isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditMode(true)}>
              Modifier le produit
            </Button>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="basic">Informations générales</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            {product.is_parent && (
              <TabsTrigger value="variants">Variantes</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="basic">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom du produit</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Prix</Label>
                  <Input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                  />
                </div>
                <div>
                  <Label htmlFor="monthly_price">Mensualité</Label>
                  <Input
                    type="number"
                    id="monthly_price"
                    name="monthly_price"
                    value={formData.monthly_price}
                    onChange={handleInputChange}
                    disabled={!isEditMode}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={!isEditMode}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="active">Actif</Label>
                <Switch
                  id="active"
                  name="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prevData => ({ ...prevData, active: checked }))}
                  disabled={!isEditMode}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Label htmlFor="admin_only">Réservé aux admins</Label>
                <Switch
                  id="admin_only"
                  name="admin_only"
                  checked={formData.admin_only}
                  onCheckedChange={(checked) => setFormData(prevData => ({ ...prevData, admin_only: checked }))}
                  disabled={!isEditMode}
                />
              </div>
              
              {isEditMode && (
                <Button type="submit" disabled={updateProductMutation.isLoading}>
                  {updateProductMutation.isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              )}
            </form>
          </TabsContent>
          
          <TabsContent value="images">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {formData.images.map((image, index) => (
                  <div key={image.id} className="relative">
                    <img src={image.src} alt={`Image ${index + 1}`} className="rounded-md" />
                    {isEditMode && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {isEditMode && (
                  <div className="flex items-center justify-center border border-dashed rounded-md p-4 cursor-pointer" onClick={() => document.getElementById("image-upload")?.click()}>
                    <div className="text-center space-y-2">
                      <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Ajouter une image</p>
                    </div>
                  </div>
                )}
              </div>
              
              {isEditMode && (
                <>
                  <input
                    type="file"
                    id="image-upload"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        handleImageUpload(e.target.files);
                      }
                    }}
                  />
                  
                  {formData.imagesToUpload.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Images à télécharger</h3>
                      <div className="grid grid-cols-3 gap-4">
                        {formData.imagesToUpload.map((image, index) => (
                          <div key={image.id} className="relative">
                            <img src={URL.createObjectURL(image.file)} alt={`Image ${index + 1}`} className="rounded-md" />
                            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black/50 text-white rounded-md">
                              {uploadingImageIds.includes(image.id) ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => handleRemoveImage(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          {product.is_parent && (
            <TabsContent value="variants">
              {productId && (
                <VariantAttributeSelector productId={productId} />
              )}
              {productId && (
                <VariantPriceManager product={product} />
              )}
            </TabsContent>
          )}
        </Tabs>
      </Container>
    </PageTransition>
  );
};

export default ProductDetail;
