
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Package } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useCategories } from "@/hooks/categories/useCategories";
import { useBrands } from "@/hooks/brands/useBrands";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import DescriptionGenerator from "./DescriptionGenerator";

const productFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  short_description: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand_id: z.string().min(1, "La marque est requise"),
  model: z.string().optional(),
  reference: z.string().optional(),
  purchase_price: z.number().min(0, "Le prix d'achat doit être positif"),
  selling_price: z.number().min(0, "Le prix de vente doit être positif"),
  active: z.boolean().default(true),
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      short_description: "",
      description: "",
      category_id: "",
      brand_id: "",
      model: "",
      reference: "",
      purchase_price: 0,
      selling_price: 0,
      active: true,
    },
  });

  // Reset form when productToEdit changes
  useEffect(() => {
    if (isEditMode && productToEdit) {
      console.log("📝 ProductFormInfoTab - Setting form values from product", productToEdit);
      form.reset({
        name: productToEdit.name || "",
        short_description: productToEdit.short_description || "",
        description: productToEdit.description || "",
        category_id: productToEdit.category_id || "",
        brand_id: productToEdit.brand_id || "",
        model: productToEdit.model || "",
        reference: productToEdit.reference || "",
        purchase_price: productToEdit.purchase_price || 0,
        selling_price: productToEdit.selling_price || 0,
        active: productToEdit.active ?? true,
      });
    } else if (!isEditMode) {
      console.log("📝 ProductFormInfoTab - Resetting form for create mode");
      form.reset({
        name: "",
        short_description: "",
        description: "",
        category_id: "",
        brand_id: "",
        model: "",
        reference: "",
        purchase_price: 0,
        selling_price: 0,
        active: true,
      });
    }
  }, [productToEdit, isEditMode, form]);

  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    console.log("📝 ProductFormInfoTab - Setting generated descriptions", {
      description: description.length,
      shortDescription: shortDescription?.length || 0
    });
    
    // Update form values
    form.setValue("description", description);
    if (shortDescription) {
      form.setValue("short_description", shortDescription);
    }
  };

  const handleDescriptionChange = (description: string) => {
    form.setValue("description", description);
  };

  const handleShortDescriptionChange = (shortDescription: string) => {
    form.setValue("short_description", shortDescription);
  };

  const onSubmit = async (data: ProductFormData) => {
    console.log("📝 ProductFormInfoTab - Submitting form", { isEditMode, data });
    setIsSubmitting(true);

    try {
      if (isEditMode && productToEdit) {
        await updateProductMutation.mutateAsync({
          id: productToEdit.id,
          ...data,
        });
        console.log("✅ ProductFormInfoTab - Product updated successfully");
      } else {
        await createProductMutation.mutateAsync(data);
        console.log("✅ ProductFormInfoTab - Product created successfully");
      }
      
      onSuccess();
    } catch (error) {
      console.error("❌ ProductFormInfoTab - Submit error:", error);
      toast.error(`Erreur lors de ${isEditMode ? 'la mise à jour' : 'la création'} du produit`);
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
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du produit *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom du produit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Référence</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Référence produit" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modèle</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Modèle du produit" />
                      </FormControl>
                      <FormMessage />
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
                          Le produit sera visible dans le catalogue
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="purchase_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix d'achat (€) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="selling_price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix de vente (€) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full md:w-auto"
              >
                {isSubmitting ? (
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

      {/* Description Generator - handles both manual input and AI generation */}
      <DescriptionGenerator
        productName={form.watch("name")}
        categoryId={form.watch("category_id")}
        brandId={form.watch("brand_id")}
        categories={categories}
        brands={brands}
        currentDescription={form.watch("description")}
        currentShortDescription={form.watch("short_description")}
        onDescriptionGenerated={handleDescriptionGenerated}
        onDescriptionChange={handleDescriptionChange}
        onShortDescriptionChange={handleShortDescriptionChange}
      />
    </div>
  );
};

export default ProductFormInfoTab;
