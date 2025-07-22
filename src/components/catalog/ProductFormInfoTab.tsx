import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Info } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/types/catalog";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import DescriptionGenerator from "./DescriptionGenerator";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  categoryId: z.string().min(1, "La catégorie est requise"),
  brandId: z.string().min(1, "La marque est requise"),
  price: z.number().min(0, "Le prix doit être positif"),
  stock: z.number().min(0, "Le stock doit être positif"),
  sku: z.string().min(1, "Le SKU est requis"),
  isRefurbished: z.boolean().default(false),
  condition: z.string().optional(),
  warranty: z.string().optional(),
  images: z.array(z.string()).optional(),
  active: z.boolean().default(true),
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
  const [isSaving, setIsSaving] = useState(false);
  
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      shortDescription: "",
      categoryId: "",
      brandId: "",
      price: 0,
      stock: 0,
      sku: "",
      isRefurbished: false,
      condition: "",
      warranty: "",
      images: [],
      active: true,
    },
  });

  useEffect(() => {
    if (productToEdit) {
      console.log("📝 ProductFormInfoTab - Initializing form with product data", productToEdit);
      form.reset({
        name: productToEdit.name || "",
        description: productToEdit.description || "",
        shortDescription: productToEdit.shortDescription || "",
        categoryId: productToEdit.categoryId || "",
        brandId: productToEdit.brandId || "",
        price: productToEdit.price || 0,
        stock: productToEdit.stock || 0,
        sku: productToEdit.sku || "",
        isRefurbished: productToEdit.isRefurbished || false,
        condition: productToEdit.condition || "",
        warranty: productToEdit.warranty || "",
        images: productToEdit.images || [],
        active: productToEdit.active !== false,
      });
    }
  }, [productToEdit, form]);

  const onSubmit = async (data: ProductFormData) => {
    console.log("📝 ProductFormInfoTab - Submitting form", { data, isEditMode });
    setIsSaving(true);

    try {
      if (isEditMode && productToEdit) {
        console.log("📝 ProductFormInfoTab - Updating existing product");
        const updatedProduct = {
          ...productToEdit,
          ...data,
          updatedAt: new Date().toISOString(),
        };
        
        await updateProductMutation.mutateAsync(updatedProduct);
        console.log("✅ ProductFormInfoTab - Product updated successfully");
      } else {
        console.log("📝 ProductFormInfoTab - Creating new product");
        await createProductMutation.mutateAsync(data);
        console.log("✅ ProductFormInfoTab - Product created successfully");
      }
      
      onSuccess();
    } catch (error) {
      console.error("❌ ProductFormInfoTab - Error saving product:", error);
      toast.error("Erreur lors de l'enregistrement du produit");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDescriptionGenerated = (description: string) => {
    form.setValue("description", description);
    toast.success("Description générée avec succès");
  };

  if (categoriesLoading || brandsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Chargement...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
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
                      <Input placeholder="ex: MacBook Pro 13''" {...field} />
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
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: MBP13-001" {...field} />
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
                name="brandId"
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
            </div>

            <FormField
              control={form.control}
              name="shortDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description courte</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description courte pour les listes de produits..."
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    Utilisée dans les listes de produits et aperçus
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description détaillée</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description complète du produit..."
                      {...field}
                      rows={6}
                    />
                  </FormControl>
                  <FormDescription>
                    Description complète affichée sur la page du produit
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DescriptionGenerator
              productName={form.watch("name")}
              categoryId={form.watch("categoryId")}
              brandId={form.watch("brandId")}
              categories={categories}
              brands={brands}
              onDescriptionGenerated={handleDescriptionGenerated}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix (€) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
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
                    <FormLabel>Stock *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informations produit reconditionné</h3>
              
              <FormField
                control={form.control}
                name="isRefurbished"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Produit reconditionné</FormLabel>
                      <FormDescription>
                        Ce produit est-il reconditionné ?
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("isRefurbished") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <SelectItem value="comme_neuf">Comme neuf</SelectItem>
                            <SelectItem value="tres_bon_etat">Très bon état</SelectItem>
                            <SelectItem value="bon_etat">Bon état</SelectItem>
                            <SelectItem value="etat_correct">État correct</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="warranty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Garantie</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: 12 mois" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? "Mettre à jour" : "Créer le produit"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ProductFormInfoTab;
