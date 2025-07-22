
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Sparkles } from "lucide-react";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import DescriptionGenerator from "./DescriptionGenerator";

const productFormSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  short_description: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  stock: z.number().min(0, "Le stock doit être positif").optional(),
  sku: z.string().optional(),
  is_refurbished: z.boolean().optional(),
  condition: z.string().optional(),
  active: z.boolean().optional(),
  admin_only: z.boolean().optional(),
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
  isEditMode,
}) => {
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: brands = [], isLoading: loadingBrands } = useBrands();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  console.log("📝 ProductFormInfoTab - Render", { 
    isEditMode, 
    productToEdit: productToEdit?.name,
    categoriesCount: categories.length,
    brandsCount: brands.length
  });

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
      is_refurbished: false,
      condition: "",
      active: true,
      admin_only: false,
    },
  });

  // Reset form when productToEdit changes
  useEffect(() => {
    if (productToEdit && isEditMode) {
      console.log("📝 ProductFormInfoTab - Resetting form with product data", {
        name: productToEdit.name,
        brand: productToEdit.brand,
        category: productToEdit.category,
        price: productToEdit.price
      });
      
      form.reset({
        name: productToEdit.name || "",
        short_description: productToEdit.shortDescription || "",
        description: productToEdit.description || "",
        category_id: productToEdit.category || "",
        brand_id: productToEdit.brand || "",
        price: productToEdit.price || 0,
        stock: productToEdit.stock || 0,
        sku: productToEdit.sku || "",
        is_refurbished: false, // Property doesn't exist in Product type
        condition: "", // Property doesn't exist in Product type
        active: productToEdit.active !== false,
        admin_only: productToEdit.admin_only || false,
      });
    }
  }, [productToEdit, isEditMode, form]);

  const onSubmit = async (data: ProductFormData) => {
    console.log("📝 ProductFormInfoTab - Form submission", { data, isEditMode });
    
    try {
      if (isEditMode && productToEdit) {
        console.log("📝 ProductFormInfoTab - Updating product", { id: productToEdit.id, data });
        await updateProductMutation.mutateAsync({
          id: productToEdit.id,
          name: data.name,
          short_description: data.short_description,
          description: data.description,
          category_id: data.category_id,
          brand_id: data.brand_id,
          price: data.price,
          stock: data.stock,
          sku: data.sku,
          is_refurbished: data.is_refurbished,
          condition: data.condition,
          active: data.active,
          admin_only: data.admin_only,
        });
      } else {
        console.log("📝 ProductFormInfoTab - Creating new product", { data });
        await createProductMutation.mutateAsync({
          name: data.name,
          short_description: data.short_description,
          description: data.description,
          category_id: data.category_id,
          brand_id: data.brand_id,
          price: data.price || 0,
          stock: data.stock,
          sku: data.sku,
          is_refurbished: data.is_refurbished,
          condition: data.condition,
          active: data.active,
          admin_only: data.admin_only,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("📝 ProductFormInfoTab - Submission error:", error);
    }
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;
  const hasVariants = productToEdit?.has_variants || productToEdit?.variants_count > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations principales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations principales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      <FormLabel>Catégorie</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCategories ? "Chargement..." : "Sélectionner une catégorie"} />
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
                      <FormLabel>Marque</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingBrands ? "Chargement..." : "Sélectionner une marque"} />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU / Référence</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Prix de vente (€) *
                        {hasVariants && (
                          <Badge variant="secondary" className="ml-2">
                            Prix géré par les variantes
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          disabled={hasVariants}
                        />
                      </FormControl>
                      {hasVariants && (
                        <p className="text-sm text-muted-foreground">
                          Ce produit a des variantes. Le prix est géré dans l'onglet "Variantes".
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Descriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DescriptionGenerator
                productName={form.watch("name")}
                currentShortDescription={form.watch("short_description")}
                currentDescription={form.watch("description")}
                categoryId={form.watch("category_id") || ""}
                brandId={form.watch("brand_id") || ""}
                categories={categories}
                brands={brands}
                onDescriptionGenerated={(description, shortDescription) => {
                  if (shortDescription) form.setValue("short_description", shortDescription);
                  if (description) form.setValue("description", description);
                }}
                onShortDescriptionChange={(value) => form.setValue("short_description", value)}
                onDescriptionChange={(value) => form.setValue("description", value)}
              />
            </CardContent>
          </Card>

          {/* Paramètres avancés */}
          <Card>
            <CardHeader>
              <CardTitle>Paramètres</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="is_refurbished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Produit reconditionné</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Ce produit est-il reconditionné ?
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
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Produit actif</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Rendre ce produit visible dans le catalogue
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

              {form.watch("is_refurbished") && (
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>État du produit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'état" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="very_good">Très bon</SelectItem>
                          <SelectItem value="good">Bon</SelectItem>
                          <SelectItem value="fair">Correct</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="admin_only"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Accès administrateur uniquement</FormLabel>
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
            </CardContent>
          </Card>

          {/* Boutons d'action */}
          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEditMode ? "Mettre à jour" : "Créer le produit"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ProductFormInfoTab;
