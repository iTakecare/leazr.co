import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Save, Package } from "lucide-react";
import { Product, Brand, Category } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useMultiTenant } from "@/hooks/useMultiTenant";
import DescriptionGenerator from "./DescriptionGenerator";

const productSchema = z.object({
  name: z.string().min(2, {
    message: "Le nom du produit doit comporter au moins 2 caractères.",
  }),
  description: z.string().optional(),
  short_description: z.string().optional(),
  category_id: z.string().min(1, {
    message: "Veuillez sélectionner une catégorie.",
  }),
  brand_id: z.string().min(1, {
    message: "Veuillez sélectionner une marque.",
  }),
  price: z.number({
    invalid_type_error: "Le prix doit être un nombre.",
  }).min(0, {
    message: "Le prix ne peut pas être négatif.",
  }),
  stock: z.number({
    invalid_type_error: "Le stock doit être un nombre.",
  }).min(0, {
    message: "Le stock ne peut pas être négatif.",
  }).optional(),
  sku: z.string().optional(),
  is_refurbished: z.boolean().default(false).optional(),
  condition: z.string().nullable().optional(),
  purchase_price: z.number({
    invalid_type_error: "Le prix d'achat doit être un nombre.",
  }).min(0, {
    message: "Le prix d'achat ne peut pas être négatif.",
  }).optional(),
  active: z.boolean().default(true).optional(),
  admin_only: z.boolean().default(false).optional(),
});

interface FormData extends z.infer<typeof productSchema> {}

interface ProductFormInfoTabProps {
  productToEdit?: Product;
  isEditMode: boolean;
  brands: Brand[];
  categories: Category[];
  onProductCreated?: (product: Product) => void;
  onProductUpdated?: (product: Product) => void;
}

const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({
  productToEdit,
  isEditMode,
  brands,
  categories,
  onProductCreated,
  onProductUpdated
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getCurrentCompanyId } = useMultiTenant();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      short_description: "",
      category_id: "",
      brand_id: "",
      price: 0,
      stock: 0,
      sku: "",
      is_refurbished: false,
      condition: "",
      purchase_price: 0,
      active: true,
      admin_only: false,
    },
  });

  const { setValue, watch, handleSubmit, formState: { errors } } = form;

  // Watch form values for the AI generator
  const watchedName = watch("name");
  const watchedCategoryId = watch("category_id");
  const watchedBrandId = watch("brand_id");
  const watchedDescription = watch("description");
  const watchedShortDescription = watch("short_description");

  useEffect(() => {
    if (productToEdit) {
      // Populate the form with the product data for editing
      setValue("name", productToEdit.name);
      setValue("description", productToEdit.description || "");
      setValue("short_description", productToEdit.short_description || "");
      setValue("category_id", productToEdit.category_id);
      setValue("brand_id", productToEdit.brand_id);
      setValue("price", productToEdit.price);
      setValue("stock", productToEdit.stock || 0);
      setValue("sku", productToEdit.sku || "");
      setValue("is_refurbished", productToEdit.is_refurbished || false);
      setValue("condition", productToEdit.condition || "");
      setValue("purchase_price", productToEdit.purchase_price || 0);
      setValue("active", productToEdit.active !== false);
      setValue("admin_only", productToEdit.admin_only || false);
    }
  }, [productToEdit, setValue]);

  // Handle AI-generated descriptions
  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    setValue("description", description);
    setValue("short_description", shortDescription);
  };

  const handleDescriptionChange = (description: string) => {
    setValue("description", description);
  };

  const handleShortDescriptionChange = (shortDescription: string) => {
    setValue("short_description", shortDescription);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      if (isEditMode && productToEdit) {
        // Update existing product
        const updatedProduct = await updateProductMutation.mutateAsync({
          id: productToEdit.id,
          name: data.name,
          description: data.description,
          short_description: data.short_description,
          category_id: data.category_id,
          brand_id: data.brand_id,
          price: data.price,
          stock: data.stock,
          sku: data.sku,
          is_refurbished: data.is_refurbished,
          condition: data.condition,
          purchase_price: data.purchase_price,
          active: data.active,
          admin_only: data.admin_only,
        });

        toast.success("Produit mis à jour avec succès");
        onProductUpdated?.(updatedProduct);
      } else {
        // Create new product
        const newProduct = await createProductMutation.mutateAsync(data);
        toast.success("Produit créé avec succès");
        onProductCreated?.(newProduct);
      }
    } catch (error: any) {
      console.error("Erreur lors de la soumission:", error);
      toast.error(
        `Erreur lors de la soumission du formulaire: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                placeholder="Nom du produit"
                type="text"
                {...form.register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select
                value={form.watch("category_id")}
                onValueChange={(value) => setValue("category_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-red-600">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque *</Label>
              <Select
                value={form.watch("brand_id")}
                onValueChange={(value) => setValue("brand_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une marque" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.brand_id && (
                <p className="text-sm text-red-600">{errors.brand_id.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix *</Label>
              <Input
                id="price"
                placeholder="Prix du produit"
                type="number"
                {...form.register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                placeholder="Stock du produit"
                type="number"
                {...form.register("stock", { valueAsNumber: true })}
              />
              {errors.stock && (
                <p className="text-sm text-red-600">{errors.stock.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Description Generator */}
      <DescriptionGenerator
        productName={watchedName}
        categoryId={watchedCategoryId}
        brandId={watchedBrandId}
        categories={categories}
        brands={brands}
        onDescriptionGenerated={handleDescriptionGenerated}
        currentDescription={watchedDescription}
        currentShortDescription={watchedShortDescription}
        onDescriptionChange={handleDescriptionChange}
        onShortDescriptionChange={handleShortDescriptionChange}
      />

      <Card>
        <CardHeader>
          <CardTitle>Descriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="short_description">Description courte</Label>
            <Textarea
              id="short_description"
              placeholder="Description courte pour les listes de produits..."
              {...form.register("short_description")}
              rows={2}
            />
            {errors.short_description && (
              <p className="text-sm text-red-600">{errors.short_description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description détaillée</Label>
            <Textarea
              id="description"
              placeholder="Description complète du produit..."
              {...form.register("description")}
              rows={6}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations de reconditionnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_refurbished"
              checked={form.watch("is_refurbished")}
              onCheckedChange={(checked) => setValue("is_refurbished", checked || false)}
            />
            <Label htmlFor="is_refurbished">Reconditionné</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">État</Label>
            <Input
              id="condition"
              placeholder="État du produit reconditionné (Grade A, B, C...)"
              type="text"
              {...form.register("condition")}
            />
            {errors.condition && (
              <p className="text-sm text-red-600">{errors.condition.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase_price">Prix d'achat</Label>
            <Input
              id="purchase_price"
              placeholder="Prix d'achat du produit"
              type="number"
              {...form.register("purchase_price", { valueAsNumber: true })}
            />
            {errors.purchase_price && (
              <p className="text-sm text-red-600">{errors.purchase_price.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SKU & Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              placeholder="SKU du produit"
              type="text"
              {...form.register("sku")}
            />
            {errors.sku && (
              <p className="text-sm text-red-600">{errors.sku.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={form.watch("active")}
              onCheckedChange={(checked) => setValue("active", checked !== false)}
            />
            <Label htmlFor="active">Actif</Label>
          </div>

           <div className="flex items-center space-x-2">
            <Checkbox
              id="admin_only"
              checked={form.watch("admin_only")}
              onCheckedChange={(checked) => setValue("admin_only", checked !== false)}
            />
            <Label htmlFor="admin_only">Admin Only</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEditMode ? "Modification..." : "Création..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditMode ? "Modifier le produit" : "Créer le produit"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ProductFormInfoTab;
