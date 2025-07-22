
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import { useProductVariants } from "@/hooks/products/useProductVariants";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  price: z.number().min(0, "Le prix doit être positif"),
  purchasePrice: z.number().min(0, "Le prix d'achat doit être positif"),
  sku: z.string().optional(),
  active: z.boolean().default(true),
  isRefurbished: z.boolean().default(false),
  condition: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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
  const [isGenerating, setIsGenerating] = useState(false);
  const updateProduct = useUpdateProduct();
  const createProduct = useCreateProduct();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: variants = [] } = useProductVariants(productToEdit?.id);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: productToEdit?.name || "",
      description: productToEdit?.description || "",
      shortDescription: productToEdit?.shortDescription || "",
      categoryId: productToEdit?.category || "",
      brandId: productToEdit?.brand || "",
      price: productToEdit?.price || 0,
      purchasePrice: productToEdit?.regularPrice ? parseFloat(productToEdit.regularPrice) : 0,
      sku: productToEdit?.sku || "",
      active: productToEdit?.active ?? true,
      isRefurbished: productToEdit?.virtual || false,
      condition: productToEdit?.status || "neuf",
    },
  });

  const { watch, setValue } = form;
  const watchedValues = watch();

  const conditionOptions = [
    { value: "neuf", label: "Neuf" },
    { value: "excellent", label: "Excellent" },
    { value: "très bon", label: "Très bon" },
    { value: "bon", label: "Bon" },
    { value: "satisfaisant", label: "Satisfaisant" },
  ];

  const handleGenerateDescription = async () => {
    if (!watchedValues.name?.trim()) {
      toast.error("Veuillez saisir un nom de produit");
      return;
    }

    setIsGenerating(true);

    try {
      console.log("🤖 Generating description for product:", watchedValues.name);

      const category = categories?.find(c => c.id === watchedValues.categoryId);
      const brand = brands?.find(b => b.id === watchedValues.brandId);
      
      // Calculer la mensualité minimum des variantes
      const minMonthlyPrice = variants.length > 0 
        ? Math.min(...variants.map(v => v.monthly_price || 0).filter(p => p > 0))
        : 0;

      const { data, error } = await supabase.functions.invoke('generate-product-description', {
        body: {
          productName: watchedValues.name,
          brand: brand?.translation || brand?.name || "",
          category: category?.translation || category?.name || "",
          includeSpecifications: false,
          variants: variants,
          minMonthlyPrice: minMonthlyPrice,
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
      
      // Mettre à jour les valeurs du formulaire
      setValue("description", data.description);
      if (data.shortDescription) {
        setValue("shortDescription", data.shortDescription);
      }
      
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

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditMode && productToEdit) {
        await updateProduct.mutateAsync({
          id: productToEdit.id,
          name: data.name,
          short_description: data.shortDescription,
          description: data.description,
          purchase_price: data.purchasePrice,
          category_id: data.categoryId,
          brand_id: data.brandId,
          price: data.price,
          active: data.active,
          is_refurbished: data.isRefurbished,
          condition: data.condition,
        });
      } else {
        await createProduct.mutateAsync({
          name: data.name,
          short_description: data.shortDescription,
          description: data.description,
          purchase_price: data.purchasePrice,
          category_id: data.categoryId,
          brand_id: data.brandId,
          price: data.price,
          active: data.active,
          is_refurbished: data.isRefurbished,
          condition: data.condition,
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Erreur lors de la soumission:", error);
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Nom du produit"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                {...form.register("sku")}
                placeholder="SKU du produit"
              />
            </div>
          </div>

          {/* Catégorie et Marque */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Catégorie</Label>
              <Select 
                value={watchedValues.categoryId} 
                onValueChange={(value) => setValue("categoryId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.translation || category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandId">Marque</Label>
              <Select 
                value={watchedValues.brandId} 
                onValueChange={(value) => setValue("brandId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une marque" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.translation || brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix de vente (€)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                {...form.register("price", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.price && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Prix d'achat (€)</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                min="0"
                {...form.register("purchasePrice", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {form.formState.errors.purchasePrice && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.purchasePrice.message}
                </p>
              )}
            </div>
          </div>

          {/* État du produit */}
          <div className="space-y-2">
            <Label htmlFor="condition">État du produit</Label>
            <Select 
              value={watchedValues.condition} 
              onValueChange={(value) => setValue("condition", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner l'état" />
              </SelectTrigger>
              <SelectContent>
                {conditionOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Générateur de description IA intégré */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 mb-4">
              <Wand2 className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Générateur de description IA</h3>
            </div>
            
            <Button 
              type="button"
              onClick={handleGenerateDescription}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Générer une description
                </>
              )}
            </Button>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shortDescription">Description courte</Label>
                <Textarea
                  id="shortDescription"
                  {...form.register("shortDescription")}
                  rows={2}
                  className="resize-none"
                  placeholder="Saisissez une description courte ou générez-en une avec l'IA..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  rows={6}
                  className="resize-none"
                  placeholder="Saisissez une description détaillée ou générez-en une avec l'IA..."
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={watchedValues.active}
                onCheckedChange={(checked) => setValue("active", checked)}
              />
              <Label htmlFor="active">Produit actif</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isRefurbished"
                checked={watchedValues.isRefurbished}
                onCheckedChange={(checked) => setValue("isRefurbished", checked)}
              />
              <Label htmlFor="isRefurbished">Produit reconditionné</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={updateProduct.isPending || createProduct.isPending}
              className="w-full md:w-auto"
            >
              {updateProduct.isPending || createProduct.isPending ? (
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
      </CardContent>
    </Card>
  );
};

export default ProductFormInfoTab;
