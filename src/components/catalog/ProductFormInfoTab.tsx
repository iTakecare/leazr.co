
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Package, Save } from "lucide-react";
import { Product } from "@/types/catalog";
import { useCreateProduct } from "@/hooks/products/useCreateProduct";
import { useUpdateProduct } from "@/hooks/products/useUpdateProduct";
import { useBrands } from "@/hooks/products/useBrands";
import { useCategories } from "@/hooks/products/useCategories";
import DescriptionGenerator from "./DescriptionGenerator";
import SpecificationGenerator from "./SpecificationGenerator";

// Form validation schema
const productFormSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  short_description: z.string().optional(),
  category_id: z.string().min(1, "La catégorie est requise"),
  brand_id: z.string().min(1, "La marque est requise"),
  price: z.number().min(0, "Le prix doit être positif"),
  stock: z.number().int().min(0, "Le stock doit être positif"),
  sku: z.string().optional(),
  is_refurbished: z.boolean().default(false),
  condition: z.string().optional(),
  purchase_price: z.number().min(0).optional(),
  active: z.boolean().default(true),
  admin_only: z.boolean().default(false),
  specifications: z.record(z.union([z.string(), z.number()])).optional()
});

type FormData = z.infer<typeof productFormSchema>;

interface ProductFormInfoTabProps {
  productToEdit?: Product;
  isEditMode: boolean;
  brands?: Array<{ id: string; name: string; translation?: string }>;
  categories?: Array<{ id: string; name: string; translation?: string }>;
  onProductCreated?: (product: Product) => void;
  onProductUpdated?: (product: Product) => void;
}

const ProductFormInfoTab: React.FC<ProductFormInfoTabProps> = ({
  productToEdit,
  isEditMode,
  brands: propBrands,
  categories: propCategories,
  onProductCreated,
  onProductUpdated
}) => {
  console.log("🔧 ProductFormInfoTab render", { 
    isEditMode, 
    hasProduct: !!productToEdit,
    productName: productToEdit?.name 
  });

  // Fetch brands and categories
  const { data: fetchedBrands = [] } = useBrands();
  const { data: fetchedCategories = [] } = useCategories();
  
  // Use provided data or fallback to fetched data
  const brands = propBrands || fetchedBrands;
  const categories = propCategories || fetchedCategories;

  // Mutations
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(productFormSchema),
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
      specifications: {}
    }
  });

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset } = form;

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && productToEdit) {
      console.log("🔧 Populating form with product data", productToEdit);
      reset({
        name: productToEdit.name || "",
        description: productToEdit.description || "",
        short_description: productToEdit.short_description || "",
        category_id: productToEdit.category_id || "",
        brand_id: productToEdit.brand_id || "",
        price: productToEdit.price || 0,
        stock: productToEdit.stock || 0,
        sku: productToEdit.sku || "",
        is_refurbished: productToEdit.is_refurbished || false,
        condition: productToEdit.condition || "",
        purchase_price: productToEdit.purchase_price || 0,
        active: productToEdit.active ?? true,
        admin_only: productToEdit.admin_only || false,
        specifications: productToEdit.specifications || {}
      });
    }
  }, [isEditMode, productToEdit, reset]);

  // Form submission handler
  const onSubmit = async (data: FormData) => {
    console.log("🔧 Form submission", { data, isEditMode });

    try {
      if (isEditMode && productToEdit) {
        // Update existing product
        const updatedProduct = await updateProductMutation.mutateAsync({
          id: productToEdit.id,
          ...data
        });
        toast.success("Produit mis à jour avec succès");
        onProductUpdated?.(updatedProduct);
      } else {
        // Create new product
        const newProduct = await createProductMutation.mutateAsync(data as any);
        toast.success("Produit créé avec succès");
        onProductCreated?.(newProduct);
      }
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error(`Erreur lors de la sauvegarde: ${error.message}`);
    }
  };

  // Description handlers for DescriptionGenerator
  const handleDescriptionGenerated = (description: string, shortDescription: string) => {
    console.log("🔧 Descriptions generated", { description: description.substring(0, 50), shortDescription });
    setValue("description", description);
    setValue("short_description", shortDescription);
  };

  const handleDescriptionChange = (description: string) => {
    setValue("description", description);
  };

  const handleShortDescriptionChange = (shortDescription: string) => {
    setValue("short_description", shortDescription);
  };

  // Specifications handler
  const handleSpecificationsGenerated = (specifications: Record<string, string | number>) => {
    console.log("🔧 Specifications generated", specifications);
    setValue("specifications", specifications);
  };

  const isLoading = createProductMutation.isPending || updateProductMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Product Information Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditMode ? "Modifier le produit" : "Informations du produit"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du produit *</Label>
                <Input
                  {...register("name")}
                  id="name"
                  placeholder="Nom du produit"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  {...register("sku")}
                  id="sku"
                  placeholder="SKU unique"
                />
              </div>
            </div>

            {/* Category and Brand */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_id">Catégorie *</Label>
                <Select 
                  value={watch("category_id")} 
                  onValueChange={(value) => setValue("category_id", value)}
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
                {errors.category_id && (
                  <p className="text-sm text-destructive">{errors.category_id.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_id">Marque *</Label>
                <Select 
                  value={watch("brand_id")} 
                  onValueChange={(value) => setValue("brand_id", value)}
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
                {errors.brand_id && (
                  <p className="text-sm text-destructive">{errors.brand_id.message}</p>
                )}
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Prix de vente *</Label>
                <Input
                  {...register("price", { valueAsNumber: true })}
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="text-sm text-destructive">{errors.price.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchase_price">Prix d'achat</Label>
                <Input
                  {...register("purchase_price", { valueAsNumber: true })}
                  id="purchase_price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  {...register("stock", { valueAsNumber: true })}
                  id="stock"
                  type="number"
                  placeholder="0"
                />
                {errors.stock && (
                  <p className="text-sm text-destructive">{errors.stock.message}</p>
                )}
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label htmlFor="condition">État/Condition</Label>
              <Input
                {...register("condition")}
                id="condition"
                placeholder="Ex: Excellent, Bon, Reconditionné A"
              />
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_refurbished"
                  checked={watch("is_refurbished")}
                  onCheckedChange={(checked) => setValue("is_refurbished", !!checked)}
                />
                <Label htmlFor="is_refurbished">Reconditionné</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={watch("active")}
                  onCheckedChange={(checked) => setValue("active", !!checked)}
                />
                <Label htmlFor="active">Actif</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="admin_only"
                  checked={watch("admin_only")}
                  onCheckedChange={(checked) => setValue("admin_only", !!checked)}
                />
                <Label htmlFor="admin_only">Admin uniquement</Label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sauvegarde...
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
        </CardContent>
      </Card>

      {/* Description Generator */}
      <DescriptionGenerator
        productName={watch("name") || ""}
        categoryId={watch("category_id") || ""}
        brandId={watch("brand_id") || ""}
        categories={categories}
        brands={brands}
        onDescriptionGenerated={handleDescriptionGenerated}
        currentDescription={watch("description") || ""}
        currentShortDescription={watch("short_description") || ""}
        onDescriptionChange={handleDescriptionChange}
        onShortDescriptionChange={handleShortDescriptionChange}
      />

      {/* Specification Generator - Only for editing */}
      {isEditMode && productToEdit && (
        <SpecificationGenerator
          product={productToEdit}
          onSpecificationsGenerated={handleSpecificationsGenerated}
        />
      )}
    </div>
  );
};

export default ProductFormInfoTab;
