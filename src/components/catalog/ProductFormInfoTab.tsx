import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Save, Loader2 } from "lucide-react";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useBrands } from "@/hooks/products/useBrands";
import { useCategories } from "@/hooks/products/useCategories";
import DescriptionGenerator from "./DescriptionGenerator";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif").default(0),
  purchasePrice: z.number().min(0, "Le prix d'achat doit être positif").default(0),
  monthlyPrice: z.number().min(0, "Le prix mensuel doit être positif").optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  sku: z.string().optional(),
  stock: z.number().min(0, "Le stock doit être positif").default(0),
  active: z.boolean().default(true),
  adminOnly: z.boolean().default(false),
  isRefurbished: z.boolean().default(true), // Changed to true by default
  condition: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

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
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: productToEdit?.name || "",
      description: productToEdit?.description || "",
      shortDescription: (productToEdit as any)?.short_description || "",
      price: productToEdit?.price || 0,
      purchasePrice: (productToEdit as any)?.purchase_price || 0,
      monthlyPrice: productToEdit?.monthly_price || 0,
      categoryId: (productToEdit as any)?.category_id || "",
      brandId: (productToEdit as any)?.brand_id || "",
      sku: productToEdit?.sku || "",
      stock: productToEdit?.stock || 0,
      active: productToEdit?.active ?? true,
      adminOnly: (productToEdit as any)?.admin_only ?? false,
      isRefurbished: (productToEdit as any)?.is_refurbished ?? true, // Changed to true by default
      condition: (productToEdit as any)?.condition || "",
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEditMode && productToEdit) {
        await updateProduct.mutateAsync({
          id: productToEdit.id,
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription,
          price: data.price,
          purchasePrice: data.purchasePrice,
          categoryId: data.categoryId,
          brandId: data.brandId,
          sku: data.sku,
          stock: data.stock,
          active: data.active,
          isRefurbished: data.isRefurbished,
          condition: data.condition,
        });
      } else {
        await createProduct.mutateAsync({
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription,
          price: data.price,
          purchasePrice: data.purchasePrice,
          categoryId: data.categoryId,
          brandId: data.brandId,
          sku: data.sku,
          stock: data.stock,
          active: data.active,
          isRefurbished: data.isRefurbished,
          condition: data.condition,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
    }
  };

  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    form.setValue("description", description);
    if (shortDescription) {
      form.setValue("shortDescription", shortDescription);
    }
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU du produit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
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
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marque</FormLabel>
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
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix d'achat (€)</FormLabel>
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
                  name="monthlyPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix mensuel (€)</FormLabel>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
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
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>État</FormLabel>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="isRefurbished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Produit reconditionné</FormLabel>
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Produit actif</FormLabel>
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
                  name="adminOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Admin uniquement</FormLabel>
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

              <FormField
                control={form.control}
                name="shortDescription"
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
                    <FormLabel>Description</FormLabel>
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

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditMode ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? "Mettre à jour le produit" : "Créer le produit"}
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <DescriptionGenerator
        productName={form.watch("name")}
        categoryId={form.watch("categoryId") || ""}
        brandId={form.watch("brandId") || ""}
        categories={categories}
        brands={brands}
        onDescriptionGenerated={handleDescriptionGenerated}
      />
    </div>
  );
};

export default ProductFormInfoTab;