
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Package, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import DescriptionGenerator from "./DescriptionGenerator";
import { Alert, AlertDescription } from "@/components/ui/alert";

const productFormSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  short_description: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand_id: z.string().min(1, "La marque est requise"),
  price: z.number().min(0, "Le prix doit être positif"),
  stock: z.number().min(0, "Le stock ne peut pas être négatif"),
  sku: z.string().optional(),
  active: z.boolean(),
  admin_only: z.boolean(),
});

type ProductFormData = z.infer<typeof productFormSchema>;

interface ProductFormInfoTabProps {
  productToEdit?: Product;
  onSuccess: () => void;
  isEditMode: boolean;
}

const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({
  productToEdit,
  onSuccess,
  isEditMode
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: brands = [], isLoading: brandsLoading } = useBrands();

  console.log("📝 ProductFormInfoTab - Rendering", { 
    isEditMode, 
    hasProduct: !!productToEdit,
    productName: productToEdit?.name,
    categoriesCount: categories.length,
    brandsCount: brands.length
  });

  // Helper function to find ID from name
  const findCategoryId = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName || c.translation === categoryName);
    return category?.id || "";
  };

  const findBrandId = (brandName: string) => {
    const brand = brands.find(b => b.name === brandName || b.translation === brandName);
    return brand?.id || "";
  };

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      short_description: "",
      description: "",
      category_id: "",
      brand_id: "",
      price: 0,
      stock: 0,
      sku: "",
      active: true,
      admin_only: false,
    },
  });

  // Reset form when product data or categories/brands change
  useEffect(() => {
    if (productToEdit && isEditMode && categories.length > 0 && brands.length > 0) {
      console.log("📝 ProductFormInfoTab - Resetting form with product data", {
        name: productToEdit.name,
        category: productToEdit.category,
        brand: productToEdit.brand,
        price: productToEdit.price,
        categoryId: findCategoryId(productToEdit.category || ""),
        brandId: findBrandId(productToEdit.brand || "")
      });
      
      form.reset({
        name: productToEdit.name || "",
        short_description: productToEdit.shortDescription || "",
        description: productToEdit.description || "",
        category_id: findCategoryId(productToEdit.category || ""),
        brand_id: findBrandId(productToEdit.brand || ""),
        price: productToEdit.price || 0,
        stock: productToEdit.stock || 0,
        sku: productToEdit.sku || "",
        active: productToEdit.active !== false,
        admin_only: productToEdit.admin_only || false,
      });
    }
  }, [productToEdit, isEditMode, categories, brands, form]);

  const onSubmit = async (data: ProductFormData) => {
    console.log("📝 ProductFormInfoTab - Form submission", { data, isEditMode });
    
    // Ensure required fields are present
    if (!data.name || !data.category_id || !data.brand_id) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    setIsLoading(true);
    try {
      if (isEditMode && productToEdit) {
        console.log("📝 ProductFormInfoTab - Updating product", { productId: productToEdit.id });
        await updateProduct.mutateAsync({
          id: productToEdit.id,
          ...data,
        });
      } else {
        console.log("📝 ProductFormInfoTab - Creating new product");
        // Explicitly type the data to ensure required fields are present
        const createData = {
          name: data.name,
          description: data.description,
          short_description: data.short_description,
          category_id: data.category_id,
          brand_id: data.brand_id,
          price: data.price || 0,
          stock: data.stock,
          sku: data.sku,
          active: data.active,
          admin_only: data.admin_only,
        };
        await createProduct.mutateAsync(createData);
      }
      
      console.log("📝 ProductFormInfoTab - Operation successful");
      onSuccess();
    } catch (error) {
      console.error("📝 ProductFormInfoTab - Operation failed:", error);
      toast.error("Erreur lors de l'opération");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    console.log("📝 ProductFormInfoTab - Descriptions generated", { description: description.length, shortDescription: shortDescription.length });
    if (shortDescription) {
      form.setValue("short_description", shortDescription);
    }
    if (description) {
      form.setValue("description", description);
    }
  };

  if (categoriesLoading || brandsLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Chargement des données...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (categories.length === 0 || brands.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {categories.length === 0 && brands.length === 0 
                ? "Aucune catégorie ni marque disponible. Veuillez d'abord créer des catégories et des marques."
                : categories.length === 0 
                ? "Aucune catégorie disponible. Veuillez d'abord créer des catégories."
                : "Aucune marque disponible. Veuillez d'abord créer des marques."
              }
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditMode ? "Modifier le produit" : "Créer un nouveau produit"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Informations générales */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informations générales</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du produit *</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom du produit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.translation || category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brand_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marque *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner une marque" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>
                                {brand.translation || brand.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="short_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description courte</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description courte du produit"
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description détaillée</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description détaillée du produit"
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Prix et stock */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Prix et inventaire
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix de vente (€) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock disponible</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="SKU-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Paramètres */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Paramètres</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Produit actif</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Le produit est visible et disponible
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="admin_only"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Réservé aux admins</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Seuls les administrateurs peuvent voir ce produit
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="min-w-[120px]"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {isEditMode ? "Mise à jour..." : "Création..."}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      {isEditMode ? "Mettre à jour" : "Créer le produit"}
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Générateur de description IA */}
      <DescriptionGenerator
        productName={form.watch("name")}
        currentShortDescription={form.watch("short_description")}
        currentDescription={form.watch("description")}
        categoryId={form.watch("category_id") || ""}
        brandId={form.watch("brand_id") || ""}
        categories={categories}
        brands={brands}
        onDescriptionGenerated={handleDescriptionGenerated}
        onShortDescriptionChange={(value) => form.setValue("short_description", value)}
        onDescriptionChange={(value) => form.setValue("description", value)}
      />
    </div>
  );
};

export default ProductFormInfoTab;
