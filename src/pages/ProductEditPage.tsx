
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductById, updateProduct, uploadProductImage } from "@/services/catalogService";
import { updateProductVariationAttributes } from "@/services/variantPriceService";
import Container from "@/components/layout/Container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Product, ProductVariationAttributes } from "@/types/catalog";
import { ArrowLeft, Euro, Image, Layers, Loader2, Plus, Save, Settings, Tag, Upload, X } from "lucide-react";

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

const ProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("informations");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const [variationAttributes, setVariationAttributes] = useState<ProductVariationAttributes>({});
  const [newAttributeName, setNewAttributeName] = useState("");
  const [newAttributeValues, setNewAttributeValues] = useState("");
  const [isParentProduct, setIsParentProduct] = useState(false);

  // Fetch product data
  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: () => getProductById(id as string),
    enabled: !!id,
  });

  // Initialize form with product data
  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setCategory(product.category || "");
      setBrand(product.brand || "");
      setPrice(product.price ? product.price.toString() : "");
      setMonthlyPrice(product.monthly_price ? product.monthly_price.toString() : "");
      setDescription(product.description || "");
      setIsParentProduct(product.is_parent || false);
      
      if (product.variation_attributes) {
        setVariationAttributes(product.variation_attributes);
      }
      
      // Handle images
      const images = [];
      if (product.image_url) {
        images.push(product.image_url);
      }
      
      // Handle additional images
      if (product.image_urls && Array.isArray(product.image_urls)) {
        images.push(...product.image_urls.filter(Boolean));
      }
      
      setLoadedImages(images);
      setImagePreviews(images);
    }
  }, [product]);

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: (data: Partial<Product>) => updateProduct(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      
      if (imageFiles.length > 0) {
        uploadImages();
      } else {
        finishProductUpdate();
      }
    },
    onError: (error) => {
      console.error("Erreur lors de la mise à jour du produit:", error);
      toast.error(`Erreur lors de la mise à jour du produit: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsSubmitting(false);
    }
  });

  // Upload images function
  const uploadImages = async () => {
    try {
      // Check if bucket exists to avoid the "Bucket not found" error
      const { data: buckets } = await queryClient.fetchQuery({
        queryKey: ["buckets"],
        queryFn: async () => {
          const { supabase } = await import("@/integrations/supabase/client");
          return supabase.storage.listBuckets();
        }
      });
      
      const bucketExists = buckets?.some(bucket => bucket.name === 'products');
      
      if (!bucketExists) {
        console.log("Bucket 'products' not found, creating it...");
        const { supabase } = await import("@/integrations/supabase/client");
        const { error: createBucketError } = await supabase.storage.createBucket('products', {
          public: true
        });
        
        if (createBucketError) {
          console.error("Error creating 'products' bucket:", createBucketError);
          throw new Error("Failed to create storage bucket: " + createBucketError.message);
        }
      }
      
      // Upload main image if it's a new file
      if (imageFiles.length > 0 && !loadedImages.includes(imagePreviews[0])) {
        await uploadProductImage(imageFiles[0], id as string, true);
      }
      
      // Upload additional images
      const uploadPromises = [];
      for (let i = 1; i < imageFiles.length && i < 5; i++) {
        if (!loadedImages.includes(imagePreviews[i])) {
          uploadPromises.push(uploadProductImage(imageFiles[i], id as string, false));
        }
      }
      
      if (uploadPromises.length > 0) {
        await Promise.all(uploadPromises);
      }
      
      finishProductUpdate();
    } catch (error) {
      console.error("Erreur lors du téléchargement des images:", error);
      toast.error("Le produit a été mis à jour mais certaines images n'ont pas pu être téléchargées");
      finishProductUpdate();
    }
  };

  // Finish update process
  const finishProductUpdate = async () => {
    try {
      if (id && isParentProduct && Object.keys(variationAttributes).length > 0) {
        try {
          await updateProductVariationAttributes(id, variationAttributes);
          toast.success("Attributs de variante mis à jour avec succès");
        } catch (error) {
          console.error("Erreur lors de la mise à jour des attributs de variante:", error);
          toast.error("Erreur lors de la mise à jour des attributs de variante");
        }
      }
    } catch (error) {
      console.error("Erreur lors de la finalisation de la mise à jour du produit:", error);
    } finally {
      setIsSubmitting(false);
      toast.success("Produit mis à jour avec succès");
      navigate("/catalog");
    }
  };

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !category || (!isParentProduct && !price)) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);

    try {
      const productData: Partial<Product> = {
        name,
        category,
        price: isParentProduct ? 0 : parseFloat(price) || 0,
        monthly_price: isParentProduct ? 0 : (monthlyPrice ? parseFloat(monthlyPrice) : undefined),
        description,
        brand: brand || "",
        is_parent: isParentProduct,
        variation_attributes: isParentProduct ? variationAttributes : {}
      };

      updateProductMutation.mutate(productData);
    } catch (error) {
      console.error("Erreur lors de la préparation des données du produit:", error);
      toast.error(`Erreur lors de la mise à jour du produit: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setIsSubmitting(false);
    }
  };

  // Image upload handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).slice(0, 5 - imagePreviews.length);
    if (newFiles.length === 0) return;
    
    setImageFiles(prev => [...prev, ...newFiles].slice(0, 5));

    newFiles.forEach(file => {
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

  // Remove image handler
  const removeImage = (index: number) => {
    if (index < loadedImages.length) {
      setLoadedImages(prev => prev.filter((_, i) => i !== index));
    }
    
    setImageFiles(prev => {
      const newFiles = [...prev];
      if (index >= loadedImages.length) {
        newFiles.splice(index - loadedImages.length, 1);
      }
      return newFiles;
    });
    
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Attribute handlers
  const handleAddAttribute = () => {
    if (!newAttributeName || !newAttributeValues) {
      toast.error("Veuillez saisir un nom d'attribut et au moins une valeur");
      return;
    }
    
    const values = newAttributeValues.split(',').map(v => v.trim()).filter(Boolean);
    
    if (values.length === 0) {
      toast.error("Veuillez saisir au moins une valeur pour l'attribut");
      return;
    }
    
    setVariationAttributes(prev => ({
      ...prev,
      [newAttributeName]: values
    }));
    
    setNewAttributeName("");
    setNewAttributeValues("");
  };

  const handleRemoveAttribute = (attributeName: string) => {
    setVariationAttributes(prev => {
      const updated = { ...prev };
      delete updated[attributeName];
      return updated;
    });
  };

  // Cancel editing handler
  const handleCancel = () => {
    if (
      name !== (product?.name || "") || 
      category !== (product?.category || "") || 
      brand !== (product?.brand || "") || 
      price !== (product?.price?.toString() || "") || 
      description !== (product?.description || "") || 
      imageFiles.length > 0
    ) {
      setShowConfirmDialog(true);
    } else {
      navigate("/catalog");
    }
  };

  // Loading state
  if (isProductLoading) {
    return (
      <Container>
        <div className="py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <span className="ml-2 text-lg">Chargement du produit...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={handleCancel} className="mr-4" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              Modifier le produit
            </h1>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                  Mise à jour en cours...
                </span>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="informations" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Informations
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center">
                <Image className="h-4 w-4 mr-2" />
                Images
              </TabsTrigger>
              <TabsTrigger value="variantes" className="flex items-center" disabled={!isParentProduct}>
                <Layers className="h-4 w-4 mr-2" />
                Variantes
              </TabsTrigger>
            </TabsList>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="space-y-6">
              <TabsContent value="informations" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="after:content-['*'] after:ml-0.5 after:text-red-500">Nom du produit</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nom du produit"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand">Marque</Label>
                    <Select value={brand} onValueChange={setBrand}>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="after:content-['*'] after:ml-0.5 after:text-red-500">Catégorie</Label>
                    <Select value={category} onValueChange={setCategory} required>
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
                    <div className="flex items-center h-10 space-x-2 pt-8">
                      <input
                        type="checkbox"
                        id="is_parent"
                        checked={isParentProduct}
                        onChange={(e) => setIsParentProduct(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="is_parent">Ce produit a des variantes</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Activez cette option si vous souhaitez créer des variantes (tailles, couleurs, etc.)
                    </p>
                  </div>
                </div>

                {!isParentProduct && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="price" className="after:content-['*'] after:ml-0.5 after:text-red-500">Prix (€)</Label>
                      <div className="relative">
                        <Input
                          id="price"
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
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
                      <Label htmlFor="monthly_price">Mensualité (€/mois)</Label>
                      <div className="relative">
                        <Input
                          id="monthly_price"
                          type="number"
                          value={monthlyPrice}
                          onChange={(e) => setMonthlyPrice(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="pl-8"
                        />
                        <Euro className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground">Mensualité pour le leasing du produit</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description du produit"
                    className="min-h-[250px]"
                  />
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-6 mt-0">
                <Card className="border-none shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle>Images du produit</CardTitle>
                    <CardDescription>
                      Ajoutez jusqu'à 5 images pour votre produit. La première sera utilisée comme image principale.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 pt-0">
                    {imagePreviews.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
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
                              className="absolute top-2 right-2 h-8 w-8"
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
                      <div className="flex items-center justify-center border border-dashed rounded-md p-12 cursor-pointer" onClick={() => document.getElementById("image-upload")?.click()}>
                        <div className="text-center space-y-2">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                          <p className="text-base text-muted-foreground">Cliquez pour télécharger des images</p>
                          <p className="text-sm text-muted-foreground">(maximum 5 images)</p>
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="variantes" className="space-y-6 mt-0">
                <Card className="border-none shadow-none">
                  <CardHeader className="px-0 pt-0">
                    <CardTitle>Attributs de variantes</CardTitle>
                    <CardDescription>
                      Définissez les attributs et leurs valeurs pour générer des variantes (ex: Couleur: Rouge, Bleu, Vert).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 pt-0 space-y-6">
                    {Object.keys(variationAttributes).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(variationAttributes).map(([attrName, values]) => (
                          <div key={attrName} className="flex flex-col space-y-2 p-4 border rounded-md bg-muted/30">
                            <div className="flex justify-between items-center">
                              <div className="font-medium flex items-center">
                                <Tag className="h-4 w-4 mr-2 text-primary" />
                                {attrName}
                              </div>
                              <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleRemoveAttribute(attrName)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {values.map((value, idx) => (
                                <span key={idx} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                                  {value}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md">
                        <Tag className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
                        <p>Aucun attribut défini. Ajoutez des attributs ci-dessous.</p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <h4 className="text-base font-medium mb-4">Ajouter un nouvel attribut</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="attributeName">Nom de l'attribut</Label>
                          <Input
                            id="attributeName"
                            value={newAttributeName}
                            onChange={(e) => setNewAttributeName(e.target.value)}
                            placeholder="Ex: Couleur, Taille, Capacité"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="attributeValues">Valeurs (séparées par des virgules)</Label>
                          <Input
                            id="attributeValues"
                            value={newAttributeValues}
                            onChange={(e) => setNewAttributeValues(e.target.value)}
                            placeholder="Ex: Rouge, Bleu, Vert"
                          />
                          <p className="text-xs text-muted-foreground">Séparez chaque valeur par une virgule</p>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleAddAttribute}
                        className="mt-4"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter cet attribut
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="pt-6 border-t mt-6">
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                        Mise à jour en cours...
                      </span>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Enregistrer les modifications
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </Tabs>
        </div>
      </div>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Êtes-vous sûr de vouloir quitter ?</DialogTitle>
            <DialogDescription>
              Toutes les modifications non enregistrées seront perdues.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Continuer l'édition
            </Button>
            <Button variant="destructive" onClick={() => {
              setShowConfirmDialog(false);
              navigate("/catalog");
            }}>
              Quitter sans enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default ProductEditPage;
