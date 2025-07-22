import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useBrands } from "@/hooks/products/useBrands";
import { useCategories } from "@/hooks/products/useCategories";
import DescriptionGenerator from "./DescriptionGenerator";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  purchasePrice: z.number().min(0, "Le prix d'achat doit être positif"),
  monthlyPrice: z.number().optional(),
  categoryId: z.string().min(1, "La catégorie est requise"),
  brandId: z.string().min(1, "La marque est requise"),
  active: z.boolean().default(true),
  isRefurbished: z.boolean().default(true),
  condition: z.string().optional(),
  adminOnly: z.boolean().default(false),
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

  // États pour les descriptions
  const [currentDescription, setCurrentDescription] = useState("");
  const [currentShortDescription, setCurrentShortDescription] = useState("");

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: (productToEdit as any)?.name || "",
      shortDescription: (productToEdit as any)?.short_description || "",
      description: (productToEdit as any)?.description || "",
      purchasePrice: (productToEdit as any)?.purchase_price || 0,
      monthlyPrice: (productToEdit as any)?.monthly_price || undefined,
      categoryId: (productToEdit as any)?.category_id || "",
      brandId: (productToEdit as any)?.brand_id || "",
      active: (productToEdit as any)?.active ?? true,
      isRefurbished: (productToEdit as any)?.is_refurbished ?? true,
      condition: (productToEdit as any)?.condition || "",
      adminOnly: (productToEdit as any)?.admin_only ?? false,
    },
  });

  // Synchroniser les états locaux avec les valeurs du formulaire
  React.useEffect(() => {
    const subscription = form.watch((value) => {
      setCurrentDescription(value.description || "");
      setCurrentShortDescription(value.shortDescription || "");
    });
    
    // Initialiser les valeurs au chargement
    setCurrentDescription(form.getValues("description") || "");
    setCurrentShortDescription(form.getValues("shortDescription") || "");
    
    return () => subscription.unsubscribe();
  }, [form]);

  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    form.setValue("description", description);
    form.setValue("shortDescription", shortDescription);
    setCurrentDescription(description);
    setCurrentShortDescription(shortDescription);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (isEditMode && productToEdit) {
        await updateProduct.mutateAsync({
          id: productToEdit.id,
          name: data.name,
          short_description: data.shortDescription,
          description: data.description,
          purchase_price: data.purchasePrice,
          monthly_price: data.monthlyPrice,
          category_id: data.categoryId,
          brand_id: data.brandId,
          active: data.active,
          is_refurbished: data.isRefurbished,
          condition: data.condition,
          admin_only: data.adminOnly,
        });
      } else {
        await createProduct.mutateAsync({
          name: data.name,
          short_description: data.shortDescription,
          description: data.description,
          purchase_price: data.purchasePrice,
          monthly_price: data.monthlyPrice,
          category_id: data.categoryId,
          brand_id: data.brandId,
          active: data.active,
          is_refurbished: data.isRefurbished,
          condition: data.condition,
          admin_only: data.adminOnly,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erreur lors de la sauvegarde du produit");
    }
  };

  const isLoading = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Informations du produit
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
                        <Input placeholder="Ex: MacBook Pro 14" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <FormLabel>Marque *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                <FormField
                  control={form.control}
                  name="purchasePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix d'achat *</FormLabel>
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
                      <FormLabel>Prix mensuel (optionnel)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                      <FormLabel>État du produit</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Excellent, Bon, Satisfaisant" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Produit actif</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isRefurbished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Produit reconditionné</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adminOnly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Réservé aux administrateurs</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

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

      {/* Générateur de description avec les champs intégrés */}
      <DescriptionGenerator
        productName={form.watch("name")}
        categoryId={form.watch("categoryId")}
        brandId={form.watch("brandId")}
        categories={categories}
        brands={brands}
        onDescriptionGenerated={handleDescriptionGenerated}
        currentDescription={currentDescription}
        currentShortDescription={currentShortDescription}
        onDescriptionChange={(desc) => {
          setCurrentDescription(desc);
          form.setValue("description", desc);
        }}
        onShortDescriptionChange={(shortDesc) => {
          setCurrentShortDescription(shortDesc);
          form.setValue("shortDescription", shortDesc);
        }}
      />
    </div>
  );
};

export default ProductFormInfoTab;
