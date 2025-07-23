import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useBrands } from "@/hooks/products/useBrands";
import { useCategories } from "@/hooks/products/useCategories";
import DescriptionGenerator from "./DescriptionGenerator";

// Product form validation schema
const productFormSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  brand: z.string().min(1, "La marque est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  description: z.string().optional(),
  purchase_price: z.number().min(0).optional(),
  active: z.boolean().default(true),
  admin_only: z.boolean().default(false),
  specifications: z.record(z.union([z.string(), z.number()])).optional()
});

type FormData = z.infer<typeof productFormSchema>;

interface ProductFormInfoTabProps {
  productToEdit?: Product;
  isEditMode: boolean;
  brands: string[];
  categories: string[];
  onProductCreated?: () => void;
  onProductUpdated?: () => void;
}

const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({
  productToEdit,
  isEditMode,
  onProductCreated,
  onProductUpdated
}) => {
  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();

  // Initialize form with existing product data or defaults
  const form = useForm<FormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: productToEdit?.name || "",
      brand: productToEdit?.brand || "",
      category: productToEdit?.category || "",
      description: productToEdit?.description || "",
      purchase_price: productToEdit?.purchase_price || 0,
      active: productToEdit?.active ?? true,
      admin_only: productToEdit?.admin_only ?? false,
      specifications: productToEdit?.specifications as Record<string, string | number> || {}
    }
  });

  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = form;

  // Mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  // Watch form values for controlled components
  const watchedActive = watch("active");
  const watchedAdminOnly = watch("admin_only");

  const onSubmit = async (data: FormData) => {
    console.log("📝 Form submitted with data:", data);

    try {
      if (isEditMode && productToEdit) {
        console.log("🔄 Updating existing product:", productToEdit.id);
        await updateProductMutation.mutateAsync({
          id: productToEdit.id,
          data: {
            ...data,
            specifications: data.specifications || {}
          }
        });
        
        toast.success("Produit mis à jour avec succès");
        if (onProductUpdated) onProductUpdated();
      } else {
        console.log("✨ Creating new product");
        await createProductMutation.mutateAsync({
          ...data,
          specifications: data.specifications || {}
        });
        
        toast.success("Produit créé avec succès");
        if (onProductCreated) onProductCreated();
      }
    } catch (error) {
      console.error("❌ Error submitting form:", error);
      toast.error(`Erreur lors de ${isEditMode ? 'la mise à jour' : 'la création'} du produit`);
    }
  };

  // Description handler
  const handleDescriptionGenerated = (description: string) => {
    console.log("📝 Description generated", description);
    setValue("description", description);
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? "Modifier le produit" : "Nouveau produit"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Ex: MacBook Pro 13 pouces"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Brand and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Marque *</Label>
                <Select
                  value={watch("brand")}
                  onValueChange={(value) => setValue("brand", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une marque" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.brand && (
                  <p className="text-sm text-red-600">{errors.brand.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Catégorie *</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(value) => setValue("category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>
            </div>

            {/* Purchase Price */}
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Prix d'achat (€)</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                {...register("purchase_price", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.purchase_price && (
                <p className="text-sm text-red-600">{errors.purchase_price.message}</p>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Produit actif</Label>
                  <p className="text-sm text-muted-foreground">
                    Le produit sera visible dans le catalogue
                  </p>
                </div>
                <Switch
                  checked={watchedActive}
                  onCheckedChange={(checked) => setValue("active", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Réservé aux administrateurs</Label>
                  <p className="text-sm text-muted-foreground">
                    Seuls les administrateurs peuvent voir ce produit
                  </p>
                </div>
                <Switch
                  checked={watchedAdminOnly}
                  onCheckedChange={(checked) => setValue("admin_only", checked)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading || !isDirty}>
                {isLoading ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></div>
                    {isEditMode ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? "Mettre à jour" : "Créer le produit"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Description Generator - Keep existing one */}
      <DescriptionGenerator
        productName={watch("name")}
        brand={watch("brand")}
        category={watch("category")}
        onDescriptionGenerated={handleDescriptionGenerated}
      />
    </div>
  );
};

export default ProductFormInfoTab;
