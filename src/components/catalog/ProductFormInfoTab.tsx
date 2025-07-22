
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Package } from "lucide-react";
import { toast } from "sonner";
import { createProduct, updateProduct } from "@/services/catalogService";
import { Product } from "@/types/catalog";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import DescriptionGenerator from "./DescriptionGenerator";

const productSchema = z.object({
  name: z.string().min(1, "Le nom du produit est requis"),
  brand: z.string().min(1, "La marque est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  description: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  monthly_price: z.number().min(0, "Le prix mensuel doit être positif").optional(),
  model: z.string().optional(),
  active: z.boolean().default(true),
  admin_only: z.boolean().default(false),
  tier: z.enum(["silver", "gold", "platinum"]).optional(),
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
  const queryClient = useQueryClient();
  const [showDescriptionGenerator, setShowDescriptionGenerator] = useState(false);
  
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "",
      description: "",
      price: 0,
      monthly_price: 0,
      model: "",
      active: true,
      admin_only: false,
      tier: undefined,
    },
  });

  // Load product data for editing
  useEffect(() => {
    if (isEditMode && productToEdit) {
      form.reset({
        name: productToEdit.name || "",
        brand: productToEdit.brand || "",
        category: productToEdit.category || "",
        description: productToEdit.description || "",
        price: productToEdit.price || 0,
        monthly_price: productToEdit.monthly_price || 0,
        model: productToEdit.model || "",
        active: productToEdit.active !== false,
        admin_only: productToEdit.admin_only || false,
        tier: productToEdit.tier as "silver" | "gold" | "platinum" | undefined,
      });
    }
  }, [productToEdit, isEditMode, form]);

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la création: ${error.message}`);
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => 
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEditMode && productToEdit) {
        await updateProductMutation.mutateAsync({
          id: productToEdit.id,
          data: {
            ...data,
            updated_at: new Date().toISOString(),
          }
        });
      } else {
        await createProductMutation.mutateAsync({
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
      }
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const handleDescriptionGenerated = (description: string) => {
    form.setValue("description", description);
    setShowDescriptionGenerator(false);
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;

  // Check if we have enough data for AI generation
  const canGenerateDescription = form.watch("name") && form.watch("brand");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Informations du produit
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
                placeholder="Ex: ThinkPad X1 Carbon"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modèle</Label>
              <Input
                id="model"
                {...form.register("model")}
                placeholder="Ex: Gen 9"
              />
            </div>
          </div>

          {/* Brand and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marque *</Label>
              <Select 
                value={form.watch("brand")} 
                onValueChange={(value) => form.setValue("brand", value)}
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
              {form.formState.errors.brand && (
                <p className="text-sm text-red-500">{form.formState.errors.brand.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select 
                value={form.watch("category")} 
                onValueChange={(value) => form.setValue("category", value)}
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
              {form.formState.errors.category && (
                <p className="text-sm text-red-500">{form.formState.errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Description</Label>
              {canGenerateDescription && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDescriptionGenerator(!showDescriptionGenerator)}
                >
                  {showDescriptionGenerator ? "Masquer" : "Générer avec IA"}
                </Button>
              )}
            </div>
            
            {showDescriptionGenerator && canGenerateDescription && (
              <div className="mb-4">
                <DescriptionGenerator
                  product={{
                    name: form.watch("name"),
                    brand: form.watch("brand"),
                    category: form.watch("category"),
                    variant_combination_prices: productToEdit?.variant_combination_prices || []
                  } as Product}
                  onDescriptionGenerated={handleDescriptionGenerated}
                />
              </div>
            )}
            
            <Textarea
              id="description"
              {...form.register("description")}
              rows={4}
              placeholder="Description du produit..."
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix d'achat (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...form.register("price", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">{form.formState.errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_price">Mensualité leasing (€)</Label>
              <Input
                id="monthly_price"
                type="number"
                step="0.01"
                {...form.register("monthly_price", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.monthly_price && (
                <p className="text-sm text-red-500">{form.formState.errors.monthly_price.message}</p>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <Separator />
            <h3 className="text-lg font-medium">Paramètres</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tier">Niveau de gamme</Label>
                <Select 
                  value={form.watch("tier") || ""} 
                  onValueChange={(value) => form.setValue("tier", value as "silver" | "gold" | "platinum" | undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={form.watch("active")}
                  onCheckedChange={(checked) => form.setValue("active", checked)}
                />
                <Label htmlFor="active">Produit actif</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="admin_only"
                  checked={form.watch("admin_only")}
                  onCheckedChange={(checked) => form.setValue("admin_only", checked)}
                />
                <Label htmlFor="admin_only">Réservé aux admins</Label>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-t-transparent rounded-full"></span>
                  {isEditMode ? "Mise à jour..." : "Création..."}
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="mr-2 h-4 w-4" />
                  {isEditMode ? "Mettre à jour" : "Créer le produit"}
                </span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProductFormInfoTab;
