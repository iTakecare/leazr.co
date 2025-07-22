
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Save, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createProduct, updateProduct, getBrands, getCategories } from "@/services/catalogService";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@/types/catalog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  brand: z.string().min(1, "La marque est requise"),
  category: z.string().min(1, "La catégorie est requise"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Le prix doit être positif"),
  monthly_price: z.coerce.number().min(0, "Le prix mensuel doit être positif"),
  active: z.boolean(),
  admin_only: z.boolean(),
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      brand: "",
      category: "",
      description: "",
      price: 0,
      monthly_price: 0,
      active: true,
      admin_only: false,
    },
  });

  // Load form data if editing
  useEffect(() => {
    if (isEditMode && productToEdit) {
      console.log("📝 ProductFormInfoTab - Loading edit data:", productToEdit.name);
      form.reset({
        name: productToEdit.name || "",
        brand: productToEdit.brand || "",
        category: productToEdit.category || "",
        description: productToEdit.description || "",
        price: productToEdit.price || 0,
        monthly_price: productToEdit.monthly_price || 0,
        active: productToEdit.active ?? true,
        admin_only: productToEdit.admin_only ?? false,
      });
    }
  }, [productToEdit, isEditMode, form]);

  // Fetch brands and categories
  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: getBrands,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      console.log("✅ Product created successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onSuccess();
    },
    onError: (error) => {
      console.error("❌ Error creating product:", error);
      toast.error("Erreur lors de la création du produit");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data),
    onSuccess: () => {
      console.log("✅ Product updated successfully");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productToEdit?.id] });
      onSuccess();
    },
    onError: (error) => {
      console.error("❌ Error updating product:", error);
      toast.error("Erreur lors de la mise à jour du produit");
    },
  });

  const generateDescription = async () => {
    const formValues = form.getValues();
    const { name, brand, category } = formValues;

    if (!name) {
      toast.error("Veuillez renseigner le nom du produit pour générer une description");
      return;
    }

    setIsGeneratingDescription(true);
    try {
      console.log("🤖 Generating AI description for:", { name, brand, category });
      
      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: name,
          brand: brand || undefined,
          category: category || undefined,
        },
      });

      if (error) {
        console.error("❌ Error generating description:", error);
        toast.error("Erreur lors de la génération de la description");
        return;
      }

      if (data?.description) {
        form.setValue('description', data.description);
        toast.success("Description générée avec succès !");
      } else {
        toast.error("Aucune description générée");
      }
    } catch (error) {
      console.error("❌ Error in generateDescription:", error);
      toast.error("Erreur lors de la génération de la description");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const onSubmit = (data: ProductFormData) => {
    console.log("📝 ProductFormInfoTab - Submitting:", { isEditMode, data });

    if (isEditMode && productToEdit) {
      updateMutation.mutate({
        id: productToEdit.id,
        data: {
          ...data,
          updated_at: new Date().toISOString(),
        },
      });
    } else {
      createMutation.mutate({
        ...data,
        company_id: user?.user_metadata?.company_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const dataLoading = brandsLoading || categoriesLoading;

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du produit *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: MacBook Pro 16''" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brand"
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
                          <SelectItem key={brand.id} value={brand.name}>
                            {brand.translation}
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
                name="category"
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
                          <SelectItem key={category.id} value={category.name}>
                            {category.translation}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Description</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateDescription}
                      disabled={isGeneratingDescription}
                      className="text-sm"
                    >
                      {isGeneratingDescription ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Générer avec l'IA
                        </>
                      )}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea 
                      placeholder="Description détaillée du produit..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix d'achat (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="monthly_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix mensuel (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Produit actif</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="admin_only"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Réservé aux administrateurs</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEditMode ? "Mettre à jour" : "Créer le produit"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ProductFormInfoTab;
