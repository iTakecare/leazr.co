
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Product, Category, Brand } from "@/types/catalog";
import { useCategories } from "@/hooks/products/useCategories";
import { useBrands } from "@/hooks/products/useBrands";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import DescriptionGenerator from "./DescriptionGenerator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Validation schema with optional SKU
const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  category: z.string().min(1, "La catégorie est requise"),
  brand: z.string().min(1, "La marque est requise"),
  price: z.coerce.number().min(0, "Le prix doit être positif"),
  stock: z.coerce.number().min(0, "Le stock doit être positif").optional(),
  sku: z.string().optional(), // Made optional
  isRefurbished: z.boolean().optional(),
  condition: z.string().optional(),
  purchasePrice: z.coerce.number().min(0, "Le prix d'achat doit être positif").optional(),
  active: z.boolean().optional(),
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
  console.log("🛠️ ProductFormInfoTab - Props:", { 
    hasProductToEdit: !!productToEdit, 
    isEditMode,
    productName: productToEdit?.name
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: brands, isLoading: brandsLoading } = useBrands();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      shortDescription: "",
      category: "",
      brand: "",
      price: 0,
      stock: 0,
      sku: "",
      isRefurbished: false,
      condition: "",
      purchasePrice: 0,
      active: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && productToEdit) {
      console.log("🛠️ ProductFormInfoTab - Populating form with product data:", productToEdit);
      
      form.reset({
        name: productToEdit.name || "",
        description: productToEdit.description || "",
        shortDescription: productToEdit.shortDescription || "",
        category: productToEdit.category || "",
        brand: productToEdit.brand || "",
        price: productToEdit.price || 0,
        stock: productToEdit.stock || 0,
        sku: productToEdit.sku || "",
        isRefurbished: false, // Default for now since property doesn't exist
        condition: "",
        purchasePrice: 0,
        active: productToEdit.active !== false,
      });
    }
  }, [isEditMode, productToEdit, form]);

  const onSubmit = async (data: ProductFormData) => {
    console.log("🛠️ ProductFormInfoTab - Submitting form:", { data, isEditMode });
    setIsSubmitting(true);

    try {
      if (isEditMode && productToEdit) {
        console.log("🛠️ ProductFormInfoTab - Updating existing product");
        await updateProduct.mutateAsync({
          id: productToEdit.id,
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription,
          categoryId: data.category,
          brandId: data.brand,
          price: data.price,
          stock: data.stock,
          sku: data.sku || undefined, // Handle empty string as undefined
          isRefurbished: data.isRefurbished,
          condition: data.condition,
          purchasePrice: data.purchasePrice,
          active: data.active,
        });
      } else {
        console.log("🛠️ ProductFormInfoTab - Creating new product");
        await createProduct.mutateAsync({
          name: data.name,
          description: data.description,
          shortDescription: data.shortDescription,
          categoryId: data.category,
          brandId: data.brand,
          price: data.price,
          stock: data.stock,
          sku: data.sku || undefined, // Handle empty string as undefined
          isRefurbished: data.isRefurbished,
          condition: data.condition,
          purchasePrice: data.purchasePrice,
          active: data.active,
        });
      }

      console.log("🛠️ ProductFormInfoTab - Operation successful");
      onSuccess();
    } catch (error) {
      console.error("🛠️ ProductFormInfoTab - Operation failed:", error);
      toast.error(isEditMode ? "Erreur lors de la mise à jour" : "Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDescriptionGenerated = (description: string) => {
    console.log("🛠️ ProductFormInfoTab - Description generated:", description);
    form.setValue("description", description);
  };

  if (categoriesLoading || brandsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Chargement des données...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditMode ? "Modifier le produit" : "Créer un nouveau produit"}
          </CardTitle>
          <CardDescription>
            {isEditMode 
              ? "Modifiez les informations de base du produit"
              : "Saisissez les informations de base du nouveau produit"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informations de base</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du produit *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Nom du produit" 
                            {...field}
                          />
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
                          <Input 
                            placeholder="SKU (optionnel)" 
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Peut être ajouté ultérieurement selon l'approvisionnement
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="shortDescription"
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
                      <FormLabel>Description détaillée</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description détaillée du produit"
                          className="min-h-[120px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description Generator */}
                <DescriptionGenerator
                  productName={form.watch("name")}
                  categoryId={form.watch("category")}
                  brandId={form.watch("brand")}
                  categories={categories || []}
                  brands={brands || []}
                  onDescriptionGenerated={handleDescriptionGenerated}
                />
              </div>

              <Separator />

              {/* Pricing and Inventory Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Prix et inventaire</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            step="0.01"
                            {...field}
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Refurbished Product Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Produit reconditionné</h3>
                
                <FormField
                  control={form.control}
                  name="isRefurbished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Produit reconditionné</FormLabel>
                        <FormDescription>
                          Marquer ce produit comme reconditionné
                        </FormDescription>
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
                              <SelectItem value="excellent">Excellent</SelectItem>
                              <SelectItem value="tres_bon">Très bon</SelectItem>
                              <SelectItem value="bon">Bon</SelectItem>
                              <SelectItem value="acceptable">Acceptable</SelectItem>
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
                          <FormLabel>Prix d'achat</FormLabel>
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
                )}
              </div>

              <Separator />

              {/* Status Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Statut</h3>
                
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Produit actif</FormLabel>
                        <FormDescription>
                          Le produit sera visible dans le catalogue
                        </FormDescription>
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

              {/* Submit Button */}
              <div className="flex justify-end pt-6">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isEditMode ? "Mise à jour..." : "Création..."}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {isEditMode ? "Mettre à jour" : "Créer le produit"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductFormInfoTab;
