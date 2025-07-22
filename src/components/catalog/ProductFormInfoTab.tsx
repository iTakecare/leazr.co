import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import DescriptionGenerator from "./DescriptionGenerator";

// Define a schema for form validation using Zod
// This schema defines the expected data types and validation rules for each field in the form.
// It ensures that the data submitted by the user is valid before being processed.

const formSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  stock: z.number().min(0, "Le stock doit être positif"),
  sku: z.string().optional(),
  is_refurbished: z.boolean(),
  condition: z.string().optional(),
  purchase_price: z.number().min(0, "Le prix d'achat doit être positif"),
  active: z.boolean(),
  admin_only: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface ProductFormInfoTabProps {
  productToEdit?: Product;
  onSuccess: () => void;
  isEditMode: boolean;
}

const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({
  productToEdit,
  onSuccess,
  isEditMode,
}) => {
  console.log("🔧 ProductFormInfoTab - Render", { 
    isEditMode, 
    productToEdit: productToEdit?.name 
  });

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: productToEdit?.name || "",
      description: productToEdit?.description || "",
      short_description: productToEdit?.shortDescription || "",
      category_id: productToEdit?.category || "",
      brand_id: productToEdit?.brand || "",
      price: productToEdit?.price || 0,
      stock: productToEdit?.stock || 0,
      sku: productToEdit?.sku || "",
      is_refurbished: false, // Will be set based on business logic
      condition: "", // Will be conditional
      purchase_price: 0, // Not in Product type, will use form data
      active: productToEdit?.active ?? true,
      admin_only: productToEdit?.admin_only || false,
    },
  });

  // Watch form values for DescriptionGenerator
  const watchedName = form.watch("name");
  const watchedCategoryId = form.watch("category_id");
  const watchedBrandId = form.watch("brand_id");
  const watchedDescription = form.watch("description");
  const watchedShortDescription = form.watch("short_description");
  const watchedIsRefurbished = form.watch("is_refurbished");

  const onSubmit = async (data: FormData) => {
    console.log("🔧 ProductFormInfoTab - Submitting data:", data);

    const productData = {
      name: data.name,
      description: data.description,
      short_description: data.short_description,
      category_id: data.category_id,
      brand_id: data.brand_id,
      price: data.price,
      stock: data.stock,
      sku: data.sku,
      is_refurbished: data.is_refurbished,
      condition: data.is_refurbished ? data.condition : null,
      purchase_price: data.purchase_price,
      active: data.active,
      admin_only: data.admin_only,
    };

    if (isEditMode && productToEdit?.id) {
      await updateProduct.mutateAsync({ id: productToEdit.id, ...productData });
    } else {
      await createProduct.mutateAsync(productData);
    }
    
    onSuccess();
  };

  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    console.log("🤖 ProductFormInfoTab - AI descriptions received", { 
      descriptionLength: description.length,
      shortDescriptionLength: shortDescription.length 
    });
    
    // Update form values
    form.setValue("description", description, { shouldValidate: true });
    if (shortDescription) {
      form.setValue("short_description", shortDescription, { shouldValidate: true });
    }
  };

  const handleDescriptionChange = (description: string) => {
    form.setValue("description", description, { shouldValidate: true });
  };

  const handleShortDescriptionChange = (shortDescription: string) => {
    form.setValue("short_description", shortDescription, { shouldValidate: true });
  };

  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? "Modifier le produit" : "Créer un nouveau produit"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit *</Label>
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Nom du produit"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  {...form.register("sku")}
                  placeholder="SKU du produit"
                />
              </div>
            </div>

            {/* Category and Brand */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select
                  value={form.watch("category_id")}
                  onValueChange={(value) => form.setValue("category_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.translation || category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand">Marque</Label>
                <Select
                  value={form.watch("brand_id")}
                  onValueChange={(value) => form.setValue("brand_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une marque" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.translation || brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI Description Generator */}
            {watchedName && (
              <DescriptionGenerator
                productName={watchedName}
                categoryId={watchedCategoryId || ""}
                brandId={watchedBrandId || ""}
                categories={categories}
                brands={brands}
                onDescriptionGenerated={handleDescriptionGenerated}
                currentDescription={watchedDescription || ""}
                currentShortDescription={watchedShortDescription || ""}
                onDescriptionChange={handleDescriptionChange}
                onShortDescriptionChange={handleShortDescriptionChange}
              />
            )}

            {/* Manual Description Fields (for users who prefer manual input) */}
            <div className="space-y-4">
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="short_description">Description courte</Label>
                  <Textarea
                    id="short_description"
                    {...form.register("short_description")}
                    rows={2}
                    placeholder="Description courte du produit (optionnel)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description détaillée</Label>
                  <Textarea
                    id="description"
                    {...form.register("description")}
                    rows={4}
                    placeholder="Description détaillée du produit (optionnel)"
                  />
                </div>
              </div>
            </div>

            {/* Pricing and Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prix *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...form.register("price", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  {...form.register("stock", { valueAsNumber: true })}
                  placeholder="0"
                />
                {form.formState.errors.stock && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.stock.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_price">Prix d'achat</Label>
                <Input
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  {...form.register("purchase_price", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Product Options */}
            <div className="space-y-4">
              <Separator />
              
              {/* Refurbished Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Produit reconditionné</Label>
                  <p className="text-sm text-muted-foreground">
                    Ce produit est-il reconditionné ?
                  </p>
                </div>
                <Switch
                  checked={watchedIsRefurbished}
                  onCheckedChange={(checked) => {
                    form.setValue("is_refurbished", checked);
                    if (!checked) {
                      form.setValue("condition", "");
                    }
                  }}
                />
              </div>

              {/* Condition Select (only visible if refurbished) */}
              {watchedIsRefurbished && (
                <div className="space-y-2">
                  <Label htmlFor="condition">État du produit</Label>
                  <Select
                    value={form.watch("condition")}
                    onValueChange={(value) => form.setValue("condition", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez l'état" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="État Neuf">État Neuf</SelectItem>
                      <SelectItem value="Grade A">Grade A</SelectItem>
                      <SelectItem value="Grade B">Grade B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Admin Only Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Produit administrateur</Label>
                  <p className="text-sm text-muted-foreground">
                    Réservé aux administrateurs uniquement
                  </p>
                </div>
                <Switch
                  checked={form.watch("admin_only")}
                  onCheckedChange={(checked) => form.setValue("admin_only", checked)}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Produit actif</Label>
                  <p className="text-sm text-muted-foreground">
                    Le produit est-il disponible à la vente ?
                  </p>
                </div>
                <Switch
                  checked={form.watch("active")}
                  onCheckedChange={(checked) => form.setValue("active", checked)}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => window.history.back()}>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditMode ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? "Mettre à jour" : "Créer le produit"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFormInfoTab;
