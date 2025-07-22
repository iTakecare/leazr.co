
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import { Product } from "@/types/catalog";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  category_id: z.string().optional(),
  brand_id: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  stock: z.number().min(0, "Le stock doit être positif").optional(),
  sku: z.string().optional(),
  is_refurbished: z.boolean().default(false),
  condition: z.string().optional(),
  purchase_price: z.number().min(0, "Le prix d'achat doit être positif").optional(),
  active: z.boolean().default(true),
  admin_only: z.boolean().default(false),
}).refine((data) => {
  // Si le produit est reconditionné, la condition est requise
  if (data.is_refurbished && !data.condition) {
    return false;
  }
  return true;
}, {
  message: "L'état est requis pour un produit reconditionné",
  path: ["condition"]
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
  isEditMode,
}) => {
  console.log("🔧 ProductFormInfoTab - Props:", { isEditMode, hasProduct: !!productToEdit });

  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { mutate: createProduct, isPending: isCreating } = useCreateProduct();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
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

  const watchIsRefurbished = form.watch("is_refurbished");
  const isPending = isCreating || isUpdating;

  const onSubmit = (data: ProductFormData) => {
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
      updateProduct(
        {
          id: productToEdit.id,
          ...productData,
        },
        {
          onSuccess: () => {
            console.log("🔧 ProductFormInfoTab - Product updated successfully");
            onSuccess();
          },
        }
      );
    } else {
      createProduct(productData, {
        onSuccess: () => {
          console.log("🔧 ProductFormInfoTab - Product created successfully");
          onSuccess();
        },
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditMode ? "Modifier le produit" : "Créer un nouveau produit"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informations de base */}
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
                      <Input placeholder="Référence produit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Descriptions */}
            <FormField
              control={form.control}
              name="short_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description courte</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description courte du produit"
                      className="resize-none"
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
                  <FormLabel>Description complète</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description détaillée du produit"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Catégorie et Marque */}
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
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                          <SelectValue placeholder="Sélectionner une marque" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands?.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Prix et Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix de vente *</FormLabel>
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
                name="purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix d'achat</FormLabel>
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
            </div>

            {/* Options du produit */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FormLabel>Produit reconditionné</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Activer si le produit est reconditionné
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="is_refurbished"
                  render={({ field }) => (
                    <FormItem>
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

              {/* Dropdown conditionnel pour l'état */}
              {watchIsRefurbished && (
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>État du produit *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner l'état" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="État Neuf">État Neuf</SelectItem>
                          <SelectItem value="Grade A">Grade A</SelectItem>
                          <SelectItem value="Grade B">Grade B</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FormLabel>Produit administrateur</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Visible uniquement par les administrateurs
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="admin_only"
                  render={({ field }) => (
                    <FormItem>
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

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FormLabel>Produit actif</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Le produit est visible et disponible
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem>
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

            <div className="flex justify-end space-x-2">
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? isEditMode
                    ? "Mise à jour..."
                    : "Création..."
                  : isEditMode
                  ? "Mettre à jour le produit"
                  : "Créer le produit"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ProductFormInfoTab;
