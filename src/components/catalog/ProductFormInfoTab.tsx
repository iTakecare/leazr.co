import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Package, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Product } from "@/types/catalog";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import { useProductVariants } from "@/hooks/products/useProductVariants";
import { supabase } from "@/integrations/supabase/client";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  purchasePrice: z.number().min(0, "Le prix d'achat doit être positif").optional(),
  sku: z.string().optional(),
  active: z.boolean(),
  isRefurbished: z.boolean(),
  condition: z.string(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormInfoTabProps {
  productToEdit?: Product;
  onSuccess?: () => void;
  isEditMode: boolean;
}

const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({ 
  productToEdit, 
  onSuccess, 
  isEditMode 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDescription, setAiDescription] = useState("");
  const [aiShortDescription, setAiShortDescription] = useState("");
  
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { data: brands = [], isLoading: loadingBrands } = useBrands();
  const { data: variants } = useProductVariants(productToEdit?.id);
  
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: productToEdit?.name || "",
      description: productToEdit?.description || "",
      shortDescription: (productToEdit as any)?.short_description || "",
      categoryId: (productToEdit as any)?.category_id || "",
      brandId: (productToEdit as any)?.brand_id || "",
      price: productToEdit?.price || 0,
      purchasePrice: (productToEdit as any)?.purchase_price || 0,
      sku: productToEdit?.sku || "",
      active: productToEdit?.active ?? true,
      isRefurbished: (productToEdit as any)?.is_refurbished || false,
      condition: (productToEdit as any)?.condition || "neuf",
    },
  });

  useEffect(() => {
    if (productToEdit) {
      form.reset({
        name: productToEdit.name || "",
        description: productToEdit.description || "",
        shortDescription: (productToEdit as any).short_description || "",
        categoryId: (productToEdit as any).category_id || "",
        brandId: (productToEdit as any).brand_id || "",
        price: productToEdit.price || 0,
        purchasePrice: (productToEdit as any).purchase_price || 0,
        sku: productToEdit.sku || "",
        active: productToEdit.active ?? true,
        isRefurbished: (productToEdit as any).is_refurbished || false,
        condition: (productToEdit as any).condition || "neuf",
      });
    }
  }, [productToEdit, form]);

  const handleGenerateDescription = async () => {
    const formData = form.getValues();
    
    if (!formData.name?.trim()) {
      toast.error("Veuillez saisir un nom de produit");
      return;
    }

    setIsGenerating(true);

    try {
      console.log("🤖 Generating description for product:", formData.name);

      const category = categories?.find(c => c.id === formData.categoryId);
      const brand = brands?.find(b => b.id === formData.brandId);
      
      let minMonthlyPrice = null;
      if (variants?.length > 0) {
        const prices = variants.map(v => v.monthly_price).filter(p => p != null);
        if (prices.length > 0) {
          minMonthlyPrice = Math.min(...prices);
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: formData.name,
          brand: brand?.translation || brand?.name || "",
          category: category?.translation || category?.name || "",
          includeSpecifications: false,
          variants: [],
          minMonthlyPrice: minMonthlyPrice
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erreur lors de la génération");
      }

      if (!data?.success || !data?.description) {
        throw new Error("Aucune description générée");
      }

      console.log("✅ Description generated successfully");
      
      setAiDescription(data.description);
      setAiShortDescription(data.shortDescription || "");
      
      form.setValue("description", data.description);
      form.setValue("shortDescription", data.shortDescription || "");
      
      toast.success("Description générée avec succès", {
        description: `Modèle utilisé: ${data.model} | Perplexity: ${data.usedPerplexity ? 'Oui' : 'Non'}`
      });

    } catch (error) {
      console.error("Error generating description:", error);
      toast.error(`Erreur lors de la génération: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      console.log("📝 Submitting product form", { isEditMode, data });

      if (isEditMode && productToEdit) {
        await updateProduct.mutateAsync({
          id: productToEdit.id,
          name: data.name,
          description: data.description,
          short_description: data.shortDescription,
          category_id: data.categoryId,
          brand_id: data.brandId,
          price: data.price,
          purchase_price: data.purchasePrice,
          sku: data.sku,
          active: data.active,
          is_refurbished: data.isRefurbished,
          condition: data.condition,
        });
      } else {
        await createProduct.mutateAsync({
          name: data.name,
          description: data.description,
          short_description: data.shortDescription,
          category_id: data.categoryId,
          brand_id: data.brandId,
          price: data.price,
          purchase_price: data.purchasePrice,
          sku: data.sku,
          active: data.active,
          is_refurbished: data.isRefurbished,
          condition: data.condition,
        });
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const isLoading = updateProduct.isPending || createProduct.isPending;

  return (
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
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="SKU du produit" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix de vente (€) *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
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
                name="purchasePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix d'achat (€)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        <SelectItem value="neuf">Neuf</SelectItem>
                        <SelectItem value="occasion">Occasion</SelectItem>
                        <SelectItem value="reconditionne">Reconditionné</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isRefurbished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Reconditionné</FormLabel>
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
                      <FormLabel className="text-base">Actif</FormLabel>
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

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="shortDescription">Description courte</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateDescription}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Générer avec IA
                    </>
                  )}
                </Button>
              </div>

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={2}
                        placeholder="Description courte du produit"
                      />
                    </FormControl>
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="Description détaillée du produit"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditMode ? "Mise à jour..." : "Création..."}
                  </>
                ) : (
                  <>
                    {isEditMode ? "Mettre à jour le produit" : "Créer le produit"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ProductFormInfoTab;
