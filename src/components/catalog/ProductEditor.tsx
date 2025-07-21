
import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { createProduct, updateProduct, getBrands, getCategories, uploadProductImage } from "@/services/catalogService";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  brand: z.string().min(1, "La marque est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  description: z.string().min(1, "La description est requise"),
  price: z.number().min(0, "Le prix doit être positif"),
  monthly_price: z.number().min(0, "Le prix mensuel doit être positif").optional(),
  active: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productToEdit?: Product;
}

const ProductEditor: React.FC<ProductEditorProps> = ({
  isOpen,
  onClose,
  onSuccess,
  productToEdit
}) => {
  console.log("🛠️ ProductEditor - Render started", { isOpen, hasProductToEdit: !!productToEdit, productId: productToEdit?.id });
  
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const queryClient = useQueryClient();

  // Déterminer le mode
  const isEditMode = !!productToEdit;
  console.log("🛠️ ProductEditor - Mode detected:", isEditMode ? "EDIT" : "CREATE");

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "",
      description: "",
      price: 0,
      monthly_price: 0,
      active: true,
    },
  });

  console.log("🛠️ ProductEditor - Form initialized");

  // Charger les brands et categories
  const { data: brands = [], isLoading: brandsLoading, error: brandsError } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  console.log("🛠️ ProductEditor - Data loading state:", { 
    brandsLoading, 
    categoriesLoading, 
    brandsCount: brands.length, 
    categoriesCount: categories.length,
    brandsError: !!brandsError,
    categoriesError: !!categoriesError
  });

  // Initialiser le formulaire en mode édition
  useEffect(() => {
    console.log("🛠️ ProductEditor - useEffect for form initialization", { isEditMode, productToEdit });
    
    if (isEditMode && productToEdit) {
      console.log("🛠️ ProductEditor - Initializing form with product data:", productToEdit);
      
      form.reset({
        name: productToEdit.name || "",
        brand: productToEdit.brand || "",
        category: productToEdit.category || "",
        description: productToEdit.description || "",
        price: Number(productToEdit.price) || 0,
        monthly_price: Number(productToEdit.monthly_price) || 0,
        active: productToEdit.active !== false,
      });

      // Initialiser les images
      if (productToEdit.imageUrl) {
        setUploadedImages([productToEdit.imageUrl]);
      } else if (productToEdit.image_url) {
        setUploadedImages([productToEdit.image_url]);
      }
      
      console.log("🛠️ ProductEditor - Form initialized with product data");
    } else {
      console.log("🛠️ ProductEditor - Resetting form for create mode");
      form.reset({
        name: "",
        brand: "",
        category: "",
        description: "",
        price: 0,
        monthly_price: 0,
        active: true,
      });
      setUploadedImages([]);
    }
  }, [isEditMode, productToEdit, form]);

  // Mutation pour créer un produit
  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      console.log("🛠️ ProductEditor - Product created successfully");
      toast.success("Produit créé avec succès");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error("🛠️ ProductEditor - Create error:", error);
      toast.error(`Erreur lors de la création: ${error.message}`);
    },
  });

  // Mutation pour mettre à jour un produit
  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Product> }) => updateProduct(id, updates),
    onSuccess: () => {
      console.log("🛠️ ProductEditor - Product updated successfully");
      toast.success("Produit mis à jour avec succès");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productToEdit?.id] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      console.error("🛠️ ProductEditor - Update error:", error);
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    },
  });

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const tempId = Date.now().toString();
      const imageUrl = await uploadProductImage(file, tempId, true);
      setUploadedImages(prev => [...prev, imageUrl]);
      toast.success("Image uploadée avec succès");
    } catch (error: any) {
      console.error("🛠️ ProductEditor - Image upload error:", error);
      toast.error(`Erreur lors de l'upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    console.log("🛠️ ProductEditor - Form submission started", { data, isEditMode });
    
    try {
      const productData = {
        ...data,
        imageUrl: uploadedImages[0] || "",
        image_url: uploadedImages[0] || "",
        company_id: "c1ce66bb-3ad2-474d-b477-583baa7ff1c0", // Get from context in real app
      };

      if (isEditMode && productToEdit) {
        console.log("🛠️ ProductEditor - Updating product:", productToEdit.id);
        await updateProductMutation.mutateAsync({ 
          id: productToEdit.id, 
          updates: productData 
        });
      } else {
        console.log("🛠️ ProductEditor - Creating new product");
        await createProductMutation.mutateAsync(productData);
      }
    } catch (error) {
      console.error("🛠️ ProductEditor - Submit error:", error);
    }
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;
  const dataLoading = brandsLoading || categoriesLoading;

  console.log("🛠️ ProductEditor - Render state:", { 
    isLoading, 
    dataLoading, 
    isOpen, 
    isEditMode,
    hasErrors: !!brandsError || !!categoriesError
  });

  // Si nous sommes en mode édition et qu'il n'y a pas de produit, ne pas rendre
  if (isEditMode && !productToEdit) {
    console.log("🛠️ ProductEditor - Edit mode but no product provided, not rendering");
    return null;
  }

  // Affichage de chargement
  if (dataLoading) {
    console.log("🛠️ ProductEditor - Showing loading state");
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Chargement...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Affichage d'erreur
  if (brandsError || categoriesError) {
    console.log("🛠️ ProductEditor - Showing error state");
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="text-center py-12">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-destructive text-3xl">!</span>
            </div>
            <h2 className="text-xl font-semibold mb-4">Erreur de chargement</h2>
            <p className="text-muted-foreground mb-4">
              Impossible de charger les données nécessaires.
            </p>
            <Button onClick={onClose}>Fermer</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  console.log("🛠️ ProductEditor - Rendering main form");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Modifier le produit: ${productToEdit?.name}` : "Ajouter un nouveau produit"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations de base */}
            <Card>
              <CardHeader>
                <CardTitle>Informations de base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Nom du produit"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="brand">Marque *</Label>
                  <Select 
                    value={form.watch("brand")} 
                    onValueChange={(value) => form.setValue("brand", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une marque" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.name}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.brand && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.brand.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select 
                    value={form.watch("category")} 
                    onValueChange={(value) => form.setValue("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.category.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    placeholder="Description du produit"
                    rows={4}
                  />
                  {form.formState.errors.description && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Prix et paramètres */}
            <Card>
              <CardHeader>
                <CardTitle>Prix et paramètres</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="price">Prix d'achat (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...form.register("price", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.price && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.price.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="monthly_price">Prix mensuel (€)</Label>
                  <Input
                    id="monthly_price"
                    type="number"
                    step="0.01"
                    {...form.register("monthly_price", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {form.formState.errors.monthly_price && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.monthly_price.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="active"
                    checked={form.watch("active")}
                    onCheckedChange={(checked) => form.setValue("active", !!checked)}
                  />
                  <Label htmlFor="active">Produit actif</Label>
                </div>

                {/* Upload d'images */}
                <div>
                  <Label>Images du produit</Label>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <Label
                      htmlFor="image-upload"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-input rounded-md hover:bg-accent"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? "Upload en cours..." : "Ajouter une image"}
                    </Label>
                  </div>

                  {/* Images uploadées */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {uploadedImages.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Product ${index + 1}`}
                            className="w-full h-24 object-cover rounded border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-2 pt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Mise à jour..." : "Création..."}
                </>
              ) : (
                <>
                  {isEditMode ? "Mettre à jour" : "Ajouter le produit"}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditor;
